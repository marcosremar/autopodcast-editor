/**
 * Script para criar um projeto de teste no banco de dados
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { projects, users } from "../src/lib/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL nao configurada");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function main() {
  console.log("Criando projeto de teste...\n");

  // Primeiro, verificar se existe um usuario demo
  const existingUsers = await db.select().from(users).limit(1);

  let userId: string;
  if (existingUsers.length === 0) {
    // Criar usuario demo
    const newUser = await db.insert(users).values({
      email: "demo@autopodcast.com",
      name: "Usuario Demo",
      plan: "pro",
    }).returning();
    userId = newUser[0].id;
    console.log("Usuario demo criado:", userId);
  } else {
    userId = existingUsers[0].id;
    console.log("Usando usuario existente:", userId);
  }

  // Criar projeto de teste
  const newProject = await db.insert(projects).values({
    userId,
    title: "Podcast IA 2025 - Teste",
    status: "uploaded",
    originalAudioUrl: "/uploads/podcast-full.mp3",
    targetDuration: 600, // 10 minutos
  }).returning();

  console.log("\nProjeto criado com sucesso!");
  console.log("ID:", newProject[0].id);
  console.log("Titulo:", newProject[0].title);
  console.log("Audio:", newProject[0].originalAudioUrl);
  console.log("\nAcesse o editor em:");
  console.log(`http://localhost:8010/editor/${newProject[0].id}`);
  console.log("\nOu processe via API:");
  console.log(`curl -X POST http://localhost:8010/api/process/${newProject[0].id}`);

  await client.end();
}

main().catch(console.error);
