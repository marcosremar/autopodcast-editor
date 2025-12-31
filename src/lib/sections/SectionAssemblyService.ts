import { eq, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  projectSections,
  templateSections,
  segments,
  sectionSegments,
  type ProjectSection,
  type TemplateSection,
  type Segment,
} from "@/lib/db/schema";

export interface MissingSectionInfo {
  templateSection: TemplateSection;
  isRequired: boolean;
  suggestedDuration: number;
  exampleText?: string;
}

export class SectionAssemblyService {
  constructor(private db: PostgresJsDatabase<any>) {}

  /**
   * Initialize project sections from template
   * (This is already done in select-template endpoint, but keeping for reference)
   */
  async initializeProjectSections(
    projectId: string,
    templateId: string
  ): Promise<ProjectSection[]> {
    // Get template sections
    const templateSectionsData = await this.db
      .select()
      .from(templateSections)
      .where(eq(templateSections.templateId, templateId))
      .orderBy(templateSections.order);

    // Create project sections
    const createdSections: ProjectSection[] = [];

    for (const section of templateSectionsData) {
      const [projectSection] = await this.db
        .insert(projectSections)
        .values({
          projectId,
          templateSectionId: section.id,
          name: section.name,
          order: section.order,
          status: "pending",
        })
        .returning();

      createdSections.push(projectSection);
    }

    return createdSections;
  }

  /**
   * Get missing sections (sections with status 'pending' or no audio)
   */
  async getMissingSections(
    projectId: string
  ): Promise<MissingSectionInfo[]> {
    // Get all project sections with their template details
    const sections = await this.db
      .select({
        projectSection: projectSections,
        templateSection: templateSections,
      })
      .from(projectSections)
      .leftJoin(
        templateSections,
        eq(projectSections.templateSectionId, templateSections.id)
      )
      .where(eq(projectSections.projectId, projectId))
      .orderBy(projectSections.order);

    // Filter for missing sections (no audio or pending status)
    const missingSections: MissingSectionInfo[] = [];

    for (const { projectSection, templateSection } of sections) {
      if (!templateSection) continue;

      const isMissing =
        !projectSection.audioUrl ||
        projectSection.status === "pending" ||
        projectSection.status === "blocked";

      if (isMissing) {
        missingSections.push({
          templateSection,
          isRequired: templateSection.isRequired || false,
          suggestedDuration: templateSection.suggestedDuration || 60,
          exampleText: templateSection.exampleText || undefined,
        });
      }
    }

    return missingSections;
  }

  /**
   * Get all project sections with template details
   */
  async getProjectSectionsWithDetails(projectId: string) {
    const sections = await this.db
      .select({
        id: projectSections.id,
        projectId: projectSections.projectId,
        templateSectionId: projectSections.templateSectionId,
        name: projectSections.name,
        order: projectSections.order,
        status: projectSections.status,
        audioUrl: projectSections.audioUrl,
        transcription: projectSections.transcription,
        duration: projectSections.duration,
        uploadedAt: projectSections.uploadedAt,
        approvedAt: projectSections.approvedAt,
        notes: projectSections.notes,
        templateSection: {
          id: templateSections.id,
          name: templateSections.name,
          description: templateSections.description,
          isRequired: templateSections.isRequired,
          type: templateSections.type,
          minDuration: templateSections.minDuration,
          maxDuration: templateSections.maxDuration,
          suggestedDuration: templateSections.suggestedDuration,
          exampleText: templateSections.exampleText,
          icon: templateSections.icon,
          color: templateSections.color,
        },
      })
      .from(projectSections)
      .leftJoin(
        templateSections,
        eq(projectSections.templateSectionId, templateSections.id)
      )
      .where(eq(projectSections.projectId, projectId))
      .orderBy(projectSections.order);

    return sections;
  }

  /**
   * Auto-assign existing segments to sections based on AI detection
   * (Simplified version for now - can be enhanced with actual AI matching)
   */
  async autoAssignSegmentsToSections(
    projectId: string,
    segmentIds: string[],
    sectionId: string
  ): Promise<void> {
    // Get existing assignments for this section
    const existingAssignments = await this.db
      .select()
      .from(sectionSegments)
      .where(eq(sectionSegments.sectionId, sectionId));

    const maxOrder = existingAssignments.length;

    // Assign segments in order
    for (let i = 0; i < segmentIds.length; i++) {
      await this.db.insert(sectionSegments).values({
        sectionId,
        segmentId: segmentIds[i],
        order: maxOrder + i,
      });
    }
  }

  /**
   * Get segments assigned to a section
   */
  async getSectionSegments(sectionId: string): Promise<Segment[]> {
    const assignments = await this.db
      .select({
        segment: segments,
        order: sectionSegments.order,
      })
      .from(sectionSegments)
      .innerJoin(segments, eq(sectionSegments.segmentId, segments.id))
      .where(eq(sectionSegments.sectionId, sectionId))
      .orderBy(sectionSegments.order);

    return assignments.map((a) => a.segment);
  }

  /**
   * Update section status
   */
  async updateSectionStatus(
    sectionId: string,
    status: string,
    additionalData?: Partial<{
      audioUrl: string;
      transcription: string;
      duration: number;
      notes: string;
    }>
  ): Promise<ProjectSection> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (additionalData) {
      if (additionalData.audioUrl) {
        updateData.audioUrl = additionalData.audioUrl;
        updateData.uploadedAt = new Date();
      }
      if (additionalData.transcription)
        updateData.transcription = additionalData.transcription;
      if (additionalData.duration) updateData.duration = additionalData.duration;
      if (additionalData.notes) updateData.notes = additionalData.notes;
    }

    const [updated] = await this.db
      .update(projectSections)
      .set(updateData)
      .where(eq(projectSections.id, sectionId))
      .returning();

    return updated;
  }

  /**
   * Get section completion statistics
   */
  async getSectionCompletionStats(projectId: string) {
    const sections = await this.db
      .select({
        status: projectSections.status,
        isRequired: templateSections.isRequired,
      })
      .from(projectSections)
      .leftJoin(
        templateSections,
        eq(projectSections.templateSectionId, templateSections.id)
      )
      .where(eq(projectSections.projectId, projectId));

    const total = sections.length;
    const approved = sections.filter((s) => s.status === "approved").length;
    const pending = sections.filter((s) => s.status === "pending").length;
    const required = sections.filter((s) => s.isRequired).length;
    const requiredApproved = sections.filter(
      (s) => s.isRequired && s.status === "approved"
    ).length;

    return {
      total,
      approved,
      pending,
      required,
      requiredApproved,
      percentComplete: total > 0 ? Math.round((approved / total) * 100) : 0,
      isReadyForExport: requiredApproved === required,
    };
  }
}
