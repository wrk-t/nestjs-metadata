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
import { fieldOverrides } from "./fieldOverrides";
import { formElements } from "./formElements";
import { formOverrides } from "./formOverrides";
import { formSections } from "./formSections";
import { sectionOverrides } from "./sectionOverrides";

export const forms = pgTable("forms", {
	...ids,
	...timestamps,

	// Basic form information
	name: varchar("name", { length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 255 }).notNull(),
	description: text("description"),

	// Version for optimistic concurrency and schema evolution
	version: integer("version").default(1).notNull(),

	// Data sources for the form (optional)
	dataSource:
		json("data_source").$type<
			Array<{
				type: "service";
				name: string;
				endpoint: string;
				params?: Record<string, string>;
				dependsOn?: string;
			}>
		>(),

	// Actions — typed action system (both new "action" and legacy "type" discriminants)
	actions: json("actions")
		.$type<
			Array<
				| {
						action: "apiCall";
						label: string;
						endpoint: string;
						method: "POST" | "PUT" | "PATCH";
						context?: "create" | "edit";
						visibleIn?: ("page" | "dialog")[];
						onSuccess?: "closeDialog" | "redirect";
						successRedirect?: string;
						successMessage?: string;
						confirm?: { title: string; message: string };
				  }
				| {
						action: "navigate";
						label: string;
						path: string;
						context?: "create" | "edit";
						visibleIn?: ("page" | "dialog")[];
				  }
				| {
						action: "cancel";
						label: string;
						context?: "create" | "edit";
						visibleIn?: ("page" | "dialog")[];
				  }
				| {
						action: "link";
						label: string;
						path: string;
						context?: "create" | "edit";
						visibleIn?: ("page" | "dialog")[];
				  }
				| {
						action: "custom";
						label: string;
						context?: "create" | "edit";
						visibleIn?: ("page" | "dialog")[];
				  }
				// ── Legacy type-based variants (pre-refactor) ──
				| {
						type: "submit";
						label: string;
						endpoint: string;
						method: "POST" | "PUT" | "PATCH";
						context?: "create" | "edit";
						successMessage?: string;
						redirect?: string;
				  }
				| {
						type: "cancel";
						label: string;
						redirect?: string;
						context?: "create" | "edit";
				  }
			>
		>()
		.notNull(),

	// Settings configuration
	settings: json("settings")
		.$type<{
			validateOnBlur: boolean;
			validateOnChange: boolean;
			confirmOnLeave: boolean;
			autoSave?: boolean;
			autoSaveInterval?: number;
		}>()
		.notNull(),

	// Tenant isolation (null for global/system forms)
	tenantId: varchar("tenant_id", { length: 24 }),

	// Status and categorization
	isActive: boolean("is_active").default(true).notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	category: varchar("category", { length: 100 }),

	// Additional metadata
	meta: json("meta").$type<Record<string, unknown> | null>(),
});

export const formsRelations = relations(forms, ({ many }) => ({
	sections: many(formSections),
	elements: many(formElements),
	formOverrides: many(formOverrides),
	sectionOverrides: many(sectionOverrides),
	fieldOverrides: many(fieldOverrides),
}));
