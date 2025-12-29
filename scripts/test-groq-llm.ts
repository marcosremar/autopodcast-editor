/**
 * Script para testar a integração do Groq LLM (Llama) para análise
 */

import "dotenv/config";
import { AnalysisService } from "../src/lib/ai/analyze";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY não configurada");
  process.exit(1);
}

async function main() {
  console.log("🤖 Testando Groq LLM (Llama 3.3 70B) para análise de segmentos\n");

  // Criar serviço com Groq
  const analysisService = new AnalysisService({
    groqApiKey: GROQ_API_KEY,
    provider: "groq",
  });

  // Segmento de teste
  const testSegment = {
    text: "Então, machine learning é uma área da inteligência artificial que permite que computadores aprendam com dados sem serem explicitamente programados. Existem três tipos principais: supervisionado, não supervisionado e por reforço.",
    startTime: 0,
    endTime: 15,
    previousSegments: [
      { text: "Olá pessoal, hoje vamos falar sobre programação e inteligência artificial.", topic: "Introdução" },
    ],
  };

  console.log("📝 Segmento de teste:");
  console.log(`   "${testSegment.text.substring(0, 80)}..."\n`);

  console.log("🔄 Analisando com Groq Llama...\n");

  try {
    const analysis = await analysisService.analyzeSegment(testSegment);

    console.log("✅ Análise concluída:\n");
    console.log(`   📌 Tópico: ${analysis.topic}`);
    console.log(`   ⭐ Score de interesse: ${analysis.interestScore}/100`);
    console.log(`   🎯 Score de clareza: ${analysis.clarityScore}/100`);
    console.log(`   📖 Insight: ${analysis.keyInsight}`);
    console.log(`   🔗 Standalone: ${analysis.standalone ? "Sim" : "Não"}`);
    console.log(`   🔄 É tangente: ${analysis.isTangent ? "Sim" : "Não"}`);
    console.log(`   🔁 É repetição: ${analysis.isRepetition ? "Sim" : "Não"}`);
    console.log(`   ❌ Tem erro: ${analysis.hasFactualError ? "Sim" : "Não"}`);
    console.log(`   🎙️ Precisa regravar: ${analysis.needsRerecord ? "Sim" : "Não"}`);

    console.log("\n✅ Groq LLM funcionando corretamente!");
  } catch (error) {
    console.error("❌ Erro na análise:", error);
    process.exit(1);
  }
}

main().catch(console.error);
