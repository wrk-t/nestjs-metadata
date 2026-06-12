import type { FIELD_TYPES } from "../helpers/enums";
import { uiComponents } from "../schemas";
import { fieldDefinitions } from "../schemas";
import { fieldOverrides } from "../schemas";
import { formElements } from "../schemas";
import { formOverrides } from "../schemas";
import { formSections } from "../schemas";
import { forms } from "../schemas";
import { sectionOverrides } from "../schemas";
import type {
	ICompoundCondition,
	ISimpleCondition,
} from "../types/conditions";

export type { ICompoundCondition, ISimpleCondition };

export type FieldType = (typeof FIELD_TYPES)[number];

export interface UiComponent {
	name: string;
	displayName: string | null;
	componentType: string;
	configProps: Record<string, unknown>;
}

export interface SelectOption {
	label: string;
	value: unknown;
	disabled?: boolean;
}

export type ValidationRule =
	| ["Required"]
	| ["IsString"]
	| ["IsNumber"]
	| ["IsBoolean"]
	| ["IsDate"]
	| ["IsEmail"]
	| ["IsUrl"]
	| ["MinLength", number]
	| ["MaxLength", number]
	| ["Min", number]
	| ["Max", number]
	| ["Pattern", string]
	| ["Unique"]
	| ["Custom", string];

export type FieldDatasource =
	| {
			type: "service";
			endpoint: string;
			method: "GET" | "POST";
			params?: Record<string, unknown>;
			dependsOn?: string[];
			transform?: string;
	  }
	| {
			type: "function";
			module: string;
			function: string;
			params?: unknown[];
			dependsOn?: string[];
	  }
	| {
			type: "static";
			options: SelectOption[];
	  }
	| {
			type: "sql";
			query: string;
			connection?: string;
			dependsOn?: string[];
	  }
	| {
			type: "entity";
			entity: string;
			displayField: string;
			valueField?: string;
			searchFields?: string[];
			filter?: { field: string; value: unknown };
			orderBy?: { field: string; direction: "asc" | "desc" };
			dependsOn?: string[];
	  };

export interface FieldOverrides {
	displayName?: string;
	description?: string;
	validations?: ValidationRule[] | null;
	datasource?: FieldDatasource | null;
	defaultValue?: unknown;
	isRequired?: boolean;
	isUnique?: boolean;
}

// ── Shared base — no fieldOverrides or uiOverrides, each variant declares them ──

export interface FieldBase {
	id: string;
	formId: string;
	name: string;
	label: string;
	isRequired: boolean;
	isReadOnly: boolean;
	isActive: boolean;
	order: number;
	colSpan?: number;
	sectionId: string | null;
	dependsOn?: string[];
	visibleWhen?: Array<ISimpleCondition | ICompoundCondition>;
	disabledWhen?: Array<ISimpleCondition | ICompoundCondition>;
	instanceConfig?: unknown;
	fieldDefinitionId: string | null;
	uiComponentId: string | null;
	uiComponent?: UiComponent | null;
	tenantId: string | null;
	meta?: Record<string, unknown> | null;
}

// ── Layout — shared across all variants ──

interface FieldLayout {
	colSpan?: number;
	rowSpan?: number;
	className?: string;
	style?: Record<string, string>;
}

// ── Discriminated variants — each has typed fieldOverrides and uiOverrides ──

export interface TextField extends FieldBase {
	type: "text";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			defaultValue?: string;
			maxLength?: number;
			minLength?: number;
			pattern?: string;
			prefixIcon?: string;
			suffixIcon?: string;
			autoComplete?: string;
		};
	};
}

export interface TextareaField extends FieldBase {
	type: "textarea";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			defaultValue?: string;
			maxLength?: number;
			rows?: number;
		};
	};
}

export interface NumberField extends FieldBase {
	type: "number";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			defaultValue?: number;
			min?: number;
			max?: number;
			step?: number;
			prefixIcon?: string;
			suffixIcon?: string;
		};
	};
}

export interface EmailField extends FieldBase {
	type: "email";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			defaultValue?: string;
			autoComplete?: string;
		};
	};
}

export interface PasswordField extends FieldBase {
	type: "password";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			autoComplete?: string;
		};
	};
}

