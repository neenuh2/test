import { z } from "zod";
import { dateFromInput, nullableString } from "@/lib/validators/common";

export const runStatusEnum = z.enum([
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

export const programRunSchema = z
  .object({
    programId: z.string().min(1, "Program is required"),
    name: z.string().trim().min(1, "Name is required").max(200),
    startDate: dateFromInput,
    endDate: dateFromInput,
    status: runStatusEnum.default("PLANNED"),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });
export type ProgramRunInput = z.infer<typeof programRunSchema>;

export const deliveryModeEnum = z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]);

// HH:mm 24-hour time, optional.
const timeString = z
  .preprocess(
    (v) => (v === "" || v == null ? null : v),
    z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24-hour)")
      .nullable()
  )
  .nullable();

export const sessionSchema = z.object({
  moduleId: z.string().min(1, "Module is required"),
  sessionDate: dateFromInput,
  startTime: timeString,
  endTime: timeString,
  location: nullableString,
  mode: deliveryModeEnum.default("IN_PERSON"),
  trainerName: nullableString,
});
export type SessionInput = z.infer<typeof sessionSchema>;
