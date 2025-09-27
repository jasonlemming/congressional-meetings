/* scripts/fetch-meetings.ts */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  trimValues: true,
});

const norm = (s?: string | null) => (s ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const first = (...vals: (string | undefined)[]) => vals.find(v => norm(v) !== "") || "";

/* ---------- generic helpers ---------- */
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
    if (Array.isArray(v)) for (const it of v) { const got = deepFind(it, keys); if (got) return got; }
    else if (typeof v === "object") { const got = deepFind(v, keys); if (got) return got; }
  }
}

async function httpGet(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "congressional-meetings/1.9" } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return res.text();
}

function summarizeTitle(official?: string, committee?: string, meetingType?: string) {
  const src = norm(official || "").replace(/\.$/, "");
  if (!src) return norm(`${committee || "Hearing"} ${meetingType || ""}`.trim());
  if (/^Business meeting to consider the nomination/i.test(src)) return "Business meeting: nominations";
  if (/^Business meeting to consider/i.test(src)) {
    const rest = src.replace(/^Business meeting to consider\s+/i, "");
    return `Business meeting: ${rest.split(/[.;]/)[0]}`;
  }
  if (/^An? oversight hearing to examine/i.test(src)) {
    const rest = src.replace(/^An? oversight hearing to examine\s+/i, "");
    return `Oversight hearing on ${rest}`;
  }
  if (/^Hearings?\s+to examine/i.test(src)) {
    const rest = src.replace(/^Hearings?\s+to examine\s+/i, "");
    return `Examining ${rest}`;
  }
  if (/^To receive a closed briefing on/i.test(src)) {
    const rest = src.replace(/^To receive a closed briefing on\s+/i, "");
    return `Closed briefing on ${rest}`;
  }
  const commaCount = (src.match(/,/g) || []).length;
  if (commaCount >= 8 && /nomination/i.test(src)) return "Nominations hearing";
  return src.length > 140 ? src.slice(0, 120).trim() + "…" : src;
}

/* ---------- HOUSE ---------- */
const HOUSE_WEEK_BASE = "https://docs.house.gov/Committee/Calendar/ByWeek.aspx?WeekOf=";
const HOUSE_EVENT_BASE = "https://docs.house.gov/Committee/Calendar/ByEvent.aspx?EventID=";

function fmtWeekOf(d: Date) {
  const toMMDDYYYY = (x: Date) =>
    String(x.getMonth() + 1).padStart(2, "0") + String(x.getDate()).padStart(2, "0") + x.getFullYear();
  const day = d.getDay(); // 0=Sun
  const sun = new Date(d); sun.setDate(d.getDate() - day);
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
  return `${toMMDDYYYY(sun)}_${toMMDDYYYY(sat)}`;
}
async function getHouseEventIdsForWeek(weekStart: Date): Promise<string[]> {
  const html = await httpGet(HOUSE_WEEK_BASE + fmtWeekOf(weekStart));
  const $ = cheerio.load(html);
  const ids = new Set<string>();
  $('a[href*="ByEvent.aspx?EventID="]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/EventID=(\d{5,})/);
    if (m) ids.add(m[1]);
  });
  {
    const re = /EventID=(\d{5,})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      ids.add(m[1]);
    }
  }
  return [...ids];
}
async function getHouseXmlUrlFromEvent(eventId: string): Promise<string | undefined> {
  const html = await httpGet(HOUSE_EVENT_BASE + eventId);
  const $ = cheerio.load(html);
  const a = $('a[href$=".xml"]').first();
  const href = a.attr("href") || "";
  if (!href) return;
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return "https://docs.house.gov" + href;
}

/** Parse from the House XML (preferred) */
function mapHouseFromXmlObj(obj: any, fb: { eventId: string; detailUrl: string }) {
  const meeting_id = first(
    deepFind(obj, ["EventID","eventID","EventId","Id"]),
    fb.eventId
  );
  const official_title = first(
    deepFind(obj, ["HearingTitle","OfficialTitle","MeetingTitle","Title","Subject","HearingTitleText","HearingSubject"]),
  );
  const date = first(
    deepFind(obj, ["HearingDate","MeetingDate","Date","MeetingDateText","StartDate"])
  );
  const time = first(
    deepFind(obj, ["Time","StartTime","MeetingTime","HearingTime"])
  );
  const location = first(
    deepFind(obj, ["Location","Room","Place","MeetingRoom"])
  );
  const committee = first(
    deepFind(obj, ["CommitteeFullName","CommitteeFullNameText","CommitteeName","CommitteeTitle","Committee","committee","committeeName"])
  );
  const meeting_type = first(
    deepFind(obj, ["MeetingType","Type"])
  ) || "Hearing";

  return {
    congress: 118,
    chamber: "house" as const,
    meeting_id,
    meeting_type,
    official_title: norm(official_title),
    colloquial_title: summarizeTitle(official_title || "", norm(committee || ""), meeting_type),
    title_or_subject: norm(official_title), // backward compat
    date: norm(date),
    start_time: norm(time),
    location: norm(location),
    status: norm(deepFind(obj, ["Status"])),
    committee_name: norm(committee),
    detail_page_url: fb.detailUrl,
    video_url: undefined,
    transcript_url: undefined,
    witnesses: undefined,
    testimony_urls: undefined,
    related_legislation: undefined,
    notes: undefined,
  };
}

