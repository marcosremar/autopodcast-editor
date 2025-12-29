/**
 * Example Usage of Audio Processing Infrastructure
 *
 * This file demonstrates how to use the audio processing pipeline
 * in different scenarios.
 */

import {
  createTranscriptionService,
  createExportService,
  chunkTranscription,
  validateChunks,
  type AudioChunk,
  MockStorageClient,
} from './index';

/**
 * Example 1: Basic transcription workflow
 */
export async function basicTranscription(audioUrl: string) {
  const transcription = createTranscriptionService();

  const result = await transcription.transcribe({
    audioUrl,
    language: 'en',
  });

  console.log('Full transcript:', result.text);
  console.log('Number of segments:', result.segments.length);
  console.log('Duration:', result.duration, 'seconds');

  return result;
}

/**
 * Example 2: Upload audio and transcribe
 */
export async function uploadAndTranscribe(audioBuffer: Buffer) {
  // Upload to storage
  const storage = new MockStorageClient();
  const { url } = await storage.upload({
    key: `audio/${Date.now()}.mp3`,
    body: audioBuffer,
    contentType: 'audio/mpeg',
  });

  // Transcribe
  const transcription = createTranscriptionService();
  const result = await transcription.transcribe({ audioUrl: url });

  return { url, transcription: result };
}

/**
 * Example 3: Chunk transcription with custom settings
 */
export async function createCustomChunks(audioUrl: string) {
  const transcription = createTranscriptionService();
  const result = await transcription.transcribe({ audioUrl });

  // Create 45-90 second chunks
  const chunks = chunkTranscription(result.segments, {
    minDuration: 45,
    maxDuration: 90,
    preferSentenceBoundaries: true,
  });

  // Validate
  if (!validateChunks(chunks)) {
    throw new Error('Generated invalid chunks');
  }

  return chunks;
}

/**
 * Example 4: Export selected chunks
 */
export async function exportSelectedChunks(
  audioPath: string,
  chunks: AudioChunk[],
  selectedIndices: number[]
) {
  const exporter = createExportService();

  // Filter selected chunks
  const selectedChunks = chunks.filter((_, i) => selectedIndices.includes(i));

  // Export each chunk
  const buffers = await exporter.extractChunks(audioPath, selectedChunks, {
    outputFormat: 'mp3',
    bitrate: '192k',
  });

  return buffers;
}

/**
 * Example 5: Create final podcast from chunks with crossfade
 */
export async function createFinalPodcast(
  chunks: AudioChunk[],
  chunkPaths: string[]
) {
  const exporter = createExportService();

  // Prepare segments for concatenation
  const segments = chunks.map((chunk, i) => ({
    path: chunkPaths[i],
    startTime: 0, // Full chunk
    endTime: chunk.endTime - chunk.startTime,
  }));

  // Concatenate with crossfade
  const finalAudio = await exporter.concatenateSegments({
    segments,
    crossfadeDuration: 0.5,
    outputFormat: 'mp3',
    bitrate: '320k',
  });

  return finalAudio;
}

/**
 * Example 6: Complete pipeline with error handling
 */
export async function processAudioWithErrorHandling(audioPath: string) {
  try {
    // 1. Upload
    console.log('Uploading audio...');
    const storage = new MockStorageClient();
    const fs = await import('fs/promises');
    const audioBuffer = await fs.readFile(audioPath);

    const { url, key } = await storage.upload({
      key: `episodes/${Date.now()}.mp3`,
      body: audioBuffer,
      contentType: 'audio/mpeg',
    });

    console.log('Uploaded:', url);

    // 2. Transcribe
    console.log('Transcribing...');
    const transcription = createTranscriptionService();
    const result = await transcription.transcribe({
      audioUrl: url,
      language: 'en',
    });

    console.log(`Transcribed ${result.segments.length} segments`);

    // 3. Chunk
    console.log('Creating chunks...');
    const chunks = chunkTranscription(result.segments);

    if (!validateChunks(chunks)) {
      throw new Error('Generated invalid chunks');
    }

    console.log(`Created ${chunks.length} chunks`);

    // 4. Export chunks
    console.log('Exporting chunks...');
    const exporter = createExportService();
    const chunkBuffers = await exporter.extractChunks(audioPath, chunks);

    console.log('Success!');

    return {
      url,
      key,
      transcription: result,
      chunks,
      chunkBuffers,
    };
  } catch (error) {
    console.error('Error processing audio:', error);

    if (error instanceof Error) {
      if (error.message.includes('REPLICATE_API_TOKEN')) {
        console.error('Missing Replicate API token. Set REPLICATE_API_TOKEN in .env');
      } else if (error.message.includes('S3_')) {
        console.error('Missing S3 configuration. Check S3_* variables in .env');
      } else if (error.message.includes('Transcription failed')) {
        console.error('Transcription service error:', error.message);
      }
    }

    throw error;
  }
}

/**
 * Example 7: Using mock services for testing
 */
export async function testWithMockServices() {
  const storage = new MockStorageClient(); // Mock
  const transcription = createTranscriptionService(true); // Mock
  const exporter = createExportService(true); // Mock

  // Upload
  const { url } = await storage.upload({
    key: 'test.mp3',
    body: Buffer.from('test data'),
    contentType: 'audio/mpeg',
  });

  // Transcribe
  const result = await transcription.transcribe({ audioUrl: url });

  // Chunk
  const chunks = chunkTranscription(result.segments);

  // Export
  const buffers = await exporter.extractChunks('test.mp3', chunks);

  return { result, chunks, buffers };
}

/**
 * Example 8: Generate signed URLs for client downloads
 */
export async function generateDownloadLinks(keys: string[]) {
  const storage = new MockStorageClient();

  const links = await Promise.all(
    keys.map(async (key) => {
      const url = await storage.getSignedUrl({
        key,
        expiresIn: 3600, // 1 hour
      });

      return { key, url };
    })
  );

  return links;
}

/**
 * Example 9: Batch processing multiple audio files
 */
export async function batchProcess(audioPaths: string[]) {
  const results = [];

  for (const path of audioPaths) {
    console.log(`Processing ${path}...`);

    try {
      const result = await processAudioWithErrorHandling(path);
      results.push({ path, status: 'success', result });
    } catch (error) {
      console.error(`Failed to process ${path}:`, error);
      results.push({ path, status: 'error', error });
    }
  }

  return results;
}

/**
 * Example 10: Custom chunk selection based on content
 */
export async function selectChunksByKeywords(
  audioUrl: string,
  keywords: string[]
) {
  const transcription = createTranscriptionService();
  const result = await transcription.transcribe({ audioUrl });

  const chunks = chunkTranscription(result.segments);

  // Filter chunks containing keywords
  const matchingChunks = chunks.filter((chunk) => {
    const lowerText = chunk.text.toLowerCase();
    return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
  });

  return {
    totalChunks: chunks.length,
    matchingChunks: matchingChunks.length,
    chunks: matchingChunks,
  };
}
