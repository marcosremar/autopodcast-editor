import { eq, and, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  templates,
  templateSections,
  contentTypeDetections,
  type Template,
  type TemplateSection,
  type ContentTypeDetection,
} from "../db/schema";

export interface TemplateWithSections extends Template {
  sections: TemplateSection[];
}

export interface TemplateSuggestion {
  template: TemplateWithSections;
  matchScore: number;
  reason: string;
}

export interface TemplateFilters {
  category?: string;
  isSystem?: boolean;
  userId?: string;
}

export class TemplateService {
  constructor(private db: PostgresJsDatabase<any>) {}

  /**
   * List all templates with optional filters
   */
  async listTemplates(filters: TemplateFilters = {}): Promise<Template[]> {
    const conditions = [];

    if (filters.category) {
      conditions.push(eq(templates.category, filters.category));
    }

    if (filters.isSystem !== undefined) {
      conditions.push(eq(templates.isSystem, filters.isSystem));
    }

    if (filters.userId) {
      // Show system templates + user's custom templates
      conditions.push(
        or(eq(templates.isSystem, true), eq(templates.userId, filters.userId))!
      );
    } else {
      // Only show system templates if no userId
      conditions.push(eq(templates.isSystem, true));
    }

    const result = await this.db
      .select()
      .from(templates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(templates.createdAt);

    return result;
  }

  /**
   * Get a template with all its sections
   */
  async getTemplateWithSections(
    templateId: string
  ): Promise<TemplateWithSections | null> {
    // Get template
    const [template] = await this.db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (!template) {
      return null;
    }

    // Get sections
    const sections = await this.db
      .select()
      .from(templateSections)
      .where(eq(templateSections.templateId, templateId))
      .orderBy(templateSections.order);

    return {
      ...template,
      sections,
    };
  }

  /**
   * Create a custom template
   */
  async createCustomTemplate(
    userId: string,
    data: {
      name: string;
      description?: string;
      category: string;
      thumbnailUrl?: string;
      estimatedDuration?: number;
      metadata?: any;
    }
  ): Promise<Template> {
    const [newTemplate] = await this.db
      .insert(templates)
      .values({
        ...data,
        userId,
        isSystem: false,
      })
      .returning();

    return newTemplate;
  }

  /**
   * Get suggested templates for a project based on content type detection
   */
  async getSuggestedTemplatesForProject(
    projectId: string
  ): Promise<TemplateSuggestion[]> {
    // Get the latest content type detection for this project
    const [detection] = await this.db
      .select()
      .from(contentTypeDetections)
      .where(eq(contentTypeDetections.projectId, projectId))
      .orderBy(sql`${contentTypeDetections.createdAt} DESC`)
      .limit(1);

    if (!detection) {
      // No detection found, return empty array
      return [];
    }

    // Get suggested template IDs from detection
    const suggestedTemplateData = detection.suggestedTemplates as any;
    if (!suggestedTemplateData || !Array.isArray(suggestedTemplateData)) {
      return [];
    }

    // Fetch templates with sections
    const suggestions: TemplateSuggestion[] = [];

    for (const suggestion of suggestedTemplateData) {
      const template = await this.getTemplateWithSections(suggestion.templateId);
      if (template) {
        suggestions.push({
          template,
          matchScore: suggestion.matchScore,
          reason: suggestion.reason,
        });
      }
    }

    // Sort by match score descending
    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    return suggestions;
  }

  /**
   * Get all system templates
   */
  async getSystemTemplates(): Promise<Template[]> {
    return this.listTemplates({ isSystem: true });
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<Template[]> {
    return this.listTemplates({ category });
  }

  /**
   * Create a template section
   */
  async createTemplateSection(data: {
    templateId: string;
    name: string;
    description?: string;
    order: number;
    isRequired?: boolean;
    minDuration?: number;
    maxDuration?: number;
    suggestedDuration?: number;
    type: string;
    aiPrompt?: string;
    editingRules?: any;
    exampleText?: string;
    icon?: string;
    color?: string;
  }): Promise<TemplateSection> {
    const [section] = await this.db
      .insert(templateSections)
      .values(data)
      .returning();

    return section;
  }

  /**
   * Delete a template section
   */
  async deleteTemplateSection(sectionId: string): Promise<void> {
    await this.db
      .delete(templateSections)
      .where(eq(templateSections.id, sectionId));
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    data: Partial<{
      name: string;
      description: string;
      thumbnailUrl: string;
      estimatedDuration: number;
      metadata: any;
    }>
  ): Promise<Template> {
    const [updated] = await this.db
      .update(templates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId))
      .returning();

    return updated;
  }

  /**
   * Delete a template (only custom templates, not system)
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    // Only allow deletion of user's custom templates
    await this.db
      .delete(templates)
      .where(
        and(
          eq(templates.id, templateId),
          eq(templates.userId, userId),
          eq(templates.isSystem, false)
        )
      );
  }
}
