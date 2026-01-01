/**
 * Test script for Forced Aligner integration
 * Creates a new project and triggers processing to verify the aligner is being called
 */

import { db } from '../src/lib/db';
import { projects, segments } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const USER_ID = '9bf91613-8cb9-4b14-aa71-bd1a8b40a336';
const TEST_AUDIO = '/uploads/1767122775876-audio-short.mp3'; // Use the short audio for faster test

async function main() {
  console.log('🚀 Testing Forced Aligner integration...\n');

  // 1. Create a new project
  const projectId = crypto.randomUUID();
  console.log(`1. Creating project with ID: ${projectId}`);

  await db.insert(projects).values({
    id: projectId,
    userId: USER_ID,
    title: 'Test Forced Aligner Integration',
    originalAudioUrl: TEST_AUDIO,
    status: 'pending',
    originalDuration: 33, // ~33 seconds for short audio
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`   ✓ Project created\n`);

  // 2. Trigger processing via API
  console.log('2. Triggering processing via API...');
  console.log('   POST http://localhost:3000/api/process/' + projectId);

  const response = await fetch(`http://localhost:3000/api/process/${projectId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`   ✗ API error: ${response.status} - ${error}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log(`   ✓ Processing started: ${JSON.stringify(result)}\n`);

  // 3. Poll for completion
  console.log('3. Polling for completion...');
  let status = 'pending';
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max

  while (status !== 'ready' && status !== 'error' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    attempts++;

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    status = project?.status || 'unknown';

    console.log(`   [${attempts}] Status: ${status}`);
  }

  if (status === 'error') {
    console.error('\n❌ Processing failed!\n');
    process.exit(1);
  }

  if (status !== 'ready') {
    console.error('\n⏱️ Processing timed out!\n');
    process.exit(1);
  }

  console.log('\n✅ Processing completed!\n');

  // 4. Check segments for word timestamps
  console.log('4. Checking segments for word timestamps...');
  const projectSegments = await db.select().from(segments).where(eq(segments.projectId, projectId));

  console.log(`   Found ${projectSegments.length} segments\n`);

  let withTimestamps = 0;
  for (const segment of projectSegments) {
    const timestamps = segment.wordTimestamps as any[];
    if (timestamps && timestamps.length > 0) {
      withTimestamps++;
      console.log(`   Segment ${segment.id.slice(0, 8)}...:`);
      console.log(`     - Text: "${segment.text?.slice(0, 50)}..."`);
      console.log(`     - Words with timestamps: ${timestamps.length}`);
      console.log(`     - Sample: ${JSON.stringify(timestamps.slice(0, 3))}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Total segments: ${projectSegments.length}`);
  console.log(`   - Segments with word timestamps: ${withTimestamps}`);
  console.log(`   - Success rate: ${Math.round(withTimestamps / projectSegments.length * 100)}%\n`);

  if (withTimestamps > 0) {
    console.log('✅ Forced Aligner integration is WORKING!\n');
  } else {
    console.log('⚠️ No word timestamps found. Check server logs for Forced Aligner messages.\n');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
