// scripts/senate-hotfix.ts
// Rebuilds ONLY the Senate meetings from the official XML using <matter>,
// then merges them back into public/meetings.json

import { readFileSync, writeFileSync } from "fs";
import { XMLParser } from "fast-xml-parser";

const SENATE_FEED = "https://www.senate.gov/general/committee_schedules/hearings.xml";
const SENATE_DEFAULT_URL = "https://www.senate.gov/committees/hearings_meetings.htm";

function norm(s?: string | null) {
  return (s ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}
function first<T extends string | undefined>(...vals: T[]) {
  return (vals.find(v => v && norm(v) !== "") ?? "") as string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  trimValues: true,
});

function extractText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(extractText).join(" ");
  if (typeof v === "object") {
    if ("#text" in v && typeof v["#text"] !== "object") return String(v["#text"]);
    return Object.values(v).map(extractText).join(" ");
  }
  return "";
}
function deepFind(obj: any, keys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return;
  const want = new Set(keys.map(k => k.toLowerCase()));
  for (const [k, v] of Object.entries<any>(obj)) {
    if (want.has(k.toLowerCase())) {
      const txt = norm(extractText(v));
      if (txt) return txt;
    }
  }
  for (const v of Object.values<any>(obj)) {
    if (Array.isArray(v)) {
      for (const it of v) {
        const got = deepFind(it, keys);
        if (got) return got;
      }
    } else if (typeof v === "object") {
      const got = deepFind(v, keys);
      if (got) return got;
    }
  }
}

function parseSenateDate(raw?: string, iso?: string) {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const dt = new Date(iso + "T00:00:00Z");
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  }
  if (raw && /^\d{2}-[A-Z]{3}-\d{4}(?:\s+\d{2}:\d{2}\s+[AP]M)?$/.test(raw)) {
    const [dd, mmm, rest] = raw.split("-");
    const yyyy = rest.slice(0, 4);
    const map: any = { JAN:"01", FEB:"02", MAR:"03", APR:"04", MAY:"05", JUN:"06", JUL:"07", AUG:"08", SEP:"09", OCT:"10", NOV:"11", DEC:"12" };
    const isoDate = `${yyyy}-${map[mmm] || "01"}-${dd}`;
    const dt = new Date(isoDate + "T00:00:00Z");
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  }
  return "";
}

const SENATE_CODE_MAP: Record<string, string> = {
  AGING: "Special Committee on Aging",
  AGRI: "Committee on Agriculture, Nutrition, and Forestry",
  APPR: "Committee on Appropriations",
  ARMED: "Committee on Armed Services",
  BANK: "Committee on Banking, Housing, and Urban Affairs",
  BUDG: "Committee on the Budget",
  COMMERCE: "Committee on Commerce, Science, and Transportation",
  ENERGY: "Committee on Energy and Natural Resources",
  EPW: "Committee on Environment and Public Works",
  FIN: "Committee on Finance",
  FOREIGN: "Committee on Foreign Relations",
  HELP: "Committee on Health, Education, Labor, and Pensions",
  HSGAC: "Committee on Homeland Security and Governmental Affairs",
  INTEL: "Select Committee on Intelligence",
  INDIAN: "Committee on Indian Affairs",
  JUD: "Committee on the Judiciary",
  RULES: "Committee on Rules and Administration",
  SMALL: "Committee on Small Business and Entrepreneurship",
  VETS: "Committee on Veterans' Affairs",
};
function normalizeCode(s?: string) { return (s || "").toUpperCase().replace(/[^A-Z]/g, ""); }
function nameFromCode(code?: string) {
  const key = normalizeCode(code);
  if (!key) return;
  if (SENATE_CODE_MAP[key]) return SENATE_CODE_MAP[key];
  for (const k of Object.keys(SENATE_CODE_MAP)) if (key.includes(k)) return SENATE_CODE_MAP[k];
}

async function fetchSenateXml(): Promise<any[]> {
  const xml = await fetch(SENATE_FEED, { headers: { "User-Agent": "congressional-meetings/hotfix" } }).then(r => r.text());
  const data = parser.parse(xml);

  const arr: any[] = [];
  const push = (x: any) => { if (!x) return; Array.isArray(x) ? arr.push(...x) : arr.push(x); };
  push(data?.css_meetings_scheduled?.meeting);
  push(data?.calendar?.meeting);
  push(data?.calendar?.meetings?.meeting);
  push(data?.Calendar?.meeting);
  push(data?.Calendar?.Meeting);
  push(data?.rss?.channel?.item);

  return arr;
}

function mapSenate(meetings: any[]) {
  return meetings.map((m, idx) => {
    const cmte_code = deepFind(m, ["cmte_code"]);
    let committee_name = deepFind(m, ["committee","Committee"]) || nameFromCode(cmte_code) || "";
    const subcommittee = first(deepFind(m, ["sub_cmte","subcommittee","Subcommittee","subcmte","subcmte_name"]));

    const matter = first(deepFind(m, ["matter","Matter"])); // ← REAL title
    const dateIso = deepFind(m, ["date_iso_8601"]);
    const dateRaw = deepFind(m, ["date","hearingDate"]);
    const date = parseSenateDate(dateRaw, dateIso);
    const time = first(deepFind(m, ["time","time_et","Time"]));
    const location = first(deepFind(m, ["room","Room","location","Location","building"]));
    const mtgType = first(deepFind(m, ["meetingType","type","Type"])) || "Hearing";
    const link = first(deepFind(m, ["url","meetingURL","link"]), SENATE_DEFAULT_URL);
    const id = first(deepFind(m, ["identifier","meetingID","MeetingID","id","guid"]), `${dateIso || dateRaw}-m${idx+1}`);

    const fallbackTitle = subcommittee
      ? `${subcommittee}${committee_name && !subcommittee.includes(committee_name) ? ` (${committee_name})` : ""} ${mtgType}`
      : `${committee_name || 'Senate'} ${mtgType}`;

    return {
      congress: 118,
      chamber: "senate" as const,
      meeting_id: String(id),
      meeting_type: mtgType,
      title_or_subject: norm(matter) || norm(fallbackTitle),
      date: norm(date),
      start_time: norm(time),
      location: norm(location),
      status: "",
      committee_name: norm(committee_name),
      detail_page_url: norm(link),
      video_url: "",
      transcript_url: undefined,
      witnesses: undefined,
      testimony_urls: undefined,
      related_legislation: undefined,
      notes: undefined,
    };
  });
}

(async () => {
  // 1) fetch + map senate
  const senateNodes = await fetchSenateXml();
  const senateMapped = mapSenate(senateNodes);

  // 2) read existing JSON and merge
  const path = "./public/meetings.json";
  const json = JSON.parse(readFileSync(path, "utf8"));

  const houseOnly = (json.meetings || []).filter((x: any) => x.chamber !== "senate");
  const merged = [...houseOnly, ...senateMapped];
  const out = { updated_at: new Date().toISOString(), count: merged.length, meetings: merged };

  writeFileSync(path, JSON.stringify(out, null, 2), "utf8");
  console.log(`✅ Rebuilt Senate: ${senateMapped.length} • Total now ${merged.length}`);
  console.log("Sample:", senateMapped.slice(0, 3).map(x => x.title_or_subject));
})();

