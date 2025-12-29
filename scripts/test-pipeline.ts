/**
 * Script para testar o pipeline de processamento de podcast
 * Usa Groq Whisper para transcrição e Groq Llama para análise
 */

import "dotenv/config";
import Groq from "groq-sdk";
import * as fs from "fs";
import * as path from "path";

// Configurar variáveis de ambiente
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY não configurada");
  process.exit(1);
}

const GROQ_LLM_MODEL = "llama-3.3-70b-versatile";

// Transcrição mock do vídeo do YouTube (fallback se Groq falhar)
const MOCK_TRANSCRIPTION = {
  text: `Olá pessoal, tudo bem? Hoje vamos falar sobre programação e inteligência artificial.

  Bom, primeiro quero agradecer a todos que estão assistindo esse vídeo. É muito importante para mim.

  Então, vamos começar falando sobre o que é machine learning. Machine learning é uma área da inteligência artificial que permite que computadores aprendam com dados sem serem explicitamente programados.

  Ah, espera, deixa eu tomar uma água aqui... pronto.

  Continuando, existem três tipos principais de machine learning: supervisionado, não supervisionado e por reforço.

  No aprendizado supervisionado, você tem dados rotulados. Por exemplo, se você quer ensinar um modelo a reconhecer gatos, você mostra várias fotos de gatos e diz "isso é um gato".

  Hmm, acho que eu falei errado ali. Na verdade, no supervisionado você precisa de exemplos com as respostas corretas.

  Já no aprendizado não supervisionado, o modelo encontra padrões sozinho nos dados, sem rótulos.

  E o aprendizado por reforço é quando o modelo aprende por tentativa e erro, recebendo recompensas ou punições.

  Agora, uma aplicação muito interessante é o processamento de linguagem natural, que é o que permite que assistentes como a Alexa e o Google entendam o que você fala.

  Bom pessoal, acho que é isso por hoje. Se gostaram, deixem o like e se inscrevam no canal. Até a próxima!`,
  segments: [
    { start: 0, end: 8, text: "Olá pessoal, tudo bem? Hoje vamos falar sobre programação e inteligência artificial." },
    { start: 8, end: 18, text: "Bom, primeiro quero agradecer a todos que estão assistindo esse vídeo. É muito importante para mim." },
    { start: 18, end: 35, text: "Então, vamos começar falando sobre o que é machine learning. Machine learning é uma área da inteligência artificial que permite que computadores aprendam com dados sem serem explicitamente programados." },
    { start: 35, end: 42, text: "Ah, espera, deixa eu tomar uma água aqui... pronto." },
    { start: 42, end: 55, text: "Continuando, existem três tipos principais de machine learning: supervisionado, não supervisionado e por reforço." },
    { start: 55, end: 72, text: "No aprendizado supervisionado, você tem dados rotulados. Por exemplo, se você quer ensinar um modelo a reconhecer gatos, você mostra várias fotos de gatos e diz isso é um gato." },
    { start: 72, end: 85, text: "Hmm, acho que eu falei errado ali. Na verdade, no supervisionado você precisa de exemplos com as respostas corretas." },
    { start: 85, end: 100, text: "Já no aprendizado não supervisionado, o modelo encontra padrões sozinho nos dados, sem rótulos." },
    { start: 100, end: 115, text: "E o aprendizado por reforço é quando o modelo aprende por tentativa e erro, recebendo recompensas ou punições." },
    { start: 115, end: 135, text: "Agora, uma aplicação muito interessante é o processamento de linguagem natural, que é o que permite que assistentes como a Alexa e o Google entendam o que você fala." },
    { start: 135, end: 150, text: "Bom pessoal, acho que é isso por hoje. Se gostaram, deixem o like e se inscrevam no canal. Até a próxima!" },
  ]
};

interface SegmentAnalysis {
  topic: string;
  interestScore: number;
  clarityScore: number;
  isTangent: boolean;
  isRepetition: boolean;
  keyInsight: string;
  hasError: boolean;
  errorDetail?: string;
  needsRerecord: boolean;
  rerecordSuggestion?: string;
}

