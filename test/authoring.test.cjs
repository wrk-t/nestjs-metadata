"use strict";
// ──────────────────────────────────────────────────────────────────
// Authoring DSL tests — run against the built dist (node --test).
//   npm test  (build first: `npm run build`)
// ──────────────────────────────────────────────────────────────────
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
	createAuthoringKit,
	defineSeed,
} = require("../dist/authoring/index.js");

// Blueprint id map — ids are app-owned; any numbers work for the tests.
const kit = createAuthoringKit({
	screenLayoutGeneral: 1,
	page: 2,
	form: 3,
	section: 4,
	info: 5,
	tabs: 6,
	table: 7,
	grid: 8,
	stack: 9,
	container: 10,
	badge: 11,
	actionButton: 12,
	chartCell: 13,
	fieldRenderer: 14,
});
const {
	ScreenLayout,
	Form,
	Section,
	Info,
	Tabs,
	Grid,
	Stack,
	Container,
	Field,
	ref,
	Badge,
	ActionButton,
	defineField,
} = kit;
const { DEFAULT_BLUEPRINTS } = require("../dist/authoring/index.js");

// ── Helpers ──────────────────────────────────────────────────────

const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
const findEl = (els, componentId, slotName, displayOrder) =>
	els.find(
		(e) =>
			e.componentId === componentId &&
			e.slotName === slotName &&
			e.displayOrder === displayOrder,
	);

// ── Field definitions ────────────────────────────────────────────

test("blueprint catalog is complete and consistent", () => {
	const keys = DEFAULT_BLUEPRINTS.map((bp) => bp.key);
	// every kit key has a catalog entry, and names are unique
	const kitKeys = [
		"screenLayoutGeneral", "page", "form", "section", "info", "tabs",
		"table", "grid", "stack", "container", "badge", "actionButton",
		"chartCell", "fieldRenderer",
	];
	for (const k of kitKeys) {
		assert.ok(keys.includes(k), `catalog missing kit key "${k}"`);
	}
	const names = DEFAULT_BLUEPRINTS.map((bp) => bp.name);
	assert.equal(new Set(names).size, names.length, "blueprint names must be unique");
	// grid/stack/container carry the explicit-layout vocabulary
	const grid = DEFAULT_BLUEPRINTS.find((bp) => bp.key === "grid");
	assert.ok(grid.slots[0].accepts.includes("grid"));
	assert.ok(grid.slots[0].accepts.includes("form"));
	assert.ok(grid.overridable.includes("config.sizes"));
	// every blueprint has slots (leaf renderers: empty array)
	for (const bp of DEFAULT_BLUEPRINTS) assert.ok(Array.isArray(bp.slots));
});

test("defineField fills seed defaults", () => {
	const row = defineField(100, {
		name: "amount",
		displayName: "$trl_amount",
		type: "number",
	});
	assert.equal(row.id, 100);
	assert.equal(row.name, "amount");
	assert.equal(row.isSystem, true);
	assert.equal(row.isActive, true);
});

// ── Component tree → seed rows ───────────────────────────────────

