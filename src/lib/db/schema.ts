import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// Waitlist for landing page
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  plan: varchar("plan", { length: 50 }).default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects (podcast episodes being edited)
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }),
  status: varchar("status", { length: 50 }).default("uploading"),
  originalAudioUrl: text("original_audio_url"),
  originalDuration: integer("original_duration"), // seconds
  targetDuration: integer("target_duration"), // seconds
  editedAudioUrl: text("edited_audio_url"),
  transcription: text("transcription"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Segments (chunks of audio with analysis)
export const segments = pgTable("segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  text: text("text").notNull(),
  interestScore: integer("interest_score"),
  clarityScore: integer("clarity_score"),
  topic: varchar("topic", { length: 255 }),
  keyInsight: text("key_insight"),
  isSelected: boolean("is_selected").default(false),
  order: integer("order"),
  analysis: jsonb("analysis"), // Full analysis JSON
  hasError: boolean("has_error").default(false),
  errorType: varchar("error_type", { length: 50 }),
  errorDetail: text("error_detail"),
  rerecordedAudioUrl: text("rerecorded_audio_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Types for TypeScript
export type Waitlist = typeof waitlist.$inferSelect;
export type NewWaitlist = typeof waitlist.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Segment = typeof segments.$inferSelect;
export type NewSegment = typeof segments.$inferInsert;

// Analysis type (stored in segments.analysis)
export interface SegmentAnalysis {
  topic: string;
  interestScore: number;
  clarityScore: number;
  isTangent: boolean;
  isRepetition: boolean;
  keyInsight: string;
  dependsOn: string[];
  standalone: boolean;
  hasFactualError: boolean;
  factualErrorDetail?: string;
  hasContradiction: boolean;
  contradictionDetail?: string;
  isConfusing: boolean;
  confusingDetail?: string;
  isIncomplete: boolean;
  incompleteDetail?: string;
  needsRerecord: boolean;
  rerecordSuggestion?: string;
}