export interface SelectField extends FieldBase {
	type: "select";
	fieldOverrides?: FieldOverrides | null;
	options: SelectOption[];
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			defaultValue?: string;
		};
	};
}

export interface MultiselectField extends FieldBase {
	type: "multiselect";
	fieldOverrides?: FieldOverrides | null;
	options: SelectOption[];
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			defaultValue?: string[];
		};
	};
}

export interface RadioField extends FieldBase {
	type: "radio";
	fieldOverrides?: FieldOverrides | null;
	options: SelectOption[];
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: Record<string, never>;
	};
}

export interface CheckboxField extends FieldBase {
	type: "checkbox";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: { defaultValue?: boolean };
	};
}

export interface SwitchField extends FieldBase {
	type: "switch";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: { defaultValue?: boolean };
	};
}

export interface DateField extends FieldBase {
	type: "date";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			defaultValue?: string;
			min?: string;
			max?: string;
		};
	};
}

export interface DateTimeField extends FieldBase {
	type: "datetime";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			defaultValue?: string;
			min?: string;
			max?: string;
		};
	};
}

export interface TimeField extends FieldBase {
	type: "time";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			defaultValue?: string;
			min?: string;
			max?: string;
		};
	};
}

export interface FileField extends FieldBase {
	type: "file";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			accept?: string;
			multiple?: boolean;
			maxSize?: number;
		};
	};
}

export interface ImageField extends FieldBase {
	type: "image";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			accept?: string;
			multiple?: boolean;
			maxSize?: number;
		};
	};
}

export interface RichtextField extends FieldBase {
	type: "richtext";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			defaultValue?: string;
			maxLength?: number;
		};
	};
}

export interface JsonField extends FieldBase {
	type: "json";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: { defaultValue?: Record<string, unknown> };
	};
}

export interface ReferenceField extends FieldBase {
	type: "reference";
	fieldOverrides?: FieldOverrides | null;
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			displayField?: string;
			endpoint?: string;
		};
	};
}

export interface AutocompleteField extends FieldBase {
	type: "autocomplete";
	fieldOverrides?: FieldOverrides | null;
	options: SelectOption[];
	uiOverrides: {
		layout?: FieldLayout;
		behavior?: {
			placeholder?: string;
			debounce?: number;
			minChars?: number;
		};
	};
}

// ── The full discriminated union ──

export type RenderField =
	| TextField
	| TextareaField
	| NumberField
	| EmailField
	| PasswordField
	| SelectField
	| MultiselectField
	| RadioField
	| CheckboxField
	| SwitchField
	| DateField
	| DateTimeField
	| TimeField
	| FileField
	| ImageField
	| RichtextField
	| JsonField
	| ReferenceField
	| AutocompleteField;

// ── Render response types ──

export interface IFormRenderSection {
	id: string;
	name: string;
	displayName: string;
	description?: string | null;
	collapsible: boolean;
	collapsedByDefault: boolean;
	displayOrder: number;
	fields: RenderField[];
}

export interface IFormRenderForm {
	id: string;
	name: string;
	displayName: string;
	description?: string | null;
	version: number;
	renderContext: "create" | "edit" | "view";
	actions: Array<
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
	>;
	settings: {
		validateOnBlur: boolean;
		validateOnChange: boolean;
		confirmOnLeave: boolean;
		autoSave?: boolean;
		autoSaveInterval?: number;
		readonly?: boolean;
	};
	category?: string | null;
	isActive: boolean;
	isSystem: boolean;
	tenantId?: string | null;
	dataSource?: unknown;
	meta?: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
	deletedAt?: string | null;
}

export interface IFormRenderResponse {
	form: IFormRenderForm;
	sections: IFormRenderSection[];
	ungroupedFields: RenderField[];
}

export type TFormRenderData = typeof forms.$inferSelect & {
	sections: (typeof formSections.$inferSelect)[];
	elements: (typeof formElements.$inferSelect & {
		fieldDefinition: typeof fieldDefinitions.$inferSelect | null;
		uiComponent: typeof uiComponents.$inferSelect | null;
	})[];
	formOverrides: (typeof formOverrides.$inferSelect)[];
	sectionOverrides: (typeof sectionOverrides.$inferSelect)[];
	fieldOverrides: (typeof fieldOverrides.$inferSelect)[];
};
