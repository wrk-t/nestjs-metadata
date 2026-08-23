"use strict";
// ──────────────────────────────────────────────────────────────────
// Authoring DSL tests — run against the built dist (node --test).
//   npm test  (build first: `npm run build`)
// ──────────────────────────────────────────────────────────────────
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
	registerBlueprintIds,
	createBlueprintRows,
	SeedContext,
	resetElementIdSequence,
	Component,
	Form,
	Stack,
	Grid,
	Container,
	Box,
	Paper,
	Table,
	TextField,
	EmailField,
	PasswordField,
	Button,
	Link,
	Badge,
	ActionButton,
	DEFAULT_BLUEPRINTS,
} = require("../dist/authoring/index.js");

// Blueprint id map — ids are app-owned; any numbers work for the tests.
registerBlueprintIds({
	screenLayoutGeneral: 1,
	page: 2,
	form: 3,
	info: 5,
	tabs: 6,
	table: 7,
	grid: 8,
	stack: 9,
	container: 10,
	layout: 11,
	barChart: 12,
	pieChart: 13,
	lineChart: 14,
	metric: 15,
	speedGauge: 16,
	dateRangePicker: 17,
	avatar: 18,
	logoUploader: 19,
	rawJson: 20,
	auditHistory: 21,
	list: 22,
	screenTree: 23,
	stateContext: 24,
	stageActions: 25,
	swaggerEditor: 26,
	testTab: 27,
	perMethodPricing: 28,
	button: 29,
	link: 30,
	box: 35,
	paper: 36,
	typography: 37,
	badge: 101,
	actionButton: 102,
	chartCell: 103,
	fieldRenderer: 104,
});

const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
const findEl = (els, componentId, slotName, displayOrder) =>
	els.find(
		(e) =>
			e.componentId === componentId &&
			e.slotName === slotName &&
			e.displayOrder === displayOrder,
	);

// Element ids are minted from a process-global counter — reset between
// tests so expectations stay 1..N.
beforeEach(() => resetElementIdSequence());

// ── Blueprint catalog & registry ─────────────────────────────────

test("blueprint catalog is complete and consistent", () => {
	const keys = DEFAULT_BLUEPRINTS.map((bp) => bp.key);
	const expected = [
		"table", "form", "page", "fieldRenderer", "badge",
		"chartCell", "screenLayoutGeneral", "actionButton", "info", "tabs",
		"swaggerEditor", "testTab", "perMethodPricing", "layout", "button",
		"link", "avatar", "logoUploader", "rawJson", "auditHistory",
		"dateRangePicker", "barChart", "pieChart", "lineChart", "metric",
		"speedGauge", "stateContext", "list", "screenTree", "stageActions",
		"grid", "stack", "container", "box", "paper", "typography",
	];
	assert.deepEqual(keys, expected);
	const names = DEFAULT_BLUEPRINTS.map((bp) => bp.name);
	assert.equal(new Set(names).size, names.length, "blueprint names must be unique");
	for (const bp of DEFAULT_BLUEPRINTS) assert.ok(Array.isArray(bp.slots));
});

test("createBlueprintRows stamps the catalog with app ids", () => {
	const rows = createBlueprintRows({
		table: 1, form: 2, page: 4, fieldRenderer: 5, badge: 6,
		chartCell: 7, screenLayoutGeneral: 8, actionButton: 9, info: 10, tabs: 11,
		swaggerEditor: 12, testTab: 13, perMethodPricing: 14, layout: 15,
		button: 16, link: 17, avatar: 18, logoUploader: 19, rawJson: 20,
		auditHistory: 21, dateRangePicker: 22, barChart: 23, pieChart: 24,
		lineChart: 25, metric: 26, speedGauge: 27, stateContext: 28, list: 29,
		screenTree: 30, stageActions: 31, grid: 32, stack: 33, container: 34,
		box: 35, paper: 36, typography: 37,
	});
	const byKey = Object.fromEntries(
		DEFAULT_BLUEPRINTS.map((bp, i) => [bp.key, rows[i]]),
	);
	assert.equal(byKey.form.id, 2);
	assert.equal(byKey.button.id, 16);
	assert.equal(byKey.grid.id, 32);
	assert.equal(byKey.box.id, 35);
	assert.equal(byKey.paper.id, 36);
	assert.equal(rows.length, DEFAULT_BLUEPRINTS.length);
	assert.throws(() => createBlueprintRows({ form: 2 }));
});

// ── Construction: blueprint id resolution ─────────────────────────

test("constructors resolve their blueprint id from the registry", () => {
	new SeedContext();
	const form = new Form({ id: 10 });
	const btn = new Button({ id: 11, label: "Save", action: "submit" });
	assert.equal(form.blueprintId, 3);
	assert.equal(btn.blueprintId, 29);
	assert.ok(form instanceof Component);
});