async function analyzeSegment(
  client: Groq,
  segment: { start: number; end: number; text: string },
  context: string
): Promise<SegmentAnalysis> {
  const prompt = `Você é um editor de podcast experiente. Analise este segmento de áudio transcrito e retorne uma análise em JSON.

CONTEXTO DO EPISÓDIO:
${context}

SEGMENTO A ANALISAR (${segment.start}s - ${segment.end}s):
"${segment.text}"

Retorne APENAS um JSON válido com esta estrutura:
{
  "topic": "tópico principal do segmento",
  "interestScore": 1-10 (quão interessante/valioso é o conteúdo),
  "clarityScore": 1-10 (quão claro e bem explicado está),
  "isTangent": true/false (é uma tangente/digressão?),
  "isRepetition": true/false (repete algo já dito?),
  "keyInsight": "principal insight ou informação útil, ou vazio se não tiver",
  "hasError": true/false (tem erro factual, contradição ou confusão?),
  "errorDetail": "descrição do erro se houver",
  "needsRerecord": true/false (precisa ser regravado?),
  "rerecordSuggestion": "sugestão de como regravar se necessário"
}`;

  const response = await client.chat.completions.create({
    model: GROQ_LLM_MODEL,
    max_tokens: 500,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Resposta vazia do Groq");
  }

  // Extrair JSON da resposta
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Não foi possível extrair JSON da resposta");
  }

  return JSON.parse(jsonMatch[0]) as SegmentAnalysis;
}

async function selectBestSegments(
  segments: Array<{ start: number; end: number; text: string; analysis: SegmentAnalysis }>,
  targetDurationSeconds: number
): Promise<typeof segments> {
  // Ordenar por score de interesse * clareza
  const scored = segments.map((s) => ({
    ...s,
    score: s.analysis.interestScore * s.analysis.clarityScore,
  }));

  // Filtrar tangentes, repetições e erros
  const filtered = scored.filter(
    (s) => !s.analysis.isTangent && !s.analysis.isRepetition && !s.analysis.hasError
  );

  // Ordenar por score
  filtered.sort((a, b) => b.score - a.score);

  // Selecionar até atingir duração alvo
  const selected: typeof segments = [];
  let totalDuration = 0;

  for (const segment of filtered) {
    const segmentDuration = segment.end - segment.start;
    if (totalDuration + segmentDuration <= targetDurationSeconds) {
      selected.push(segment);
      totalDuration += segmentDuration;
    }
  }

  // Reordenar por tempo original para manter narrativa
  selected.sort((a, b) => a.start - b.start);

  return selected;
}

async function transcribeWithGroq(audioPath: string): Promise<{ text: string; segments: Array<{ start: number; end: number; text: string }> }> {
  const groq = new Groq({ apiKey: GROQ_API_KEY });

  console.log(`   Lendo arquivo: ${audioPath}`);
  const audioFile = fs.readFileSync(audioPath);

  console.log(`   Enviando para Groq Whisper...`);
  const transcription = await groq.audio.transcriptions.create({
    file: new File([audioFile], path.basename(audioPath), { type: "audio/mpeg" }),
    model: "whisper-large-v3",
    response_format: "verbose_json",
    language: "pt",
  });

  // Converter segments do Groq para nosso formato
  const segments = (transcription as unknown as { segments: Array<{ start: number; end: number; text: string }> }).segments || [];

  return {
    text: transcription.text,
    segments: segments.map((s) => ({
      start: Math.round(s.start),
      end: Math.round(s.end),
      text: s.text.trim(),
    })),
  };
}

