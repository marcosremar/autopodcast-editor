ALTER TABLE "projects" ADD COLUMN "diarization" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "speakers" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "speaker_stats" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "topics" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "topics_summary" text;--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "speaker" varchar(100);--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "speaker_label" varchar(255);--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "topic_id" integer;