test("explicit-layout tree compiles to components + elements", () => {
	const bundle = defineSeed({
		fields: [
			defineField(100, { name: "amount", displayName: "$trl_amount", type: "number" }),
			defineField(101, { name: "balance", displayName: "$trl_balance", type: "number" }),
			defineField(102, { name: "currency", displayName: "$trl_currency", type: "text" }),
		],
		module: { id: 900, name: "wallet", displayName: "$trl_wallet", icon: "Wallet", displayOrder: 50 },
		screens: [{
			id: 901,
			moduleId: 900,
			name: "wallet",
			displayName: "$trl_wallet",
			icon: "Wallet",
			displayOrder: 1,
			meta: { hideForSuperAdmin: true },
			visibleToPermissions: [{ resource: "wallet", action: "read", scope: "tenant" }],
		}],
		components: [
			ScreenLayout(
				{ id: 1, name: "wallet_page", displayName: "$trl_wallet",
					visibleToPermissions: [{ resource: "wallet", action: "read", scope: "tenant" }] },
				{
					body: [
						Grid({ id: 2, container: true, spacing: 2 }, {
							content: [
								Grid({ id: 3, sizes: { xs: 12, md: 8 } }, {
									content: [
										Form({ id: 4, name: "wallet_payment_form", displayName: "$trl_wallet_payment",
											settings: { validateOnBlur: true, validateOnChange: true },
											actions: [{ action: "apiCall", label: "$trl_recharge",
												endpoint: "/api/v1/wallet/recharge/offline", method: "POST",
												context: "create", successMessage: "$trl_wallet_recharge_initiated" }] },
											{
												content: [
													Section({ id: 5, name: "wallet_payment_section", displayName: "" }, {
														content: [
															Field(100, { name: "amount", displayName: "$trl_amount",
																isRequired: true, validations: [["Required", "$trl_amount_required"]],
																colSpan: 12 }).id(501),
														],
													}).id(502),
												],
											}).id(503),
									],
								}).id(504),
								Grid({ id: 6, sizes: { xs: 12, md: 4 } }, {
									content: [
										Info({ id: 7, name: "wallet_balance_info", displayName: "$trl_balance",
											datasource: { endpoint: "/api/v1/wallet/balance", method: "GET" } }, {
												content: [
													Field(101, { name: "balance", displayName: "$trl_balance", colSpan: 6 }).id(505),
													Field(102, { name: "currency", displayName: "$trl_currency", colSpan: 6 }).id(506),
												],
											}).id(507),
									],
								}).id(508),
								Grid({ id: 8, sizes: { xs: 12 } }, {
									content: [
										Tabs({ id: 9, name: "wallet_transactions_tabs", displayName: "",
											tabs: [{ label: "$trl_transactions", icon: "Receipt" }] }, {
												content: [],
											}).id(509),
									],
								}).id(510),
							],
						}).id(511),
					],
				},
			),
		],
		widgets: [{
			id: 902,
			screenId: 901,
			widgetType: "page",
			resourceId: 1,
			displayOrder: 1,
			widgetOverrides: { title: "$trl_wallet", sizeHint: "full" },
		}],
	});

	// ── COMPONENTS: 9 rows, blueprint-stamped, config stripped ──
	assert.equal(bundle.COMPONENTS.length, 9);
	const comps = byId(bundle.COMPONENTS);
	assert.equal(comps.get(1).blueprintId, 1); // screen_layout_general
	assert.equal(comps.get(2).blueprintId, 8); // grid container
	assert.equal(comps.get(3).blueprintId, 8); // grid item
	assert.equal(comps.get(4).blueprintId, 3); // form
	assert.equal(comps.get(5).blueprintId, 4); // section
	assert.equal(comps.get(7).blueprintId, 5); // info
	assert.equal(comps.get(9).blueprintId, 6); // tabs

	// defaults + identity stripping
	const page = comps.get(1);
	assert.equal(page.category, "system");
	assert.equal(page.isSystem, true);
	assert.equal(page.isActive, true);
	assert.equal(page.tenantId, null);
	assert.deepEqual(page.config, {});
	assert.deepEqual(page.visibleToPermissions, [{ resource: "wallet", action: "read", scope: "tenant" }]);
	assert.equal(page.displayOrder, 1);

	const grid = comps.get(2);
	assert.deepEqual(grid.config, { container: true, spacing: 2 });
	assert.equal(grid.displayOrder, 1); // slot index in body

	const form = comps.get(4);
	assert.deepEqual(form.config.settings, { validateOnBlur: true, validateOnChange: true });
	assert.equal(form.config.actions[0].endpoint, "/api/v1/wallet/recharge/offline");
	assert.equal("name" in form.config, false); // identity not in config
	assert.equal("displayName" in form.config, false);

	const info = comps.get(7);
	assert.deepEqual(info.config.datasource, { endpoint: "/api/v1/wallet/balance", method: "GET" });

	// displayOrder from slot position
	assert.equal(comps.get(3).displayOrder, 1); // item md:8
	assert.equal(comps.get(6).displayOrder, 2); // item md:4
	assert.equal(comps.get(8).displayOrder, 3); // item md:12
	assert.equal(comps.get(5).displayOrder, 1); // section inside form
	assert.equal(comps.get(9).displayOrder, 1); // tabs inside item

	// ── ELEMENTS: 11 edges, explicit ids, correct types ──
	assert.equal(bundle.ELEMENTS.length, 11);
	assert.equal(findEl(bundle.ELEMENTS, 1, "body", 1).referencedComponentId, 2);
	const item1Edge = findEl(bundle.ELEMENTS, 2, "content", 1);
	assert.equal(item1Edge.referencedComponentId, 3);
	assert.deepEqual(item1Edge.paramBindings, {});
	assert.equal(findEl(bundle.ELEMENTS, 2, "content", 2).referencedComponentId, 6);
	assert.equal(findEl(bundle.ELEMENTS, 2, "content", 3).referencedComponentId, 8);

	const amountEl = findEl(bundle.ELEMENTS, 5, "content", 1);
	assert.equal(amountEl.elementType, "field");
	assert.equal(amountEl.fieldDefinitionId, 100);
	assert.deepEqual(amountEl.overrides, {
		name: "amount",
		displayName: "$trl_amount",
		isRequired: true,
		validations: [["Required", "$trl_amount_required"]],
		colSpan: 12,
	});

	const currencyEl = findEl(bundle.ELEMENTS, 7, "content", 2);
	assert.equal(currencyEl.fieldDefinitionId, 102);

	// ── FORM_COMPONENTS ──
	assert.deepEqual(bundle.FORM_COMPONENTS, []);

	// ── Module / screens / widgets normalization ──
	assert.equal(bundle.MODULE.tenantId, null);
	assert.equal(bundle.MODULE.isActive, true);
	assert.equal(bundle.SCREENS[0].moduleId, 900);
	assert.equal(bundle.SCREENS[0].isActive, true);
	assert.equal(bundle.SCREENS[0].pathPattern, null);
	assert.equal(bundle.SCREEN_WIDGETS[0].resourceId, 1);
	assert.deepEqual(bundle.SCREEN_WIDGETS[0].config, {}); // normalizer default
	assert.equal(bundle.FIELD_DEFINITIONS.length, 3);
});

