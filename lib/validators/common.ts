import { z } from "zod";

/** Treat "" (from empty form fields) as undefined. */
export const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);

/** Optional trimmed string; "" becomes undefined. */
export const optionalString = emptyToUndefined(z.string().trim().min(1)).optional();

/** Optional string that becomes null (for nullable DB columns). */
export const nullableString = z
  .preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.string().trim())
  .nullable();

/** A required date parsed from an ISO/`yyyy-mm-dd` string. */
export const dateFromInput = z.coerce.date({ invalid_type_error: "Enter a valid date" });

/** Optional date; "" becomes null. */
export const optionalDate = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.date().nullable()
);

/** Optional integer from a form string; "" becomes null. */
export const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.number().int().nullable()
);

/** Optional float from a form string; "" becomes null. */
export const optionalFloat = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.number().nullable()
);

/** Checkbox → boolean ("on"/"true"/true → true). */
export const checkbox = z.preprocess(
  (v) => v === "on" || v === "true" || v === true,
  z.boolean()
);
