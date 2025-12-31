/**
 * Show Notes Service
 * Generates episode summaries, chapters, and key points using AI
 * Usa AIService centralizado (Groq) em vez de Anthropic
 */

import { aiComplete, aiCompleteJSON } from "@/lib/ai/AIService";
import { Segment, ShowNote, NewShowNote, ShowNotesChapter, ShowNotesGuest } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { showNotes, segments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface GeneratedShowNotes {
  summary: string;
  chapters: ShowNotesChapter[];
  keyPoints: string[];
  guestInfo?: ShowNotesGuest[];
  links?: string[];
}

/**
 * Show Notes Service usando AIService centralizado
 */
export class ShowNotesService {
  constructor() {
    // AIService é inicializado automaticamente via singleton
  }

  /**
   * Generate complete show notes from project segments
   */
  async generate(projectId: string): Promise<ShowNote> {
    // Get all segments for the project
    const projectSegments = await db
      .select()
      .from(segments)
      .where(eq(segments.projectId, projectId))
      .orderBy(segments.startTime);

    if (projectSegments.length === 0) {
      throw new Error("No segments found for project");
    }

    // Build full transcript
    const transcript = this.buildTranscript(projectSegments);

    // Generate show notes with AI
    const notes = await this.generateWithAI(transcript, projectSegments);

    // Save to database
    const existingNote = await db
      .select()
      .from(showNotes)
      .where(eq(showNotes.projectId, projectId))
      .limit(1);

    if (existingNote.length > 0) {
      // Update existing
      const [updated] = await db
        .update(showNotes)
        .set({
          summary: notes.summary,
          chapters: notes.chapters,
          keyPoints: notes.keyPoints,
          guestInfo: notes.guestInfo,
          links: notes.links,
          updatedAt: new Date(),
        })
        .where(eq(showNotes.projectId, projectId))
        .returning();
      return updated;
    } else {
      // Create new
      const newNote: NewShowNote = {
        projectId,
        summary: notes.summary,
        chapters: notes.chapters,
        keyPoints: notes.keyPoints,
        guestInfo: notes.guestInfo,
        links: notes.links,
      };

      const [inserted] = await db.insert(showNotes).values(newNote).returning();
      return inserted;
    }
  }

  /**
   * Build transcript from segments
   */
  private buildTranscript(segments: Segment[]): string {
    return segments
      .map((seg) => {
        const time = this.formatTimestamp(seg.startTime);
        return `[${time}] ${seg.text}`;
      })
      .join("\n\n");
  }

  /**
   * Format seconds to HH:MM:SS
   */
  private formatTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  /**
   * Generate show notes using AIService
   */
  private async generateWithAI(
    transcript: string,
    segments: Segment[]
  ): Promise<GeneratedShowNotes> {
    const prompt = `Analise esta transcricao de podcast e gere show notes completas.

TRANSCRICAO:
${transcript}

SEGMENTOS COM TOPICOS:
${segments.map((s) => `- [${this.formatTimestamp(s.startTime)}] ${s.topic || "Sem topico"}: ${s.keyInsight || s.text.slice(0, 100)}`).join("\n")}

Gere um JSON com a seguinte estrutura:
{
  "summary": "Resumo do episodio em 2-3 paragrafos. Deve ser envolvente e informativo.",
  "chapters": [
    {
      "title": "Titulo do capitulo",
      "timestamp": <segundos desde o inicio>,
      "description": "Breve descricao do que e discutido"
    }
  ],
  "keyPoints": [
    "Ponto chave 1",
    "Ponto chave 2",
    "etc..."
  ],
  "guestInfo": [
    {
      "name": "Nome do convidado",
      "bio": "Breve bio se mencionada",
      "role": "Papel/cargo se mencionado"
    }
  ],
  "links": ["URLs mencionados no episodio"]
}

INSTRUCOES:
1. O resumo deve capturar a essencia do episodio e atrair ouvintes
2. Crie capitulos para cada mudanca significativa de topico (minimo 3, maximo 10)
3. Liste 5-10 pontos chave mais importantes
4. Identifique convidados se houver (nomes proprios mencionados como participantes)
5. Extraia links/URLs mencionados
6. Use os timestamps dos segmentos para criar os capitulos
7. Responda APENAS com o JSON, sem texto adicional`;

    try {
      const parsed = await aiCompleteJSON<GeneratedShowNotes>("show_notes", prompt);

      return {
        summary: parsed.summary || "",
        chapters: (parsed.chapters || []).map((c: any) => ({
          title: c.title,
          timestamp: typeof c.timestamp === "number" ? c.timestamp : 0,
          description: c.description,
        })),
        keyPoints: parsed.keyPoints || [],
        guestInfo: parsed.guestInfo,
        links: parsed.links,
      };
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      throw new Error("Failed to parse show notes from AI response");
    }
  }

  /**
   * Regenerate specific section of show notes
   */
  async regenerateSection(
    projectId: string,
    section: "summary" | "chapters" | "keyPoints"
  ): Promise<ShowNote> {
    const existing = await db
      .select()
      .from(showNotes)
      .where(eq(showNotes.projectId, projectId))
      .limit(1);

    if (existing.length === 0) {
      // Generate full notes if none exist
      return this.generate(projectId);
    }

    const projectSegments = await db
      .select()
      .from(segments)
      .where(eq(segments.projectId, projectId))
      .orderBy(segments.startTime);

    const transcript = this.buildTranscript(projectSegments);

    let newContent: any = {};

    switch (section) {
      case "summary":
        newContent.summary = await this.regenerateSummary(transcript);
        break;
      case "chapters":
        newContent.chapters = await this.regenerateChapters(transcript, projectSegments);
        break;
      case "keyPoints":
        newContent.keyPoints = await this.regenerateKeyPoints(transcript);
        break;
    }

    const [updated] = await db
      .update(showNotes)
      .set({
        ...newContent,
        updatedAt: new Date(),
      })
      .where(eq(showNotes.projectId, projectId))
      .returning();

    return updated;
  }

  /**
   * Regenerate just the summary
   */
  private async regenerateSummary(transcript: string): Promise<string> {
    const prompt = `Escreva um resumo envolvente de 2-3 paragrafos para este episodio de podcast. O resumo deve atrair novos ouvintes e dar uma visao geral do conteudo.

TRANSCRICAO:
${transcript.slice(0, 10000)}

Responda APENAS com o resumo, sem formatacao adicional.`;

    return await aiComplete("show_notes", prompt);
  }

  /**
   * Regenerate chapters
   */
  private async regenerateChapters(
    transcript: string,
    segments: Segment[]
  ): Promise<ShowNotesChapter[]> {
    const prompt = `Crie capitulos para este podcast. Cada capitulo deve marcar uma mudanca significativa de topico.

TRANSCRICAO:
${transcript.slice(0, 15000)}

SEGMENTOS DISPONIVEIS:
${segments.map((s) => `[${this.formatTimestamp(s.startTime)}] ${s.topic || s.text.slice(0, 50)}`).join("\n")}

Responda com um JSON array:
[
  {"title": "Titulo", "timestamp": <segundos>, "description": "Descricao breve"}
]

Crie entre 4 e 8 capitulos. Use os timestamps dos segmentos. Responda APENAS com o JSON.`;

    try {
      return await aiCompleteJSON<ShowNotesChapter[]>("show_notes", prompt);
    } catch {
      return [];
    }
  }

  /**
   * Regenerate key points
   */
  private async regenerateKeyPoints(transcript: string): Promise<string[]> {
    const prompt = `Liste os 5-10 pontos-chave mais importantes deste podcast.

TRANSCRICAO:
${transcript.slice(0, 10000)}

Responda com um JSON array de strings:
["Ponto 1", "Ponto 2", ...]

Cada ponto deve ser uma frase concisa e informativa. Responda APENAS com o JSON.`;

    try {
      return await aiCompleteJSON<string[]>("show_notes", prompt);
    } catch {
      return [];
    }
  }

  /**
   * Get show notes for a project
   */
  async getShowNotes(projectId: string): Promise<ShowNote | null> {
    const [note] = await db
      .select()
      .from(showNotes)
      .where(eq(showNotes.projectId, projectId))
      .limit(1);

    return note || null;
  }

  /**
   * Update show notes manually
   */
  async updateShowNotes(
    projectId: string,
    updates: Partial<GeneratedShowNotes>
  ): Promise<ShowNote> {
    const [updated] = await db
      .update(showNotes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(showNotes.projectId, projectId))
      .returning();

    return updated;
  }

  /**
   * Export show notes as Markdown
   */
  exportMarkdown(note: ShowNote): string {
    let md = "";

    // Summary
    if (note.summary) {
      md += `## Resumo\n\n${note.summary}\n\n`;
    }

    // Chapters
    const chapters = note.chapters as ShowNotesChapter[] | null;
    if (chapters && chapters.length > 0) {
      md += `## Capitulos\n\n`;
      for (const chapter of chapters) {
        md += `- **${this.formatTimestamp(chapter.timestamp)}** - ${chapter.title}`;
        if (chapter.description) {
          md += `: ${chapter.description}`;
        }
        md += "\n";
      }
      md += "\n";
    }

    // Key Points
    const keyPoints = note.keyPoints as string[] | null;
    if (keyPoints && keyPoints.length > 0) {
      md += `## Pontos-Chave\n\n`;
      for (const point of keyPoints) {
        md += `- ${point}\n`;
      }
      md += "\n";
    }

    // Guest Info
    const guests = note.guestInfo as ShowNotesGuest[] | null;
    if (guests && guests.length > 0) {
      md += `## Convidados\n\n`;
      for (const guest of guests) {
        md += `### ${guest.name}`;
        if (guest.role) md += ` - ${guest.role}`;
        md += "\n";
        if (guest.bio) md += `${guest.bio}\n`;
        md += "\n";
      }
    }

    // Links
    const links = note.links as string[] | null;
    if (links && links.length > 0) {
      md += `## Links Mencionados\n\n`;
      for (const link of links) {
        md += `- ${link}\n`;
      }
    }

    return md;
  }

  /**
   * Export show notes as plain text
   */
  exportPlainText(note: ShowNote): string {
    let text = "";

    if (note.summary) {
      text += `RESUMO\n${"=".repeat(40)}\n${note.summary}\n\n`;
    }

    const chapters = note.chapters as ShowNotesChapter[] | null;
    if (chapters && chapters.length > 0) {
      text += `CAPITULOS\n${"=".repeat(40)}\n`;
      for (const chapter of chapters) {
        text += `${this.formatTimestamp(chapter.timestamp)} - ${chapter.title}\n`;
      }
      text += "\n";
    }

    const keyPoints = note.keyPoints as string[] | null;
    if (keyPoints && keyPoints.length > 0) {
      text += `PONTOS-CHAVE\n${"=".repeat(40)}\n`;
      for (const point of keyPoints) {
        text += `* ${point}\n`;
      }
    }

    return text;
  }
}

// Export singleton
export const showNotesService = new ShowNotesService();
