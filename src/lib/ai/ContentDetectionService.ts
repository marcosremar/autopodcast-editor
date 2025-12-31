import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import {
  contentTypeDetections,
  projects,
  templates,
  type ContentDetectionAnalysis,
  type SuggestedTemplate,
} from "@/lib/db/schema";
import { TemplateService } from "@/lib/templates/TemplateService";
import { aiCompleteJSON } from "@/lib/ai/AIService";

export interface ContentTypeResult {
  detectedType: "interview" | "monologue" | "debate" | "educational" | "review";
  confidence: number; // 0-1
  reasoning: string;
  characteristics: string[];
  speakers?: number;
  questionAnswerPatterns?: number;
  narrativeStructure?: "linear" | "episodic" | "conversational";
}

export class ContentDetectionService {
  constructor(private db: PostgresJsDatabase<any>) {
    // AIService é inicializado automaticamente via singleton
  }

  /**
   * Detect content type from transcription
   */
  async detectContentType(
    projectId: string,
    transcription: string
  ): Promise<ContentTypeResult> {
    // Truncate transcription if too long (keep first 3000 chars for analysis)
    const analysisText =
      transcription.length > 3000
        ? transcription.substring(0, 3000) + "..."
        : transcription;

    const prompt = `Analyze this podcast transcription and determine its content type.

Transcription:
"""
${analysisText}
"""

Classify it as ONE of these types:
1. **interview** - Conversation between host and guest(s), with questions and answers
2. **monologue** - Single person speaking, educational or storytelling
3. **debate** - Multiple people discussing/debating different viewpoints
4. **educational** - Teaching or explaining concepts (can be solo or with examples)
5. **review** - Analysis or critique of a product, service, media, etc.

Respond with ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "detectedType": "interview|monologue|debate|educational|review",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this type was chosen",
  "characteristics": ["list", "of", "key", "characteristics"],
  "speakers": 2,
  "questionAnswerPatterns": 15,
  "narrativeStructure": "linear|episodic|conversational"
}

Be precise and analytical. Confidence should reflect certainty (0-1).`;

    try {
      // Usar AIService centralizado
      const result = await aiCompleteJSON<ContentTypeResult>(
        "content_detection",
        prompt
      );

      // Validate result
      if (!result.detectedType || !result.confidence) {
        throw new Error("Invalid detection result format");
      }

      return result;
    } catch (error) {
      console.error("Error detecting content type:", error);
      // Fallback to monologue with low confidence
      return {
        detectedType: "monologue",
        confidence: 0.3,
        reasoning: "Detection failed, defaulting to monologue",
        characteristics: ["unable to analyze"],
      };
    }
  }

  /**
   * Suggest templates based on detected content type
   */
  async suggestTemplates(
    contentType: string,
    confidence: number
  ): Promise<SuggestedTemplate[]> {
    const templateService = new TemplateService(this.db);

    // Get templates matching the content type
    const matchingTemplates = await templateService.getTemplatesByCategory(
      contentType
    );

    // Get all templates with sections
    const suggestions: SuggestedTemplate[] = [];

    for (const template of matchingTemplates) {
      const templateWithSections =
        await templateService.getTemplateWithSections(template.id);
      if (templateWithSections) {
        suggestions.push({
          templateId: template.id,
          matchScore: confidence, // Use detection confidence as match score
          reason: `Detectamos que seu podcast é do tipo "${contentType}" com ${Math.round(confidence * 100)}% de confiança`,
        });
      }
    }

    // If no exact matches or low confidence, suggest popular alternatives
    if (suggestions.length === 0 || confidence < 0.6) {
      const fallbackTemplates = await templateService.getSystemTemplates();
      for (const template of fallbackTemplates.slice(0, 2)) {
        if (!suggestions.find((s) => s.templateId === template.id)) {
          suggestions.push({
            templateId: template.id,
            matchScore: 0.5,
            reason: "Template popular que pode funcionar para seu conteúdo",
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Detect and save content type for a project
   */
  async detectAndSave(
    projectId: string,
    transcription: string
  ): Promise<void> {
    // Detect content type
    const detection = await this.detectContentType(projectId, transcription);

    // Get suggested templates
    const suggestedTemplates = await this.suggestTemplates(
      detection.detectedType,
      detection.confidence
    );

    // Prepare analysis data
    const analysisData: ContentDetectionAnalysis = {
      speakers: detection.speakers,
      questionAnswerPatterns: detection.questionAnswerPatterns,
      narrativeStructure: detection.narrativeStructure,
      characteristics: detection.characteristics,
    };

    // Save detection to database
    await this.db.insert(contentTypeDetections).values({
      projectId,
      detectedType: detection.detectedType,
      confidence: detection.confidence,
      reasoning: detection.reasoning,
      suggestedTemplates: suggestedTemplates as any,
      analysisData: analysisData as any,
    });

    // Update project with content type
    await this.db
      .update(projects)
      .set({
        contentType: detection.detectedType,
        detectionStatus: "detected",
        structuralAnalysis: analysisData as any,
      })
      .where(eq(projects.id, projectId));

    console.log(
      `[ContentDetection] Project ${projectId}: ${detection.detectedType} (${Math.round(detection.confidence * 100)}%)`
    );
  }

  /**
   * Get latest detection for a project
   */
  async getLatestDetection(projectId: string) {
    const [detection] = await this.db
      .select()
      .from(contentTypeDetections)
      .where(eq(contentTypeDetections.projectId, projectId))
      .orderBy(contentTypeDetections.createdAt)
      .limit(1);

    return detection || null;
  }
}
