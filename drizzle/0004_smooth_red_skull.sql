ALTER TABLE "projects" ADD COLUMN "waveform_peaks" jsonb;--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "edited_text" text;--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "text_cuts" jsonb;