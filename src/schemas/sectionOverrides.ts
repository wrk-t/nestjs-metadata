import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	json,
	pgTable,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { forms } from "./forms";

export const sectionOverrides = pgTable(
	"section_overrides",
	{
		...ids,
		...timestamps,

		// ── What this override targets ──
		sectionId: varchar("section_id", { length: 24 }).notNull(),
		formId: varchar("form_id", { length: 24 }).notNull(),

		// ── Who owns this override ──
		tenantId: varchar("tenant_id", { length: 24 })
			.notNull()
			,

		// ── Overridable fields ──
		displayName: varchar("display_name", { length: 255 }),
		description: text("description"),
		displayOrder: integer("display_order"),
		collapsible: boolean("collapsible"),
		collapsedByDefault: boolean("collapsed_by_default"),

		// ── Hide the entire section ──
		isHidden: boolean("is_hidden"),

		// ── Metadata ──
		meta: json("meta").$type<Record<string, unknown> | null>(),
	},
	(table) => ({
		// A tenant can only override a section once
		uniqueOverride: uniqueIndex("uq_section_override").on(
			table.sectionId,
			table.tenantId,
		),
	}),
);

export const sectionOverridesRelations = relations(
	sectionOverrides,
	({ one }) => ({
		form: one(forms, {
			fields: [sectionOverrides.formId],
			references: [forms.id],
		}),
	}),
);
