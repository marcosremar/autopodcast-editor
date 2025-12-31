/**
 * Script para criar projeto de teste para usuário demo
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, projects, segments } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não configurada");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function main() {
  console.log("🌱 Criando projeto de teste para demo user...\n");

  try {
    // Get demo user
    const [demoUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "demo@aeropod.com"))
      .limit(1);

    if (!demoUser) {
      console.error("❌ Demo user não encontrado! Execute seed-demo-user.ts primeiro.");
      process.exit(1);
    }

    console.log(`✓ Demo user encontrado: ${demoUser.email}\n`);

    // Check if project already exists
    const [existingProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, demoUser.id))
      .limit(1);

    if (existingProject) {
      console.log("✓ Projeto de teste já existe!");
      console.log(`  ID: ${existingProject.id}`);
      console.log(`  Nome: ${existingProject.title}`);
      console.log(`  Status: ${existingProject.status}`);
      console.log(`\nURL: http://localhost:3000/editor/${existingProject.id}`);
      await client.end();
      return;
    }

    // Create test project
    const [newProject] = await db
      .insert(projects)
      .values({
        userId: demoUser.id,
        title: "Podcast Teste - Automação",
        status: "ready",
        audioUrl: "/test-audio.mp3",
        duration: 180, // 3 minutes
        originalDuration: 240, // 4 minutes original
        reductionPercentage: 25,
      })
      .returning();

    console.log("✅ Projeto de teste criado!");
    console.log(`  ID: ${newProject.id}`);
    console.log(`  Nome: ${newProject.title}`);

    // Create sample segments for the introduction
    const introSegments = [
      {
        projectId: newProject.id,
        startTime: 0.0,
        endTime: 8.5,
        text: "Olá, bem-vindos ao nosso podcast! Hoje vamos falar sobre inteligência artificial.",
        isSelected: true,
        topic: "Introdução",
        score: 0.92,
      },
      {
        projectId: newProject.id,
        startTime: 8.5,
        endTime: 21.0,
        text: "A IA está transformando o mundo e vamos explorar como ela impacta o mercado de trabalho.",
        isSelected: true,
        topic: "Introdução",
        score: 0.88,
      },
      {
        projectId: newProject.id,
        startTime: 21.0,
        endTime: 35.0,
        text: "Mas primeiro, deixa eu me apresentar. Meu nome é João e sou especialista em tecnologia.",
        isSelected: true,
        topic: "Apresentação",
        score: 0.75,
      },
      {
        projectId: newProject.id,
        startTime: 35.0,
        endTime: 60.0,
        text: "Vamos começar falando sobre machine learning e como ele funciona na prática.",
        isSelected: true,
        topic: "Conteúdo Principal",
        score: 0.90,
      },
    ];

    await db.insert(segments).values(introSegments);
    console.log(`✓ ${introSegments.length} segmentos criados`);

    console.log(`\n✅ Setup completo!`);
    console.log(`\n📝 Use este URL para testar:`);
    console.log(`   http://localhost:3000/editor/${newProject.id}`);
    console.log(`\n💬 No chat, teste com: "me mostra a introdução"`);
  } catch (error: any) {
    console.error("✗ Erro:", error.message);
    throw error;
  }

  await client.end();
}

main().catch(console.error);
