/**
 * Script para processar podcast completo
 * Transcreve, analisa e gera resultado editado
 */

import "dotenv/config";
import Groq from "groq-sdk";
import * as fs from "fs";
import * as path from "path";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY não configurada");
  process.exit(1);
}

const groq = new Groq({ apiKey: GROQ_API_KEY });
const GROQ_LLM_MODEL = "llama-3.3-70b-versatile";

interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
}

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

interface AnalyzedSegment extends Segment {
  analysis: SegmentAnalysis;
  selected: boolean;
  removalReason?: string;
}

// Formatar tempo em mm:ss
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Transcrever áudio com Groq Whisper
async function transcribeAudio(audioPath: string): Promise<Segment[]> {
  console.log("   Lendo arquivo:", audioPath);
  const audioFile = fs.readFileSync(audioPath);
  const fileSizeMB = audioFile.length / (1024 * 1024);
  console.log(`   Tamanho: ${fileSizeMB.toFixed(2)} MB`);

  console.log("   Enviando para Groq Whisper...");
  const transcription = await groq.audio.transcriptions.create({
    file: new File([audioFile], path.basename(audioPath), { type: "audio/mpeg" }),
    model: "whisper-large-v3",
    response_format: "verbose_json",
    language: "pt",
  });

  const result = transcription as unknown as {
    text: string;
    segments: Array<{ start: number; end: number; text: string }>
  };

  console.log(`   ✅ Transcrição concluída: ${result.segments?.length || 0} segmentos`);

  return (result.segments || []).map((s, idx) => ({
    id: idx,
    start: Math.round(s.start * 100) / 100,
    end: Math.round(s.end * 100) / 100,
    text: s.text.trim(),
  }));
}

