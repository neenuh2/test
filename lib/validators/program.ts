import { z } from "zod";
import {
  checkbox,
  dateFromInput,
  nullableString,
  optionalFloat,
  optionalInt,
} from "@/lib/validators/common";

export const programStatusEnum = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);

export const programSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(32),
  name: z.string().trim().min(1, "Name is required").max(200),
  focus: nullableString,
  targetAudience: nullableString,
  totalTrainingDays: z.coerce
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .default(0),
  description: nullableString,
  status: programStatusEnum.default("DRAFT"),
});
export type ProgramInput = z.infer<typeof programSchema>;

export const moduleSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: nullableString,
  // Comma/multi-select of cohort ids. Empty = applies to all cohorts.
  cohortIds: z.array(z.string()).default([]),
});
export type ModuleInput = z.infer<typeof moduleSchema>;

export const deliverableSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: nullableString,
  moduleId: z
    .preprocess((v) => (v === "" || v == null ? null : v), z.string().nullable()),
  dueOffsetDays: optionalInt,
  weight: optionalFloat,
  isRequired: checkbox.default(true),
});
export type DeliverableInput = z.infer<typeof deliverableSchema>;

/** A per-run due date override for a deliverable. */
export const deliverableDueDateSchema = z.object({
  deliverableId: z.string().min(1),
  programRunId: z.string().min(1),
  dueDate: dateFromInput,
});
export type DeliverableDueDateInput = z.infer<typeof deliverableDueDateSchema>;
