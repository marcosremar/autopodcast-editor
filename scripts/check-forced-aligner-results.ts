/**
 * Check Forced Aligner results for the last test project
 */

import { db } from '../src/lib/db';
import { projects, segments } from '../src/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
  console.log('🔍 Checking Forced Aligner results...\n');

  // Find the most recent test project
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.title, 'Test Forced Aligner Integration'))
    .orderBy(desc(projects.createdAt))
    .limit(1);

  if (!project) {
    console.log('No test project found.\n');
    process.exit(1);
  }

  console.log(`📂 Project: ${project.title}`);
  console.log(`   ID: ${project.id}`);
  console.log(`   Status: ${project.status}`);
  console.log(`   Audio: ${project.originalAudioUrl}\n`);

  // Get segments
  const projectSegments = await db
    .select()
    .from(segments)
    .where(eq(segments.projectId, project.id));

  console.log(`📊 Found ${projectSegments.length} segments\n`);

  let withTimestamps = 0;
  for (const segment of projectSegments) {
    const timestamps = segment.wordTimestamps as any[];
    console.log(`📝 Segment: ${segment.id.slice(0, 8)}...`);
    console.log(`   Text: "${segment.text?.slice(0, 60)}..."`);
    console.log(`   Time: ${segment.startTime?.toFixed(1)}s - ${segment.endTime?.toFixed(1)}s`);

    if (timestamps && timestamps.length > 0) {
      withTimestamps++;
      console.log(`   ✅ Word timestamps: ${timestamps.length} words`);
      console.log(`   Sample timestamps:`, JSON.stringify(timestamps.slice(0, 3), null, 2));
    } else {
      console.log(`   ❌ No word timestamps`);
    }
    console.log();
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Total segments: ${projectSegments.length}`);
  console.log(`   - Segments with word timestamps: ${withTimestamps}`);
  if (projectSegments.length > 0) {
    console.log(`   - Success rate: ${Math.round(withTimestamps / projectSegments.length * 100)}%`);
  }

  if (withTimestamps > 0) {
    console.log('\n✅ Forced Aligner integration is WORKING!');
  } else {
    console.log('\n⚠️ No word timestamps found. Check server logs for Forced Aligner messages.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
