/**
 * Script para criar um usuário no banco de dados
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { users } from "../src/lib/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não configurada");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function main() {
  const email = process.argv[2] || "marcosremar@gmail.com";
  const password = process.argv[3] || "senha123";
  const name = process.argv[4] || "Marcos Remar";

  console.log("Criando usuário...\n");
  console.log("Email:", email);
  console.log("Nome:", name);
  console.log();

  // Hash da senha
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      plan: "pro",
    }).returning();

    console.log("✓ Usuário criado com sucesso!");
    console.log("ID:", newUser[0].id);
    console.log("Email:", newUser[0].email);
    console.log("Nome:", newUser[0].name);
    console.log("Plano:", newUser[0].plan);
    console.log("\nVocê pode fazer login com:");
    console.log("Email:", email);
    console.log("Senha:", password);
  } catch (error: any) {
    if (error.code === "23505") {
      console.error("✗ Erro: Usuário com este email já existe!");
    } else {
      console.error("✗ Erro ao criar usuário:", error.message);
    }
  }

  await client.end();
}

main().catch(console.error);
