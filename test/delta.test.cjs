"use strict";
// ──────────────────────────────────────────────────────────────────
// Delta merge engine tests — run against the built dist (node --test).
//   npm test  (build first: `npm run build`)
// ──────────────────────────────────────────────────────────────────
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mergeDelta } = require("../dist/index.js");

const el = (id, slotName, displayOrder, extra = {}) => ({
	id,
	slotName,
	elementType: "component_ref",
	displayOrder,
	...extra,
});

test("config merge deep-merges nested objects; user wins on touched paths", () => {
	const out = mergeDelta(
		{
			identity: {},
			config: { settings: { density: "normal", striped: true }, title: "A" },
			elements: [],
		},
		[
			{
				id: "o1",
				selector: { kind: "config", path: "settings" },
				operation: "merge",
				value: { density: "compact" },
			},
		],
	);
	assert.deepEqual(out.config, {
		settings: { density: "compact", striped: true },
		title: "A",
	});
});

test("config replace overwrites the path", () => {
	const out = mergeDelta(
		{ identity: {}, config: { settings: { density: "normal" } }, elements: [] },
		[
			{
				id: "o1",
				selector: { kind: "config", path: "settings" },
				operation: "replace",
				value: { density: "compact", striped: true },
			},
		],
	);
	assert.deepEqual(out.config, { settings: { density: "compact", striped: true } });
});

test("identity merge renames the component without touching other fields", () => {
	const out = mergeDelta(
		{ identity: { name: "x", displayName: "X", icon: null }, config: {}, elements: [] },
		[
			{
				id: "o1",
				selector: { kind: "identity", path: "displayName" },
				operation: "merge",
				value: "Y",
			},
		],
	);
	assert.equal(out.identity.displayName, "Y");
	assert.equal(out.identity.name, "x");
	assert.equal(out.identity.icon, null);
});

test("element merge/replace/remove + renumbering", () => {
	const out = mergeDelta(
		{ identity: {}, config: {}, elements: [el(10, "body", 1), el(20, "body", 2)] },
		[
			{
				id: "o1",
				selector: { kind: "element", elementId: 10 },
				operation: "merge",
				value: { grid: { col: 2 } },
			},
			{ id: "o2", selector: { kind: "element", elementId: 20 }, operation: "remove" },
		],
	);
	assert.equal(out.elements.length, 1);
	assert.deepEqual(out.elements[0].grid, { col: 2 });
	assert.equal(out.elements[0].displayOrder, 1);
});

test("slot append/prepend order created nodes by explicit id", () => {
	const out = mergeDelta(
		{ identity: {}, config: {}, elements: [el(10, "body", 1), el(20, "body", 2)] },
		[
			{
				id: "o1",
				selector: { kind: "slot", slotName: "body" },
				operation: "append",
				node: { id: 30, elementType: "component_ref", referencedComponentId: 99 },
			},
			{
				id: "o2",
				selector: { kind: "slot", slotName: "body" },
				operation: "prepend",
				node: { id: 5, elementType: "component_ref", referencedComponentId: 7 },
			},
		],
	);
	assert.deepEqual(
		out.elements.map((e) => [e.id, e.displayOrder]),
		[
			[5, 1],
			[10, 2],
			[20, 3],
			[30, 4],
		],
	);
});

test("slot insert after/before an existing element", () => {
	const after = mergeDelta(
		{ identity: {}, config: {}, elements: [el(10, "body", 1), el(20, "body", 2)] },
		[
			{
				id: "o1",
				selector: { kind: "slot", slotName: "body" },
				operation: "insert",
				node: { id: 15, elementType: "component_ref" },
				value: { after: 10 },
			},
		],
	);
	assert.deepEqual(
		after.elements.map((e) => e.id),
		[10, 15, 20],
	);

	const before = mergeDelta(
		{ identity: {}, config: {}, elements: [el(10, "body", 1), el(20, "body", 2)] },
		[
			{
				id: "o2",
				selector: { kind: "slot", slotName: "body" },
				operation: "insert",
				node: { id: 5, elementType: "component_ref" },
				value: { before: 10 },
			},
		],
	);
	assert.deepEqual(
		before.elements.map((e) => e.id),
		[5, 10, 20],
	);
});

test("op targeting an element the base no longer has is a silent no-op", () => {
	const src = { identity: {}, config: {}, elements: [el(10, "body", 1)] };
	const out = mergeDelta(src, [
		{
			id: "o1",
			selector: { kind: "element", elementId: 999 },
			operation: "merge",
			value: { grid: { col: 3 } },
		},
	]);
	assert.equal(out.elements.length, 1);
	assert.equal(out.elements[0].id, 10);
});

test("source is never mutated", () => {
	const src = {
		identity: { displayName: "A" },
		config: { settings: { density: "normal" } },
		elements: [el(10, "body", 1)],
	};
	mergeDelta(src, [
		{ id: "o1", selector: { kind: "identity", path: "displayName" }, operation: "merge", value: "B" },
		{ id: "o2", selector: { kind: "config", path: "settings" }, operation: "merge", value: { density: "compact" } },
	]);
	assert.equal(src.identity.displayName, "A");
	assert.deepEqual(src.config, { settings: { density: "normal" } });
	assert.equal(src.elements[0].displayOrder, 1);
});
