import * as cheerio from "cheerio";

function fmtWeekOf(d: Date) {
  const mmddyyyy = (x: Date) => String(x.getMonth()+1).padStart(2,"0")+String(x.getDate()).padStart(2,"0")+x.getFullYear();
  const day = d.getDay(); // 0=Sun
  const sun = new Date(d); sun.setDate(d.getDate() - day);
  const sat = new Date(sun); sat.setDate(sun.getDate()+6);
  return `${mmddyyyy(sun)}_${mmddyyyy(sat)}`;
}
async function get(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "congressional-meetings/debug" } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.text();
}
async function main() {
  const today = new Date();
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate()+7);
  const urls = [
    `https://docs.house.gov/Committee/Calendar/ByWeek.aspx?WeekOf=${fmtWeekOf(today)}`,
    `https://docs.house.gov/Committee/Calendar/ByWeek.aspx?WeekOf=${fmtWeekOf(nextWeek)}`
  ];
  for (const u of urls) {
    try {
      const html = await get(u);
      const $ = cheerio.load(html);
      const ids = new Set<string>();
      $('a[href*="ByEvent.aspx?EventID="]').each((_, el) => {
        const m = ($(el).attr("href")||"").match(/EventID=(\d{5,})/);
        if (m) ids.add(m[1]);
      });
      // backstop: raw regex
      for (const m of html.matchAll(/EventID=(\d{5,})/g)) ids.add(m[1]);
      console.log(u, "-> IDs:", ids.size, [...ids].slice(0,10));
    } catch (e:any) {
      console.error("ERR", u, e.message);
    }
  }
}
main();
