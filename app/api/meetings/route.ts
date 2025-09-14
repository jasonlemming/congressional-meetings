import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Meeting } from '@/types';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'meetings.json');
    const fileContents = readFileSync(filePath, 'utf8');
    const meetings: Meeting[] = JSON.parse(fileContents);
    
    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error reading meetings.json:', error);
    return NextResponse.json([], { status: 200 });
  }
}
