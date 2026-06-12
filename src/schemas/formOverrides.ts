import { relations } from "drizzle-orm";
import { json, pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { forms } from "./forms";

export const formOverrides = pgTable(
	"form_overrides",
	{
		...ids,
		...timestamps,

		// ── Which form and tenant ──
		formId: varchar("form_id", { length: 24 })
			.notNull()
			.references(() => forms.id, { onDelete: "cascade" }),
		tenantId: varchar("tenant_id", { length: 24 })
			.notNull()
			,

		// ── Overridable fields (null = use base form value) ──
		displayName: varchar("display_name", { length: 255 }),
		description: text("description"),

		// Full replacement of actions array
		// null = use base form actions
		actions:
			json("actions").$type<
				Array<{
					type: "submit" | "cancel" | "custom";
					label: string;
					endpoint?: string;
					method?: "POST" | "PUT" | "PATCH";
					successMessage?: string;
					redirect?: string;
					icon?: string;
					action?: string;
					confirm?: { title: string; message: string };
				}>
			>(),

		// Settings override
		settings: json("settings").$type<{
			validateOnBlur?: boolean;
			validateOnChange?: boolean;
			confirmOnLeave?: boolean;
			autoSave?: boolean;
			autoSaveInterval?: number;
		}>(),

		// Metadata
		meta: json("meta").$type<Record<string, unknown> | null>(),
	},
	(table) => ({
		// One override per form per tenant
		uniqueOverride: uniqueIndex("uq_form_override").on(
			table.formId,
			table.tenantId,
		),
	}),
);

export const formOverridesRelations = relations(formOverrides, ({ one }) => ({
	form: one(forms, {
		fields: [formOverrides.formId],
		references: [forms.id],
	}),
}));
