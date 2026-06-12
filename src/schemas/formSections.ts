import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	json,
	pgTable,
	text,
	varchar,
} from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";
import { formElements } from "./formElements";
import { forms } from "./forms";

export const formSections = pgTable("form_sections", {
	...ids,
	...timestamps,

	// Reference to parent form
	formId: varchar("form_id", { length: 24 })
		.notNull()
		.references(() => forms.id, { onDelete: "cascade" }),

	// Section identification
	name: varchar("name", { length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 255 }).notNull(),
	description: text("description"),

	// UI properties
	collapsible: boolean("collapsible").default(false),
	collapsedByDefault: boolean("collapsed_by_default").default(false),

	// Display order within form
	displayOrder: integer("display_order").default(0),

	// Tenant isolation (null for global/system sections)
	tenantId: varchar("tenant_id", { length: 24 }),

	// Status
	isActive: boolean("is_active").default(true),

	// Additional metadata
	meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const formSectionsRelations = relations(
	formSections,
	({ one, many }) => ({
		form: one(forms, {
			fields: [formSections.formId],
			references: [forms.id],
		}),
		elements: many(formElements),
	}),
);
