import { db } from '../src/lib/db';
import { projects } from '../src/lib/db/schema';

async function main() {
  const result = await db.select().from(projects).limit(5);
  console.log(JSON.stringify(result.map(p => ({
    id: p.id,
    title: p.title,
    status: p.status,
    audioUrl: p.originalAudioUrl?.substring(0, 100),
    duration: p.originalDuration
  })), null, 2));
  process.exit(0);
}

main();