test("constructing with an unregistered blueprint throws", () => {
	class Unregistered extends Component {
		static blueprintKey = "nope";
	}
	assert.throws(() => new Unregistered({ id: 1 }), /no registered id/);
});

// ── Field nodes self-provision field definitions ─────────────────

test("TextField/PasswordField emit field defs + element overrides", () => {
	const seed = new SeedContext();
	const email = new EmailField({
		id: 100, name: "email", label: "$trl_email",
		isRequired: true, placeholder: "$trl_email_placeholder",
		validations: [["Required", "$trl_required"], ["IsEmail", "$trl_invalid_email"]],
	});
	const password = new PasswordField({ id: 101, name: "password", label: "$trl_password" });
	new Form({ id: 10, name: "login", displayName: "$trl_login" }, [
		new Stack({ id: 20, name: "credentials", displayName: "" }, [email, password]),
	]);
	const b = seed.collect();

	assert.equal(b.FIELD_DEFINITIONS.length, 2);
	const emailDef = byId(b.FIELD_DEFINITIONS).get(100);
	assert.equal(emailDef.name, "email");
	assert.equal(emailDef.displayName, "$trl_email");
	assert.equal(emailDef.type, "email");
	assert.equal(emailDef.isSystem, true);

	const emailEl = findEl(b.ELEMENTS, 20, "content", 1);
	assert.equal(emailEl.elementType, "field");
	assert.equal(emailEl.fieldDefinitionId, 100);
	assert.equal(emailEl.overrides.displayName, "$trl_email");
	assert.equal(emailEl.overrides.isRequired, true);
	assert.equal(emailEl.overrides.validations[0][0], "Required");

	const passwordEl = findEl(b.ELEMENTS, 20, "content", 2);
	assert.equal(passwordEl.fieldDefinitionId, 101);
	assert.equal(passwordEl.overrides.displayName, "$trl_password");
});

test("reusing the same field instance emits one field def, one element per parent", () => {
	const seed = new SeedContext();
	const email = new TextField({ id: 100, name: "email", label: "$trl_email" });
	new Form({ id: 10 }, [email]);
	new Form({ id: 11 }, [email]);
	const b = seed.collect();
	assert.equal(b.FIELD_DEFINITIONS.length, 1);
	assert.equal(b.COMPONENTS.length, 2);
	const emailEls = b.ELEMENTS.filter((e) => e.fieldDefinitionId === 100);
	assert.equal(emailEls.length, 2);
	assert.deepEqual(
		emailEls.map((e) => e.componentId).sort(),
		[10, 11],
	);
});

// ── Children: arrays, single, none, bare ids ─────────────────────

test("children accept a single node, an array, or nothing", () => {
	const single = new Form({ id: 10 }, new Stack({ id: 20 }));
	const none = new Form({ id: 11 });
	assert.equal(single.children.length, 1);
	assert.equal(none.children.length, 0);
});

test("a bare id child emits a component_ref edge without a row", () => {
	const seed = new SeedContext();
	new Form({ id: 10 }, [999]);
	const b = seed.collect();
	assert.equal(b.COMPONENTS.length, 1);
	assert.equal(b.ELEMENTS.length, 1);
	const el = b.ELEMENTS[0];
	assert.equal(el.elementType, "component_ref");
	assert.equal(el.referencedComponentId, 999);
	assert.deepEqual(el.paramBindings, {});
});

// ── Actions node-slot ─────────────────────────────────────────────

test("Form actions are nodes: stripped from config, emitted into the actions slot", () => {
	const seed = new SeedContext();
	const submit = new Button({
		id: 30, label: "$trl_sign_in", action: "submit",
		endpoint: "/api/v1/auth/login", method: "POST",
	});
	const link = new Link({ id: 31, label: "$trl_create_account", path: "/auth/register" });
	new Form(
		{ id: 10, name: "login", displayName: "$trl_login", settings: { validateOnChange: true }, actions: [submit, link] },
		[],
	);
	const b = seed.collect();

	const comp = byId(b.COMPONENTS).get(10);
	assert.deepEqual(comp.config, { settings: { validateOnChange: true } });

	assert.equal(b.COMPONENTS.length, 3);
	const submitRow = byId(b.COMPONENTS).get(30);
	assert.equal(submitRow.blueprintId, 29); // button
	assert.equal(submitRow.config.endpoint, "/api/v1/auth/login");
	const linkRow = byId(b.COMPONENTS).get(31);
	assert.equal(linkRow.blueprintId, 30); // link

	const submitEl = findEl(b.ELEMENTS, 10, "actions", 1);
	assert.equal(submitEl.referencedComponentId, 30);
	const linkEl = findEl(b.ELEMENTS, 10, "actions", 2);
	assert.equal(linkEl.referencedComponentId, 31);
});

