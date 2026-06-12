import { pgEnum } from "drizzle-orm/pg-core";

// ── Field types ──────────────────────────────────────────────

export const FIELD_TYPES = [
  "text",
  "number",
  "select",
  "multiselect",
  "reference",
  "date",
  "boolean",
  "json",
  "password",
  "email",
] as const;
export const fieldTypeEnum = pgEnum("field_type", FIELD_TYPES);
export type TFieldType = (typeof FIELD_TYPES)[number];

// ── Permission scopes ────────────────────────────────────────

export const SCOPES = ["own", "tenant", "all"] as const;
export const scopeEnum = pgEnum("scope", SCOPES);
export type TScope = (typeof SCOPES)[number];
