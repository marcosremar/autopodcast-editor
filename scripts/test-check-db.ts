import { db } from '../src/lib/db';
import { users, projects } from '../src/lib/db/schema';

async function main() {
  const user = await db.select().from(users).limit(1);
  const proj = await db.select().from(projects).limit(3);
  console.log('User:', JSON.stringify(user[0]?.id, null, 2));
  console.log('Projects:', JSON.stringify(proj.map(p => ({id: p.id, title: p.title, status: p.status})), null, 2));
  process.exit(0);
}
main();