// ── Field uiComponentId hoisting ─────────────────────────────────

test("uiComponentId is hoisted out of overrides", () => {
	const bundle = defineSeed({
		components: [
			Form({ id: 10 }, {
				content: [
					Field(200, { name: "email", displayName: "$trl_email", uiComponentId: 77 }).id(601),
				],
			}).id(602),
		],
	});
	const el = findEl(bundle.ELEMENTS, 10, "content", 1);
	assert.equal(el.elementType, "field");
	assert.equal(el.uiComponentId, 77);
	assert.equal("uiComponentId" in el.overrides, false);
	assert.equal(el.overrides.name, "email");
});

// ── Renderer rows ────────────────────────────────────────────────

test("renderer children emit renderer elements", () => {
	const bundle = defineSeed({
		components: [
			Form({ id: 20 }, {
				content: [
					Badge({ variant: "success", colorMap: { active: "green" } }).id(701),
					ActionButton({ label: "$trl_save" }).id(702),
				],
			}),
		],
	});
	const badgeEl = findEl(bundle.ELEMENTS, 20, "content", 1);
	assert.equal(badgeEl.elementType, "renderer");
	assert.equal(badgeEl.rendererBlueprintId, 11); // badge
	assert.deepEqual(badgeEl.rendererConfig, { variant: "success", colorMap: { active: "green" } });
	const actionEl = findEl(bundle.ELEMENTS, 20, "content", 2);
	assert.equal(actionEl.rendererBlueprintId, 12); // action-button
});

// ── ref() — embed an existing component, no new component row ────

test("ref() emits a component_ref edge without a component row", () => {
	const bundle = defineSeed({
		components: [
			Section({ id: 30, displayName: "" }, {
				content: [
					Field(300, { name: "x", displayName: "$trl_x" }).id(801),
				],
			}).id(802),
			Container({ id: 31 }, {
				content: [
					ref(30).id(803),
				],
			}).id(804),
		],
	});
	// Only Section + Container are components; ref adds no row.
	assert.equal(bundle.COMPONENTS.length, 2);
	const edge = findEl(bundle.ELEMENTS, 31, "content", 1);
	assert.equal(edge.elementType, "component_ref");
	assert.equal(edge.referencedComponentId, 30);
	assert.deepEqual(edge.paramBindings, {});
});

// ── formComponents split ─────────────────────────────────────────

test("formComponents roots land in FORM_COMPONENTS with displayOrder 0", () => {
	const bundle = defineSeed({
		formComponents: [
			Form({ id: 40, displayName: "$trl_create" }, {
				content: [
					Section({ id: 41, displayName: "" }, {
						content: [Field(400, { name: "a", displayName: "$trl_a" }).id(901)],
					}).id(902),
				],
			}).id(903),
		],
	});
	assert.equal(bundle.COMPONENTS.length, 0);
	assert.equal(bundle.FORM_COMPONENTS.length, 2);
	assert.equal(bundle.FORM_COMPONENTS[0].displayOrder, 0); // dialog-form root default
	assert.equal(bundle.FORM_COMPONENTS[1].displayOrder, 1); // section inside
	const edge = findEl(bundle.ELEMENTS, 40, "content", 1);
	assert.equal(edge.referencedComponentId, 41);
});