// ── Default slots ─────────────────────────────────────────────────

test("Table children fill the columns slot", () => {
	const seed = new SeedContext();
	new Table(
		{ id: 40, name: "users", displayName: "$trl_users", datasource: { type: "rest", endpoint: "/users" } },
		[new TextField({ id: 41, name: "email", label: "$trl_email", columnConfig: { sortable: true } })],
	);
	const b = seed.collect();
	const el = findEl(b.ELEMENTS, 40, "columns", 1);
	assert.equal(el.elementType, "field");
	assert.equal(el.fieldDefinitionId, 41);
	assert.deepEqual(el.overrides.columnConfig, { sortable: true });
});

test("Table toolbar/rowActions are node slots emitted into toolbar + row-actions", () => {
	const seed = new SeedContext();
	const create = new Button({
		id: 42, label: "$trl_create_user", action: "openDialog",
		dialog: { componentId: 90, context: "create" },
	});
	const edit = new Button({
		id: 43, label: "$trl_edit", action: "openDialog",
		dialog: { componentId: 90, context: "edit" },
		condition: { field: "deletedAt", operator: "isEmpty" },
	});
	new Table(
		{ id: 40, name: "users", datasource: { type: "rest", endpoint: "/users" }, toolbar: [create], rowActions: [edit] },
		[new TextField({ id: 41, name: "email", label: "$trl_email" })],
	);
	const b = seed.collect();

	// Node-slot children stripped from config
	const tableRow = byId(b.COMPONENTS).get(40);
	assert.equal(tableRow.config.toolbar, undefined);
	assert.equal(tableRow.config.rowActions, undefined);

	const createEl = findEl(b.ELEMENTS, 40, "toolbar", 1);
	assert.equal(createEl.elementType, "component_ref");
	assert.equal(createEl.referencedComponentId, 42);
	const editEl = findEl(b.ELEMENTS, 40, "row-actions", 1);
	assert.equal(editEl.referencedComponentId, 43);

	// The buttons are full components with their configs intact
	assert.equal(byId(b.COMPONENTS).get(42).config.dialog.componentId, 90);
	assert.deepEqual(byId(b.COMPONENTS).get(43).config.condition, {
		field: "deletedAt",
		operator: "isEmpty",
	});
});

// ── Renderer children ─────────────────────────────────────────────

test("renderer children emit renderer elements", () => {
	const seed = new SeedContext();
	new Form({ id: 10 }, [
		new Badge({ variant: "success", colorMap: { active: "green" } }),
		new ActionButton({ label: "$trl_save" }),
	]);
	const b = seed.collect();
	const badgeEl = findEl(b.ELEMENTS, 10, "content", 1);
	assert.equal(badgeEl.elementType, "renderer");
	assert.equal(badgeEl.rendererBlueprintId, 101);
	assert.deepEqual(badgeEl.rendererConfig, { variant: "success", colorMap: { active: "green" } });
	const actionEl = findEl(b.ELEMENTS, 10, "content", 2);
	assert.equal(actionEl.rendererBlueprintId, 102);
});

// ── Layout tree → rows (explicit layout) ──────────────────────────

test("explicit layout tree compiles to components + elements with slot orders", () => {
	const seed = new SeedContext();
	new Stack({ id: 50, direction: "column", spacing: 2 }, [
		new Grid({ id: 51, container: true, spacing: 2 }, [
			new Grid({ id: 52, sizes: { xs: 12, md: 8 } }, [
				new Form({ id: 53, name: "amount", displayName: "$trl_amount" }, [
					new TextField({ id: 54, name: "amount", label: "$trl_amount", colSpan: 12 }),
				]),
			]),
			new Grid({ id: 55, sizes: { xs: 12, md: 4 } }, [
				new Stack({ id: 56 }, []),
			]),
		]),
	]);
	const b = seed.collect();

	assert.equal(b.COMPONENTS.length, 6);
	const stack = byId(b.COMPONENTS).get(50);
	assert.equal(stack.blueprintId, 9);
	assert.deepEqual(stack.config, { direction: "column", spacing: 2 });

	const gridItem = byId(b.COMPONENTS).get(52);
	assert.deepEqual(gridItem.config, { sizes: { xs: 12, md: 8 } });

	assert.equal(findEl(b.ELEMENTS, 50, "content", 1).referencedComponentId, 51);
	assert.equal(findEl(b.ELEMENTS, 51, "content", 1).referencedComponentId, 52);
	assert.equal(findEl(b.ELEMENTS, 52, "content", 1).referencedComponentId, 53);
	assert.equal(findEl(b.ELEMENTS, 53, "content", 1).fieldDefinitionId, 54);
	assert.equal(findEl(b.ELEMENTS, 51, "content", 2).referencedComponentId, 55);

	// element ids are auto-minted deterministically
	const ids = b.ELEMENTS.map((e) => e.id);
	assert.deepEqual(ids, [...Array(b.ELEMENTS.length).keys()].map((i) => i + 1));

	// component row displayOrders mirror slot positions; roots get 1
	assert.equal(byId(b.COMPONENTS).get(50).displayOrder, 1); // root
	assert.equal(byId(b.COMPONENTS).get(51).displayOrder, 1);
	assert.equal(byId(b.COMPONENTS).get(52).displayOrder, 1);
	assert.equal(byId(b.COMPONENTS).get(53).displayOrder, 1);
	assert.equal(byId(b.COMPONENTS).get(55).displayOrder, 2);
});

