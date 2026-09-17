import { z } from "zod";
import { checkbox, nullableString } from "@/lib/validators/common";

export const participantSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required").max(64),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  cohortId: z.string().min(1, "Cohort is required"),
  branch: nullableString,
  region: nullableString,
  isActive: checkbox.default(true),
});
export type ParticipantInput = z.infer<typeof participantSchema>;

export const completionStatusEnum = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
  "DROPPED",
]);

/** Enroll one or more participants into a run. */
export const enrollSchema = z.object({
  programRunId: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(1, "Select at least one participant"),
});
export type EnrollInput = z.infer<typeof enrollSchema>;
