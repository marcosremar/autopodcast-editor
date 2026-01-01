/**
 * Test script for diarization and topic detection services
 *
 * Run with: npx tsx scripts/test-diarization-topics.ts
 */

import 'dotenv/config';

// Test pyannote diarization
async function testDiarization() {
  console.log('\n=== Testing Pyannote Diarization ===\n');

  const PYANNOTE_URL = process.env.PYANNOTE_DIARIZATION_URL ||
    'https://marcosremar--aeropod-pyannote-diarization-diarize.modal.run';

  console.log('Pyannote URL:', PYANNOTE_URL);

  // Test with a sample audio URL (using a public audio file)
  const testAudioUrl = 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand3.wav';

  console.log('\nTesting with sample audio:', testAudioUrl);

  try {
    const response = await fetch(PYANNOTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: testAudioUrl,
        min_speakers: 1,
        max_speakers: 3,
      }),
    });

    console.log('Response status:', response.status, response.statusText);

    const result = await response.json();
    console.log('Diarization result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Pyannote diarization working!');
      console.log('  - Number of speakers:', result.num_speakers);
      console.log('  - Total segments:', result.segments?.length || 0);
    } else {
      console.log('\n❌ Diarization failed:', result.error);
    }
  } catch (error) {
    console.error('\n❌ Error calling pyannote:', error);
  }
}

// Test topic segmentation
async function testTopicSegmentation() {
  console.log('\n=== Testing Topic Segmentation ===\n');

  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_KEY) {
    console.log('❌ OPENROUTER_API_KEY not configured');
    return;
  }

  // Mock transcript segments
  const mockSegments = [
    { id: 0, start: 0, end: 30, text: 'Olá pessoal, bem-vindos ao nosso podcast. Hoje vamos falar sobre inteligência artificial.' },
    { id: 1, start: 30, end: 60, text: 'A IA está mudando o mundo de formas incríveis. Vemos ela em carros autônomos, assistentes virtuais.' },
    { id: 2, start: 60, end: 90, text: 'Mas vamos mudar de assunto agora. Quero falar sobre produtividade no trabalho remoto.' },
    { id: 3, start: 90, end: 120, text: 'Trabalhar de casa tem seus desafios. É importante manter uma rotina e separar vida pessoal do trabalho.' },
    { id: 4, start: 120, end: 150, text: 'Ferramentas como Notion e Slack ajudam muito nessa organização do dia a dia.' },
    { id: 5, start: 150, end: 180, text: 'Para finalizar, quero agradecer a todos que nos acompanham. Até o próximo episódio!' },
  ];

  console.log('Testing with mock transcript segments...\n');

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
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    console.log('Response status:', response.status, response.statusText);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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
      console.log('\n❌ Empty response from OpenRouter');
    }
  } catch (error) {
    console.error('\n❌ Error calling OpenRouter:', error);
  }
}

// Run tests
async function main() {
  console.log('===========================================');
  console.log('Testing Diarization and Topic Detection');
  console.log('===========================================');

  await testDiarization();
  await testTopicSegmentation();

  console.log('\n===========================================');
  console.log('Tests completed!');
  console.log('===========================================\n');
}

main().catch(console.error);
