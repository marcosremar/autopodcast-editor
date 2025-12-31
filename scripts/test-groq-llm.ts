/**
 * Script para testar a integração do AIService para análise
 * Usa AIService centralizado (Groq + OpenRouter fallback)
 */

import "dotenv/config";
import { AnalysisService } from "../src/lib/ai/analyze";
import { getAIService } from "../src/lib/ai/AIService";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY não configurada");
  process.exit(1);
}

async function main() {
  console.log("🤖 Testando AIService para análise de segmentos\n");

  // Verificar status do AIService
  const aiService = getAIService();
  const status = aiService.getProviderStatus();
  console.log("📡 Status dos providers:");
  console.log(`   Groq: ${status.groq.available ? "✅ Ativo" : "❌ Inativo"}`);
  console.log(`   OpenRouter: ${status.openrouter.available ? "✅ Ativo" : "❌ Inativo"}\n`);

  // Criar serviço de análise (usa AIService internamente)
  const analysisService = new AnalysisService();

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

  console.log("🔄 Analisando com AIService...\n");

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

    console.log("\n✅ AIService funcionando corretamente!");
  } catch (error) {
    console.error("❌ Erro na análise:", error);
    process.exit(1);
  }
}

main().catch(console.error);
