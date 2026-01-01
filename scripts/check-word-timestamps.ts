import { db } from "../src/lib/db";
import { segments, projects } from "../src/lib/db/schema";
import { sql, isNotNull, eq } from "drizzle-orm";

async function checkWordTimestamps() {
  const result = await db.select({
    projectId: segments.projectId,
    segmentId: segments.id,
    text: segments.text,
  }).from(segments).where(isNotNull(segments.wordTimestamps)).limit(10);

  console.log("Segments with wordTimestamps:");
  for (const r of result) {
    console.log("  Project:", r.projectId);
    console.log("  Segment:", r.segmentId);
    console.log("  Text:", r.text.slice(0, 60) + "...");
    console.log("---");
  }

  if (result.length > 0) {
    const projectId = result[0].projectId;
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (project.length > 0) {
      console.log("\nProject title:", project[0].title);
      console.log("Project ID to test:", projectId);
    }
  }

  process.exit(0);
}

checkWordTimestamps().catch(console.error);
