import { db } from "../src/lib/db";
import { segments } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function addWordTimestamps() {
  // Get segments from the project we're testing
  const projectId = "12011005-efd8-4913-9813-d12b66b1447b";
  const allSegments = await db.select().from(segments).where(eq(segments.projectId, projectId));
  
  if (allSegments.length === 0) {
    console.log("No segments found for project", projectId);
    // Try to get all segments
    const all = await db.select().from(segments).limit(10);
    console.log("Available segments:", all.map(s => ({ id: s.id, projectId: s.projectId, text: s.text.substring(0, 50) })));
    return;
  }

  for (const segment of allSegments) {
    // Split text into words and create fake timestamps
    const words = segment.text.split(/\s+/);
    const duration = segment.endTime - segment.startTime;
    const wordDuration = duration / words.length;
    
    const wordTimestamps = words.map((word, index) => ({
      word,
      start: segment.startTime + (index * wordDuration),
      end: segment.startTime + ((index + 1) * wordDuration),
      confidence: 0.95,
      isDeleted: false,
    }));

    // Update the segment
    await db.update(segments)
      .set({ wordTimestamps })
      .where(eq(segments.id, segment.id));

    console.log(`Updated segment ${segment.id} with ${words.length} word timestamps`);
  }

  console.log("Done!");
  process.exit(0);
}

addWordTimestamps().catch(console.error);