/** Parse from HTML (fallback) with stricter committee detection */
function mapHouseFromHtml(html: string, fb: { eventId: string; detailUrl: string }) {
  const $ = cheerio.load(html);

  const root = $('#ContentPlaceHolder1_pnlMeeting, #ContentPlaceHolder1_UpdatePanel1, #ContentPlaceHolder1_MeetingDetails').first().length
    ? $('#ContentPlaceHolder1_pnlMeeting, #ContentPlaceHolder1_UpdatePanel1, #ContentPlaceHolder1_MeetingDetails').first()
    : $('body');

  const official_title =
    norm(
      $('meta[property="og:title"]').attr("content") ||
      root.find('[id$="lblTitle"]').text() ||
      root.find("h1").first().text() ||
      $("title").text()
    );

  // Only accept true committee-like phrases; exclude download/package/visit blocks
  const bad = /(Download|Package|Visit)/i;
  const committee =
    root.find('a, div, p, span, small, i, em')
      .map((_, el) => norm($(el).text()))
      .get()
      .find(t => /^(Committee|Subcommittee)\s+on\s+/i.test(t) && !bad.test(t)) || "";

  const topText = norm(root.text().split("Witnesses")[0] || root.text());
  const dt = topText.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}(?:\s*\(([^)]+)\))?/i);
  let date = "", time = "";
  if (dt) { date = norm(dt[0].replace(/\(([^)]+)\).*/, "").replace(/^[A-Za-z]+,\s*/, "")); time = norm(dt[3] || ""); }

  let location =
    norm(root.find('[id$="lblLocation"]').text()) ||
    norm(root.find('th:contains("Location"),th:contains("Room"),th:contains("Place")').next("td").text());
  if (!location) {
    const locGuess =
      (topText.match(/\b\d{2,4}\s+(CHOB|LHOB|RHOB)\b/i)?.[0] || "") + " " +
      (topText.match(/\bWashington,\s*D\.?C\.?\b/i)?.[0] || "");
    location = norm(locGuess);
  }

  const meeting_type = "Hearing";

  return {
    congress: 118,
    chamber: "house" as const,
    meeting_id: String(fb.eventId),
    meeting_type,
    official_title,
    colloquial_title: summarizeTitle(official_title, committee, meeting_type),
    title_or_subject: official_title, // backward compat
    date,
    start_time: time,
    location,
    status: undefined,
    committee_name: (committee || extractCommitteeFromTitle(official_title || "")),
    detail_page_url: fb.detailUrl,
    video_url: undefined,
    transcript_url: undefined,
    witnesses: undefined,
    testimony_urls: undefined,
    related_legislation: undefined,
    notes: undefined,
  };
}

async function fetchHouse(): Promise<any[]> {
  const today = new Date();
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
  const prevWeek = new Date(today); prevWeek.setDate(today.getDate() - 7);
  const week2 = new Date(nextWeek); week2.setDate(nextWeek.getDate() + 7);
  const weeks = [prevWeek, today, nextWeek, week2];

  const ids = new Set<string>();
  for (const w of weeks) {
    try {
      const got = await getHouseEventIdsForWeek(w);
      got.forEach(id => ids.add(id));
    } catch {}
  }
  const eventIds = [...ids];
  console.log(`House EventIDs collected: ${eventIds.length}`);
  if (!eventIds.length) return [];

  const meetings: any[] = [];
  for (const id of eventIds) {
    const detailUrl = HOUSE_EVENT_BASE + id;
    try {
      let mapped: any | null = null;
      try {
        const xmlUrl = await getHouseXmlUrlFromEvent(id);
        if (xmlUrl) {
          const xml = await httpGet(xmlUrl);
          const obj = parser.parse(xml);
          mapped = mapHouseFromXmlObj(obj, { eventId: id, detailUrl });
        }
      } catch {}
      if (!mapped || !(mapped.official_title && mapped.committee_name)) {
        const html = await httpGet(detailUrl);
        const htmlMapped = mapHouseFromHtml(html, { eventId: id, detailUrl });
        mapped = { ...(mapped ?? {}), ...htmlMapped, meeting_id: String(id), detail_page_url: detailUrl };
      }
      meetings.push(mapped);
    } catch {
      meetings.push({ congress: 118, chamber: "house", meeting_id: String(id), meeting_type: "Hearing",
        official_title: "", colloquial_title: "", title_or_subject: "", date: "", committee_name: "", detail_page_url: detailUrl });
    }
  }
  return meetings;
}

/* ---------- SENATE ---------- */
const SENATE_FEED = "https://www.senate.gov/general/committee_schedules/hearings.xml";
const SENATE_DEFAULT_URL = "https://www.senate.gov/committees/hearings_meetings.htm";

