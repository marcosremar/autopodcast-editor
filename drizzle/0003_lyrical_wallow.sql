CREATE TABLE "audio_enhancements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"enhancement_type" varchar(50) NOT NULL,
	"settings" jsonb NOT NULL,
	"is_applied" boolean DEFAULT false,
	"preview_url" text,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "filler_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" uuid,
	"project_id" uuid,
	"word" text NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"confidence" real,
	"is_removed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "show_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"summary" text,
	"chapters" jsonb,
	"key_points" jsonb,
	"guest_info" jsonb,
	"links" jsonb,
	"generated_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "show_notes_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "social_clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"segment_ids" jsonb NOT NULL,
	"title" varchar(255),
	"description" text,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"duration" integer NOT NULL,
	"format" varchar(50) DEFAULT '9:16',
	"hook_score" integer,
	"viral_potential" integer,
	"status" varchar(50) DEFAULT 'pending',
	"clip_url" text,
	"thumbnail_url" text,
	"captions_enabled" boolean DEFAULT true,
	"caption_style" varchar(50) DEFAULT 'animated',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "audio_enhanced" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "enhancement_settings" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "enhanced_audio_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "filler_words_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "filler_words_removed" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "word_timestamps" jsonb;--> statement-breakpoint
ALTER TABLE "audio_enhancements" ADD CONSTRAINT "audio_enhancements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filler_words" ADD CONSTRAINT "filler_words_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filler_words" ADD CONSTRAINT "filler_words_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_notes" ADD CONSTRAINT "show_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_clips" ADD CONSTRAINT "social_clips_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;