// ── Grid/Stack/Container render alongside components ─────────────

test("stack + container wrap children", () => {
	const bundle = defineSeed({
		components: [
			Stack({ id: 50, direction: "row", spacing: 2 }, {
				content: [
					Container({ id: 51, fullBleed: true }, {
						content: [
							Info({ id: 52, displayName: "$trl_meta", datasource: { endpoint: "/meta", method: "GET" } }, {
								content: [Field(500, { name: "m", displayName: "$trl_m" }).id(1001)],
							}).id(1002),
						],
					}).id(1003),
				],
			}).id(1004),
		],
	});
	assert.equal(bundle.COMPONENTS.length, 3);
	assert.deepEqual(bundle.COMPONENTS.find((c) => c.id === 50).config, { direction: "row", spacing: 2 });
	assert.deepEqual(bundle.COMPONENTS.find((c) => c.id === 51).config, { fullBleed: true });
	assert.equal(findEl(bundle.ELEMENTS, 50, "content", 1).referencedComponentId, 51);
	assert.equal(findEl(bundle.ELEMENTS, 51, "content", 1).referencedComponentId, 52);
});

// ── Errors ───────────────────────────────────────────────────────

test("missing element id throws", () => {
	assert.throws(
		() =>
			defineSeed({
				components: [
					Form({ id: 60 }, {
						content: [Field(600, { name: "x", displayName: "$trl_x" })], // no .id()
					}),
				],
			}),
		/missing \.id\(\.\.\.\)/,
	);
});

test("kit throws when a blueprint id is missing", () => {
	assert.throws(
		() => createAuthoringKit({ form: 1 }),
		/missing blueprint id for key "screenLayoutGeneral"/,
	);
});

// ── Chain overrides ──────────────────────────────────────────────

test(".override() and .bind() merge onto the edge row", () => {
	const bundle = defineSeed({
		components: [
			Section({ id: 70, displayName: "" }, {
				content: [
					Field(700, { name: "s", displayName: "$trl_s" })
						.id(1101)
						.override({ isHidden: true }),
				],
			}),
			Container({ id: 71 }, {
				content: [
					ref(70)
						.id(1102)
						.bind({ tenantId: { source: "route_param", value: "tenantId" } }),
				],
			}).id(1103),
		],
	});
	const el = findEl(bundle.ELEMENTS, 70, "content", 1);
	assert.equal(el.overrides.isHidden, true);
	const refEdge = findEl(bundle.ELEMENTS, 71, "content", 1);
	assert.deepEqual(refEdge.paramBindings, { tenantId: { source: "route_param", value: "tenantId" } });
});

// ── Legacy edge-grid chain still works ───────────────────────────

test(".grid() chain lands on the edge (legacy)", () => {
	const bundle = defineSeed({
		components: [
			Info({ id: 80, displayName: "$trl_meta", datasource: { endpoint: "/m", method: "GET" } }, {
				content: [
					Field(800, { name: "a", displayName: "$trl_a" })
						.id(1201)
						.grid({ row: 1, col: 1, colSpan: 8 }),
				],
			}).id(1202),
		],
	});
	const el = findEl(bundle.ELEMENTS, 80, "content", 1);
	assert.deepEqual(el.grid, { row: 1, col: 1, colSpan: 8 });
});

// ── Explicit displayOrder override ───────────────────────────────

test("config.displayOrder overrides slot index", () => {
	const bundle = defineSeed({
		components: [
			Stack({ id: 90 }, {
				content: [
					Info({ id: 91, displayName: "$trl_a", datasource: { endpoint: "/a", method: "GET" }, displayOrder: 5 }, {
						content: [],
					}).id(1301),
					Info({ id: 92, displayName: "$trl_b", datasource: { endpoint: "/b", method: "GET" } }, {
						content: [],
					}).id(1302),
				],
			}).id(1303),
		],
	});
	assert.equal(bundle.COMPONENTS.find((c) => c.id === 91).displayOrder, 5);
	assert.equal(bundle.COMPONENTS.find((c) => c.id === 92).displayOrder, 2);
	const edge = findEl(bundle.ELEMENTS, 90, "content", 5);
	assert.equal(edge.displayOrder, 5);
	assert.equal(edge.referencedComponentId, 91);
});