// Analisar um segmento
async function analyzeSegment(
  segment: Segment,
  context: string,
  previousTopics: string[]
): Promise<SegmentAnalysis> {
  const prompt = `Você é um editor de podcast experiente. Analise este segmento de áudio transcrito.

CONTEXTO DO EPISÓDIO:
${context}

TÓPICOS JÁ DISCUTIDOS:
${previousTopics.length > 0 ? previousTopics.join(", ") : "Nenhum ainda"}

SEGMENTO A ANALISAR (${formatTime(segment.start)} - ${formatTime(segment.end)}):
"${segment.text}"

Retorne APENAS um JSON válido:
{
  "topic": "tópico principal (2-4 palavras)",
  "interestScore": 1-10,
  "clarityScore": 1-10,
  "isTangent": true/false,
  "isRepetition": true/false,
  "keyInsight": "insight principal ou vazio",
  "hasError": true/false,
  "errorDetail": "descrição se houver erro",
  "needsRerecord": true/false,
  "rerecordSuggestion": "sugestão se precisar regravar"
}`;

  const response = await groq.chat.completions.create({
    model: GROQ_LLM_MODEL,
    max_tokens: 500,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("JSON não encontrado na resposta");
  }

  return JSON.parse(jsonMatch[0]) as SegmentAnalysis;
}

// Selecionar melhores segmentos
function selectBestSegments(
  segments: AnalyzedSegment[],
  targetDurationSeconds: number
): AnalyzedSegment[] {
  // Marcar razões de remoção
  for (const seg of segments) {
    if (seg.analysis.isTangent) {
      seg.removalReason = "Tangente/Digressão";
    } else if (seg.analysis.isRepetition) {
      seg.removalReason = "Repetição";
    } else if (seg.analysis.hasError) {
      seg.removalReason = "Erro factual";
    } else if (seg.analysis.interestScore < 5) {
      seg.removalReason = "Baixo interesse";
    } else if (seg.analysis.clarityScore < 4) {
      seg.removalReason = "Pouca clareza";
    }
  }

  // Filtrar segmentos válidos
  const validSegments = segments.filter(s => !s.removalReason);

  // Ordenar por score combinado
  const scored = validSegments.map(s => ({
    ...s,
    score: s.analysis.interestScore * 0.6 + s.analysis.clarityScore * 0.4,
  }));
  scored.sort((a, b) => b.score - a.score);

  // Selecionar até atingir duração
  const selected: AnalyzedSegment[] = [];
  let totalDuration = 0;

  for (const seg of scored) {
    const duration = seg.end - seg.start;
    if (totalDuration + duration <= targetDurationSeconds) {
      seg.selected = true;
      selected.push(seg);
      totalDuration += duration;
    }
  }

  // Reordenar por tempo original
  selected.sort((a, b) => a.start - b.start);
  return selected;
}

// Gerar resultado HTML interativo
function generateHTML(
  segments: AnalyzedSegment[],
  selected: AnalyzedSegment[],
  originalDuration: number,
  audioPath: string
): string {
  const finalDuration = selected.reduce((acc, s) => acc + (s.end - s.start), 0);
  const reduction = Math.round((1 - finalDuration / originalDuration) * 100);

  const segmentRows = segments.map(seg => {
    const isSelected = seg.selected;
    const duration = seg.end - seg.start;
    const statusClass = isSelected ? "selected" : "removed";
    const statusIcon = isSelected ? "✅" : "❌";
    const reason = seg.removalReason || "";

    return `
      <tr class="${statusClass}" data-start="${seg.start}" data-end="${seg.end}">
        <td class="status">${statusIcon}</td>
        <td class="time">${formatTime(seg.start)} - ${formatTime(seg.end)}</td>
        <td class="duration">${duration.toFixed(1)}s</td>
        <td class="topic">${seg.analysis.topic}</td>
        <td class="scores">
          <span class="interest" title="Interesse">⭐ ${seg.analysis.interestScore}</span>
          <span class="clarity" title="Clareza">🎯 ${seg.analysis.clarityScore}</span>
        </td>
        <td class="text">${seg.text.substring(0, 100)}${seg.text.length > 100 ? "..." : ""}</td>
        <td class="reason">${reason}</td>
        <td class="actions">
          <button class="play-btn" onclick="playSegment(${seg.start}, ${seg.end})">▶️</button>
        </td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Podcast Editado - AutoPodcast Editor</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }

    header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 30px;
      border-radius: 16px;
      margin-bottom: 30px;
      border: 1px solid #333;
    }
    h1 { font-size: 2rem; margin-bottom: 20px; color: #fff; }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .stat {
      background: rgba(255,255,255,0.05);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-value { font-size: 2.5rem; font-weight: bold; color: #4ade80; }
    .stat-label { color: #888; margin-top: 5px; }

    .player-section {
      background: #1a1a1a;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      border: 1px solid #333;
    }
    .player-title { margin-bottom: 15px; color: #fff; }
    audio { width: 100%; }
    .now-playing {
      margin-top: 15px;
      padding: 15px;
      background: rgba(74, 222, 128, 0.1);
      border-radius: 8px;
      border-left: 4px solid #4ade80;
      display: none;
    }
    .now-playing.active { display: block; }

    .segments-section {
      background: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #333;
    }
    .section-header {
      padding: 20px;
      background: #222;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title { font-size: 1.2rem; }
    .filter-buttons button {
      padding: 8px 16px;
      margin-left: 10px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .filter-buttons button.active { background: #4ade80; color: #000; }
    .filter-buttons button:not(.active) { background: #333; color: #fff; }

    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      padding: 15px;
      background: #222;
      color: #888;
      font-weight: 500;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 15px;
      border-bottom: 1px solid #2a2a2a;
      vertical-align: middle;
    }
    tr.selected { background: rgba(74, 222, 128, 0.05); }
    tr.removed { background: rgba(239, 68, 68, 0.05); opacity: 0.7; }
    tr:hover { background: rgba(255,255,255,0.05); }

    .status { font-size: 1.2rem; width: 40px; text-align: center; }
    .time { font-family: monospace; color: #888; white-space: nowrap; }
    .duration { color: #888; white-space: nowrap; }
    .topic {
      font-weight: 500;
      color: #60a5fa;
      max-width: 150px;
    }
    .scores { white-space: nowrap; }
    .scores span {
      display: inline-block;
      padding: 4px 8px;
      margin-right: 5px;
      background: #2a2a2a;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    .text {
      max-width: 300px;
      font-size: 0.9rem;
      color: #aaa;
      line-height: 1.4;
    }
    .reason {
      color: #ef4444;
      font-size: 0.85rem;
      white-space: nowrap;
    }
    .play-btn {
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      background: #333;
      font-size: 1rem;
      transition: all 0.2s;
    }
    .play-btn:hover { background: #4ade80; transform: scale(1.1); }

    .legend {
      display: flex;
      gap: 20px;
      padding: 15px 20px;
      background: #222;
      border-top: 1px solid #333;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #888;
    }
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .legend-dot.selected { background: #4ade80; }
    .legend-dot.removed { background: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎙️ Podcast Editado - AutoPodcast Editor</h1>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${formatTime(originalDuration)}</div>
          <div class="stat-label">Duração Original</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #4ade80;">${formatTime(finalDuration)}</div>
          <div class="stat-label">Duração Final</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #f59e0b;">${reduction}%</div>
          <div class="stat-label">Redução</div>
        </div>
        <div class="stat">
          <div class="stat-value">${selected.length}/${segments.length}</div>
          <div class="stat-label">Segmentos Selecionados</div>
        </div>
      </div>
    </header>

    <div class="player-section">
      <h2 class="player-title">🎧 Player</h2>
      <audio id="audioPlayer" controls>
        <source src="${audioPath}" type="audio/mpeg">
      </audio>
      <div id="nowPlaying" class="now-playing">
        <strong>Tocando:</strong> <span id="nowPlayingText"></span>
      </div>
    </div>

    <div class="segments-section">
      <div class="section-header">
        <h2 class="section-title">📝 Segmentos Analisados</h2>
        <div class="filter-buttons">
          <button class="active" onclick="filterSegments('all')">Todos</button>
          <button onclick="filterSegments('selected')">Selecionados</button>
          <button onclick="filterSegments('removed')">Removidos</button>
        </div>
      </div>

      <table id="segmentsTable">
        <thead>
          <tr>
            <th></th>
            <th>Tempo</th>
            <th>Duração</th>
            <th>Tópico</th>
            <th>Scores</th>
            <th>Texto</th>
            <th>Motivo Remoção</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${segmentRows}
        </tbody>
      </table>

      <div class="legend">
        <div class="legend-item">
          <div class="legend-dot selected"></div>
          <span>Selecionado para podcast final</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot removed"></div>
          <span>Removido da edição</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    const audio = document.getElementById('audioPlayer');
    const nowPlaying = document.getElementById('nowPlaying');
    const nowPlayingText = document.getElementById('nowPlayingText');
    let currentSegmentEnd = null;

    function playSegment(start, end) {
      audio.currentTime = start;
      audio.play();
      currentSegmentEnd = end;

      const row = document.querySelector(\`tr[data-start="\${start}"]\`);
      if (row) {
        nowPlayingText.textContent = row.querySelector('.text').textContent;
        nowPlaying.classList.add('active');
      }
    }

    audio.addEventListener('timeupdate', () => {
      if (currentSegmentEnd && audio.currentTime >= currentSegmentEnd) {
        audio.pause();
        currentSegmentEnd = null;
        nowPlaying.classList.remove('active');
      }
    });

    function filterSegments(filter) {
      const buttons = document.querySelectorAll('.filter-buttons button');
      buttons.forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');

      const rows = document.querySelectorAll('#segmentsTable tbody tr');
      rows.forEach(row => {
        if (filter === 'all') {
          row.style.display = '';
        } else if (filter === 'selected') {
          row.style.display = row.classList.contains('selected') ? '' : 'none';
        } else if (filter === 'removed') {
          row.style.display = row.classList.contains('removed') ? '' : 'none';
        }
      });
    }
  </script>
</body>
</html>`;
}

async function main() {
  console.log("🎙️ AutoPodcast Editor - Processamento Completo\n");
  console.log("═".repeat(50));

  const audioPath = path.resolve("./test-media/podcast-full.mp3");

  if (!fs.existsSync(audioPath)) {
    console.error("❌ Arquivo de áudio não encontrado:", audioPath);
    process.exit(1);
  }

  // 1. Transcrever
  console.log("\n📝 ETAPA 1: Transcrição\n");
  const segments = await transcribeAudio(audioPath);

  // 2. Analisar
  console.log("\n" + "═".repeat(50));
  console.log("\n🤖 ETAPA 2: Análise com IA\n");

  const analyzedSegments: AnalyzedSegment[] = [];
  const previousTopics: string[] = [];
  const context = segments.slice(0, 5).map(s => s.text).join(" ").substring(0, 500);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    process.stdout.write(`   [${i + 1}/${segments.length}] ${formatTime(seg.start)}... `);

    try {
      const analysis = await analyzeSegment(seg, context, previousTopics.slice(-5));
      analyzedSegments.push({ ...seg, analysis, selected: false });
      previousTopics.push(analysis.topic);

      const icon = analysis.isTangent ? "🔀" : analysis.isRepetition ? "🔁" : analysis.hasError ? "⚠️" : "✅";
      console.log(`${icon} ${analysis.topic} (${analysis.interestScore}/10)`);
    } catch (error) {
      console.log(`❌ Erro`);
      analyzedSegments.push({
        ...seg,
        analysis: {
          topic: "Erro na análise",
          interestScore: 5,
          clarityScore: 5,
          isTangent: false,
          isRepetition: false,
          keyInsight: "",
          hasError: false,
          needsRerecord: false,
        },
        selected: false,
      });
    }

    // Delay para evitar rate limit
    await new Promise(r => setTimeout(r, 150));
  }

  // 3. Selecionar melhores segmentos (alvo: 10 minutos)
  console.log("\n" + "═".repeat(50));
  console.log("\n✂️ ETAPA 3: Seleção de Segmentos\n");

  const targetDuration = 600; // 10 minutos
  const selected = selectBestSegments(analyzedSegments, targetDuration);

  const originalDuration = segments[segments.length - 1]?.end || 0;
  const finalDuration = selected.reduce((acc, s) => acc + (s.end - s.start), 0);

  console.log(`   📊 Segmentos analisados: ${analyzedSegments.length}`);
  console.log(`   ✅ Segmentos selecionados: ${selected.length}`);
  console.log(`   ⏱️ Duração original: ${formatTime(originalDuration)}`);
  console.log(`   ⏱️ Duração final: ${formatTime(finalDuration)}`);
  console.log(`   📉 Redução: ${Math.round((1 - finalDuration / originalDuration) * 100)}%`);

  // 4. Gerar resultado HTML
  console.log("\n" + "═".repeat(50));
  console.log("\n📄 ETAPA 4: Gerando Resultado\n");

  const html = generateHTML(analyzedSegments, selected, originalDuration, "podcast-full.mp3");
  const outputPath = path.resolve("./test-media/podcast-result.html");
  fs.writeFileSync(outputPath, html);

  console.log(`   ✅ Resultado salvo em: ${outputPath}`);
  console.log(`\n   🌐 Abra no navegador: file://${outputPath}`);

  // Resumo final
  console.log("\n" + "═".repeat(50));
  console.log("\n📊 RESUMO FINAL\n");

  const tangents = analyzedSegments.filter(s => s.analysis.isTangent).length;
  const repetitions = analyzedSegments.filter(s => s.analysis.isRepetition).length;
  const errors = analyzedSegments.filter(s => s.analysis.hasError).length;
  const lowInterest = analyzedSegments.filter(s => s.analysis.interestScore < 5 && !s.analysis.isTangent && !s.analysis.isRepetition).length;

  console.log(`   🔀 Tangentes removidas: ${tangents}`);
  console.log(`   🔁 Repetições removidas: ${repetitions}`);
  console.log(`   ⚠️ Erros detectados: ${errors}`);
  console.log(`   📉 Baixo interesse: ${lowInterest}`);
  console.log(`\n   ✅ Podcast editado com sucesso!`);
}

main().catch(console.error);