function parseSenateDate(d?: string, iso?: string) {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const dt = new Date(iso + "T00:00:00Z");
    return dt.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric", timeZone:"UTC" });
  }
  if (d && /^\d{2}-[A-Z]{3}-\d{4}(?:\s+\d{2}:\d{2}\s+[AP]M)?$/.test(d)) {
    const [dd, mmm, rest] = d.split("-"); const yyyy = rest.slice(0,4);
    const map: any = {JAN:"01",FEB:"02",MAR:"03",APR:"04",MAY:"05",JUN:"06",JUL:"07",AUG:"08",SEP:"09",OCT:"10",NOV:"11",DEC:"12"};
    const isoDate = `${yyyy}-${map[mmm]||"01"}-${dd}`;
    const dt = new Date(isoDate + "T00:00:00Z");
    return dt.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric", timeZone:"UTC" });
  }
  return "";
}

function summarizeTitleForSenate(official?: string, committee?: string, meetingType?: string) {
  return summarizeTitle(official, committee, meetingType);
}

async function fetchSenate(): Promise<any[]> {
  const xml = await httpGet(SENATE_FEED);
  const data = parser.parse(xml);

  const candidates: any[] = [];
  const push = (x: any) => { if (!x) return; Array.isArray(x) ? candidates.push(...x) : candidates.push(x); };
  push(data?.css_meetings_scheduled?.meeting);
  push(data?.calendar?.meeting);
  push(data?.calendar?.meetings?.meeting);
  push(data?.Calendar?.meeting);
  push(data?.Calendar?.Meeting);
  push(data?.rss?.channel?.item);

  const out = candidates.map((m, idx) => {
    const cmte_code = deepFind(m, ["cmte_code"]);
    let committee_name = first(
      deepFind(m, ["committee","committeeName","Committee","CommitteeName"])
    );
    const official_title = first(
      deepFind(m, ["matter","Matter"]),
      deepFind(m, ["topic","Topic"]),
      deepFind(m, ["subject","Subject","title","Title"]),
      deepFind(m, ["summary","Summary","description","Description"])
    );
    const date_iso = deepFind(m, ["date_iso_8601"]);
    const date_raw = deepFind(m, ["date","hearingDate"]);
    const date = parseSenateDate(date_raw, date_iso);
    const time = first(deepFind(m, ["time","time_et","start_time","hearing_time","Time"])) || "";
    const location = first(deepFind(m, ["room","Room","location","Location","building"])) || "";
    const mtgType = first(deepFind(m, ["meetingType","type","Type"])) || "Hearing";
    const link = first(deepFind(m, ["url","meetingURL","link"])) || SENATE_DEFAULT_URL;
    const title_or_subject = norm(official_title) || norm(`${committee_name} ${mtgType}`.trim());
    const colloquial_title = summarizeTitleForSenate(title_or_subject, (committee_name || extractCommitteeFromTitle(official_title || "")), mtgType);
    const meeting_id = first(
      deepFind(m, ["identifier","meetingID","MeetingID","id","guid"]),
      (date_iso || date_raw || "") + "-" + (committee_name || `m${idx+1}`)
    );

    return {
      congress: 118, chamber: "senate" as const, meeting_id: String(meeting_id),
      meeting_type: mtgType,
      official_title: title_or_subject,
      colloquial_title,
      title_or_subject,
      date: norm(date), start_time: norm(time), location: norm(location),
      status: "", committee_name: norm(committee_name),
      detail_page_url: norm(link), video_url: "",
    };
  })
  .filter(m => !/^No committee hearings scheduled$/i.test(m.official_title));

  return out;
}

/* ---------- main ---------- */
function saveMeetings(all: any[]) {
  const outPath = join(__dirname, "..", "public", "meetings.json");
  const dir = dirname(outPath); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const payload = { updated_at: new Date().toISOString(), count: all.length, meetings: all };
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
}
async function main() {
  console.log("Starting fetch...");
  let house: any[] = [], senate: any[] = [];
  try { console.log("Fetching House meetings..."); house = await fetchHouse(); console.log(`✓ Found ${house.length} House meetings`); } catch (e) { console.error("⚠ House fetch failed:", (e as any)?.message); }
  try { console.log("Fetching Senate meetings..."); senate = await fetchSenate(); console.log(`✓ Found ${senate.length} Senate meetings`); } catch (e) { console.error("⚠ Senate fetch failed:", (e as any)?.message); }
  const all = [...house, ...senate];
  saveMeetings(all);
  console.log(`📊 Total: ${all.length} meetings saved`);
  console.log("📝 Wrote:", join(__dirname, "..", "public", "meetings.json"));
}
main().catch(err => { console.error("❌ Top-level error", err); process.exit(1); });

function extractCommitteeFromTitle(t: string): string | undefined {
  if (!t) return undefined;
  // "(Committee on XYZ)" pattern
  const m1 = t.match(/(s*Committee on ([^)]+))/i);
  if (m1) return "Committee on " + m1[1].trim();
  // tail pattern: ", Committee on XYZ" or " - Committee on XYZ"
  const m2 = t.match(/(?:^|[,–-])s*Committee on ([^,]+)s*$/i);
  if (m2) return "Committee on " + m2[1].trim();
  return undefined;
}