async function main() {
  console.log("🎙️ Iniciando teste do pipeline de edição de podcast\n");
  console.log("   📡 Usando Groq para Whisper + Llama 3.3\n");

  const groq = new Groq({ apiKey: GROQ_API_KEY });

  // Verificar se existe o arquivo de áudio
  const audioPath = path.resolve("./test-media/audio-short.mp3");
  let transcription: { text: string; segments: Array<{ start: number; end: number; text: string }> };

  if (fs.existsSync(audioPath)) {
    console.log("🎤 Transcrevendo áudio com Groq Whisper...\n");
    try {
      transcription = await transcribeWithGroq(audioPath);
      console.log(`   ✅ Transcrição concluída: ${transcription.segments.length} segmentos\n`);
    } catch (error) {
      console.log(`   ⚠️ Erro na transcrição Groq, usando mock: ${error}\n`);
      transcription = MOCK_TRANSCRIPTION;
    }
  } else {
    console.log("📝 Usando transcrição mock (arquivo de áudio não encontrado)\n");
    transcription = MOCK_TRANSCRIPTION;
  }

  console.log(`📝 Transcrição: ${transcription.segments.length} segmentos\n`);

  // Mostrar preview do texto
  console.log("   Preview:");
  console.log(`   "${transcription.text.substring(0, 200)}..."\n`);

  // Contexto geral do episódio
  const context = transcription.text.substring(0, 500);

  console.log("🤖 Analisando segmentos com Groq Llama...\n");

  const analyzedSegments: Array<{
    start: number;
    end: number;
    text: string;
    analysis: SegmentAnalysis;
  }> = [];

  for (const segment of transcription.segments) {
    process.stdout.write(`   Analisando ${segment.start}s-${segment.end}s... `);
    try {
      const analysis = await analyzeSegment(groq, segment, context);
      analyzedSegments.push({ ...segment, analysis });
      console.log(
        `✅ Score: ${analysis.interestScore}/10, ${analysis.isTangent ? "TANGENTE" : analysis.hasError ? "ERRO" : "OK"}`
      );
    } catch (error) {
      console.log(`❌ Erro: ${error}`);
    }
  }

  console.log("\n📊 Resumo da análise:");
  console.log(`   Total de segmentos: ${analyzedSegments.length}`);
  console.log(
    `   Tangentes: ${analyzedSegments.filter((s) => s.analysis.isTangent).length}`
  );
  console.log(
    `   Com erros: ${analyzedSegments.filter((s) => s.analysis.hasError).length}`
  );
  console.log(
    `   Média de interesse: ${(
      analyzedSegments.reduce((acc, s) => acc + s.analysis.interestScore, 0) /
      analyzedSegments.length
    ).toFixed(1)}`
  );

  // Selecionar melhores segmentos para um episódio de 60 segundos
  console.log("\n✂️ Selecionando melhores segmentos (alvo: 60s)...\n");
  const selected = await selectBestSegments(analyzedSegments, 60);

  console.log("🎬 Segmentos selecionados para o episódio final:");
  let totalDuration = 0;
  for (const segment of selected) {
    const duration = segment.end - segment.start;
    totalDuration += duration;
    console.log(`   [${segment.start}s-${segment.end}s] ${segment.text.substring(0, 60)}...`);
    console.log(`      → Tópico: ${segment.analysis.topic}`);
    console.log(`      → Score: ${segment.analysis.interestScore}/10`);
    console.log("");
  }

  console.log(`\n📈 Resultado:`);
  console.log(`   Duração original: 150s`);
  console.log(`   Duração final: ${totalDuration}s`);
  console.log(`   Redução: ${Math.round((1 - totalDuration / 150) * 100)}%`);

  // Segmentos removidos
  console.log("\n🗑️ Segmentos removidos:");
  const removed = analyzedSegments.filter(
    (s) => !selected.find((sel) => sel.start === s.start)
  );
  for (const segment of removed) {
    const reason = segment.analysis.isTangent
      ? "Tangente"
      : segment.analysis.hasError
      ? "Erro"
      : segment.analysis.isRepetition
      ? "Repetição"
      : "Score baixo";
    console.log(`   [${segment.start}s-${segment.end}s] ${reason}: ${segment.text.substring(0, 40)}...`);
  }

  console.log("\n✅ Pipeline testado com sucesso!");
}

main().catch(console.error);
