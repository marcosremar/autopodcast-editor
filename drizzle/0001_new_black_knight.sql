CREATE TABLE "content_type_detections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"detected_type" varchar(100) NOT NULL,
	"confidence" real NOT NULL,
	"reasoning" text,
	"suggested_templates" jsonb,
	"analysis_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"template_section_id" uuid,
	"name" varchar(255) NOT NULL,
	"order" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"audio_url" text,
	"transcription" text,
	"duration" integer,
	"uploaded_at" timestamp,
	"approved_at" timestamp,
	"approved_by" uuid,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"selected_at" timestamp DEFAULT now(),
	"auto_detected" boolean DEFAULT false,
	"detection_confidence" real
);
--> statement-breakpoint
CREATE TABLE "section_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"segment_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"start_offset" real,
	"end_offset" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"is_required" boolean DEFAULT true,
	"min_duration" integer,
	"max_duration" integer,
	"suggested_duration" integer,
	"type" varchar(100) NOT NULL,
	"ai_prompt" text,
	"editing_rules" jsonb,
	"example_text" text,
	"icon" varchar(50),
	"color" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"is_system" boolean DEFAULT false,
	"user_id" uuid,
	"thumbnail_url" text,
	"estimated_duration" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "current_template_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "content_type" varchar(100);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "detection_status" varchar(50);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "structural_analysis" jsonb;--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "detected_section_type" varchar(100);--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "section_match_score" real;--> statement-breakpoint
ALTER TABLE "content_type_detections" ADD CONSTRAINT "content_type_detections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sections" ADD CONSTRAINT "project_sections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sections" ADD CONSTRAINT "project_sections_template_section_id_template_sections_id_fk" FOREIGN KEY ("template_section_id") REFERENCES "public"."template_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sections" ADD CONSTRAINT "project_sections_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_templates" ADD CONSTRAINT "project_templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_templates" ADD CONSTRAINT "project_templates_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_segments" ADD CONSTRAINT "section_segments_section_id_project_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."project_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_segments" ADD CONSTRAINT "section_segments_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_sections" ADD CONSTRAINT "template_sections_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;