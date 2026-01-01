/**
 * Test script for diarization using base64 audio
 *
 * Run with: npx tsx scripts/test-diarization-base64.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

// Generate a simple test audio file (silence)
function generateTestAudio(): Buffer {
  // Create a simple WAV file header + 2 seconds of silence
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const duration = 2; // seconds
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize - 8;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Add some random audio data to simulate speech
  for (let i = 44; i < buffer.length; i += 2) {
    // Generate pseudo-random audio to simulate speech patterns
    const t = (i - 44) / (sampleRate * 2);
    const value = Math.sin(t * 440 * Math.PI * 2) * 8000 + // 440 Hz tone
                  Math.sin(t * 330 * Math.PI * 2) * 4000 + // 330 Hz tone
                  (Math.random() - 0.5) * 2000; // noise
    buffer.writeInt16LE(Math.round(value), i);
  }

  return buffer;
}

async function testDiarizationWithBase64() {
  console.log('\n=== Testing Pyannote Diarization with Base64 Audio ===\n');

  const PYANNOTE_URL = process.env.PYANNOTE_DIARIZATION_URL ||
    'https://marcosremar--aeropod-pyannote-diarization-diarize.modal.run';

  console.log('Pyannote URL:', PYANNOTE_URL);

  // Generate test audio
  console.log('Generating test audio (2 seconds)...');
  const audioBuffer = generateTestAudio();
  const audioBase64 = audioBuffer.toString('base64');
  console.log('Audio size:', audioBuffer.length, 'bytes');
  console.log('Base64 size:', audioBase64.length, 'characters');

  try {
    console.log('\nSending request to Pyannote...');
    const response = await fetch(PYANNOTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_base64: audioBase64,
        min_speakers: 1,
        max_speakers: 2,
      }),
    });

    console.log('Response status:', response.status, response.statusText);

    const result = await response.json();
    console.log('\nDiarization result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Pyannote diarization working!');
      console.log('  - Number of speakers:', result.num_speakers);
      console.log('  - Total segments:', result.segments?.length || 0);
      console.log('  - Audio duration:', result.duration, 'seconds');
    } else {
      console.log('\n⚠️ Diarization result:', result.error);
      console.log('Note: This may fail with synthetic audio - it should work with real speech audio');
    }
  } catch (error) {
    console.error('\n❌ Error calling pyannote:', error);
  }
}

// Test topic segmentation with Anthropic (Claude)
async function testTopicSegmentationWithClaude() {
  console.log('\n=== Testing Topic Segmentation with Claude ===\n');

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_KEY) {
    console.log('❌ ANTHROPIC_API_KEY not configured');
    return;
  }

  console.log('Using Anthropic API...');

  // Mock transcript segments
  const mockSegments = [
    { id: 0, start: 0, end: 30, text: 'Olá pessoal, bem-vindos ao nosso podcast. Hoje vamos falar sobre inteligência artificial.' },
    { id: 1, start: 30, end: 60, text: 'A IA está mudando o mundo de formas incríveis. Vemos ela em carros autônomos, assistentes virtuais.' },
    { id: 2, start: 60, end: 90, text: 'Mas vamos mudar de assunto agora. Quero falar sobre produtividade no trabalho remoto.' },
    { id: 3, start: 90, end: 120, text: 'Trabalhar de casa tem seus desafios. É importante manter uma rotina e separar vida pessoal do trabalho.' },
    { id: 4, start: 120, end: 150, text: 'Ferramentas como Notion e Slack ajudam muito nessa organização do dia a dia.' },
    { id: 5, start: 150, end: 180, text: 'Para finalizar, quero agradecer a todos que nos acompanham. Até o próximo episódio!' },
  ];

  const prompt = `Você é um especialista em análise de conteúdo de podcasts.

Analise a transcrição abaixo e identifique os TÓPICOS/TEMAS principais discutidos.
Para cada tópico, identifique:
1. Um título curto e descritivo
2. Uma breve descrição
3. O índice do segmento onde começa
4. O índice do segmento onde termina

TRANSCRIÇÃO:
${mockSegments.map((s, i) => `[${i}] ${s.text}`).join('\n')}

Responda APENAS com JSON no formato:
{
  "topics": [
    {
      "title": "Título",
      "description": "Descrição",
      "startSegmentIndex": 0,
      "endSegmentIndex": 1
    }
  ],
  "summary": "Resumo geral"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    console.log('Response status:', response.status, response.statusText);

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (content) {
      console.log('\nRaw response:');
      console.log(content);

      // Try to parse JSON
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }

      try {
        const topics = JSON.parse(jsonStr);
        console.log('\n✅ Topic segmentation working!');
        console.log('  - Detected topics:', topics.topics?.length || 0);
        console.log('  - Summary:', topics.summary);

        topics.topics?.forEach((t: any, i: number) => {
          console.log(`\n  Topic ${i + 1}: ${t.title}`);
          console.log(`    Segments: ${t.startSegmentIndex} - ${t.endSegmentIndex}`);
          console.log(`    Description: ${t.description}`);
        });
      } catch (e) {
        console.log('\n⚠️ Could not parse JSON response');
      }
    } else {
      console.log('\n❌ Error from Anthropic:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('\n❌ Error calling Anthropic:', error);
  }
}

// Run tests
async function main() {
  console.log('===========================================');
  console.log('Testing Diarization and Topic Detection');
  console.log('===========================================');

  await testDiarizationWithBase64();
  await testTopicSegmentationWithClaude();

  console.log('\n===========================================');
  console.log('Tests completed!');
  console.log('===========================================\n');
}

main().catch(console.error);
