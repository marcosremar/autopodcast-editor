/**
 * Script para criar usuário demo
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não configurada");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function main() {
  console.log("🌱 Criando usuário demo...\n");

  try {
    // Check if demo user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "demo@aeropod.com"))
      .limit(1);

    if (existingUser) {
      console.log("✓ Usuário demo já existe!");
      console.log(`  Email: ${existingUser.email}`);
      console.log(`  Nome: ${existingUser.name}`);
      await client.end();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("demo", 10);

    // Create demo user
    const [newUser] = await db
      .insert(users)
      .values({
        email: "demo@aeropod.com",
        password: hashedPassword,
        name: "Demo User",
        plan: "pro",
      })
      .returning();

    console.log("✅ Usuário demo criado com sucesso!");
    console.log(`  Email: ${newUser.email}`);
    console.log(`  Senha: demo`);
    console.log(`  Nome: ${newUser.name}`);
    console.log(`  Plano: ${newUser.plan}`);
  } catch (error: any) {
    console.error("✗ Erro ao criar usuário demo:", error.message);
    throw error;
  }

  await client.end();
}

main().catch(console.error);
