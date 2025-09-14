#!/usr/bin/env tsx

import 'dotenv/config';
import { request } from 'undici';
import { XMLParser } from 'fast-xml-parser';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { writeFileSync } from 'fs';
import { join } from 'path';
import type { Meeting } from '../types';

dayjs.extend(utc);
dayjs.extend(timezone);

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

async function httpGet(url: string): Promise<string> {
  const { statusCode, body } = await request(url, {
    headers: { 'User-Agent': 'Congressional-Meetings-Fetcher/1.0' },
  });
  if (statusCode >= 400) throw new Error(`HTTP ${statusCode}`);
  return await body.text();
}

async function fetchSenate(): Promise<Meeting[]> {
  console.log('Fetching Senate meetings...');
  try {
    const xml = await httpGet('https://www.senate.gov/general/committee_schedules/hearings.xml');
    const parsed = XML_PARSER.parse(xml);
    const meetings = parsed?.css_meetings_scheduled?.meeting || [];
    const meetingArray = Array.isArray(meetings) ? meetings : [meetings];
    
    return meetingArray
      .filter((h: any) => h && h.matter && h.matter !== 'No committee hearings scheduled' && h.committee)
      .map((hearing: any, index: number): Meeting => {
        // Create a detail page URL since the XML doesn't provide one
        const detailUrl = `https://www.senate.gov/committees/hearings_meetings.htm`;
        
        return {
          meeting_id: `senate-${hearing.cmte_code || 'unknown'}-${hearing.identifier || index}`,
          chamber: 'senate',
          committee_name: hearing.committee || 'Unknown Committee',
          title_or_subject: hearing.matter || undefined,
          meeting_type: 'hearing',
          date: hearing.date_iso_8601 ? dayjs(hearing.date_iso_8601).format('YYYY-MM-DD') : undefined,
          start_time: hearing.time && hearing.time !== '00:00:00' ? hearing.time.substring(0, 5) : undefined,
          location: hearing.room || undefined,
          status: 'scheduled',
          detail_page_url: detailUrl,
          source: 'senate.gov',
          last_seen_at: new Date().toISOString(),
        };
      });
  } catch (error) {
    console.error('Senate fetch failed:', error);
    return [];
  }
}

async function main() {
  console.log('Starting fetch...');
  
  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  console.log(apiKey ? '✓ API key found' : '⚠ No API key');
  
  const meetings = await fetchSenate();
  console.log(`✓ Found ${meetings.length} Senate meetings`);
  
  const outputPath = join(process.cwd(), 'public', 'meetings.json');
  writeFileSync(outputPath, JSON.stringify(meetings, null, 2));
  console.log(`📊 Total: ${meetings.length} meetings saved`);
}

main().catch(console.error);