// ── displayOrder overrides ────────────────────────────────────────

test("config.displayOrder overrides slot index", () => {
	const seed = new SeedContext();
	new Stack({ id: 60 }, [
		new Form({ id: 61, displayName: "$trl_a", displayOrder: 5 }),
		new Form({ id: 62, displayName: "$trl_b" }),
	]);
	const b = seed.collect();
	assert.equal(byId(b.COMPONENTS).get(61).displayOrder, 5);
	assert.equal(byId(b.COMPONENTS).get(62).displayOrder, 2);
	const edge = findEl(b.ELEMENTS, 60, "content", 5);
	assert.equal(edge.displayOrder, 5);
	assert.equal(edge.referencedComponentId, 61);
});

// ── Thin wrappers (module/screens/widgets) ────────────────────────

test("SeedContext module/screens/widgets are normalized", () => {
	const seed = new SeedContext();
	new Form({ id: 10 });
	seed.module = { id: 1, name: "auth", displayName: "$trl_auth", icon: "Lock", displayOrder: 1 };
	seed.screens = [{ id: 1, moduleId: 1, name: "auth_login", displayName: "$trl_login", displayOrder: 1 }];
	seed.widgets = [{ id: 1, screenId: 1, widgetType: "page", resourceId: 10, displayOrder: 1 }];
	const b = seed.collect();
	assert.equal(b.MODULE.id, 1);
	assert.equal(b.MODULE.isActive, true);
	assert.equal(b.SCREENS[0].pathPattern, null);
	assert.deepEqual(b.SCREEN_WIDGETS[0].config, {});
	assert.equal(b.SCREEN_WIDGETS[0].widgetType, "page");
});

test("SeedContext without extras leaves MODULE undefined", () => {
	const seed = new SeedContext();
	new Form({ id: 10 });
	const b = seed.collect();
	assert.equal(b.MODULE, undefined);
	assert.deepEqual(b.SCREENS, []);
	assert.deepEqual(b.SCREEN_WIDGETS, []);
});

test("separate SeedContexts keep rows separate; element ids stay global", () => {
	const a = new SeedContext();
	new Form({ id: 10 }, [new TextField({ id: 100, name: "a", label: "A" })]);
	const bundleA = a.collect();

	const bctx = new SeedContext();
	new Form({ id: 20 }, [new TextField({ id: 200, name: "b", label: "B" })]);
	const bundleB = bctx.collect();

	assert.equal(bundleA.COMPONENTS.length, 1);
	assert.equal(bundleB.COMPONENTS.length, 1);
	// Global counter: bundleB edges continue after bundleA's
	assert.equal(bundleB.ELEMENTS[0].id, bundleA.ELEMENTS.length + 1);
});

// ── MUI-aligned layout primitives ─────────────────────────────────

test("Box/Container/Paper carry MUI-aligned configs", () => {
	const seed = new SeedContext();
	new Box({ id: 80, display: "flex", gap: 2, padding: 3 }, [
		new Container({ id: 81, maxWidth: "sm", disableGutters: true }, [
			new Paper({ id: 82, elevation: 2, padding: 2.5, fullBleed: false }, [
				new Stack({ id: 83, direction: "row", spacing: 1 }),
			]),
		]),
	]);
	const b = seed.collect();
	const comps = byId(b.COMPONENTS);
	assert.equal(comps.get(80).blueprintId, 35); // box
	assert.deepEqual(comps.get(80).config, { display: "flex", gap: 2, padding: 3 });
	assert.equal(comps.get(81).blueprintId, 10); // container
	assert.deepEqual(comps.get(81).config, { maxWidth: "sm", disableGutters: true });
	assert.equal(comps.get(82).blueprintId, 36); // paper
	assert.deepEqual(comps.get(82).config, { elevation: 2, padding: 2.5, fullBleed: false });
	assert.equal(findEl(b.ELEMENTS, 82, "content", 1).referencedComponentId, 83);
});
