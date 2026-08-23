# @wrk-t/nestjs-metadata/authoring

A typed, nested DSL for authoring metadata UI seeds. Each UI component is a
constructor taking **typed config** + **children keyed by slot**; the tree
compiles to the exact insert arrays `seed.ts` consumes (`COMPONENTS`,
`FORM_COMPONENTS`, `ELEMENTS`, `FIELD_DEFINITIONS`, `MODULE`, `SCREENS`,
`SCREEN_WIDGETS`).

```ts
import { createAuthoringKit, defineSeed } from "@wrk-t/nestjs-metadata/authoring";
import { archBlueprints as bp } from "./cuid";

// Bind app-owned blueprint ids to the generic classes (once, app-side).
const kit = createAuthoringKit({
  screenLayoutGeneral: bp.screenLayoutGeneral,
  form: bp.form,
  section: bp.section,
  info: bp.info,
  tabs: bp.tabs,
  grid: bp.grid,
  stack: bp.stack,
  container: bp.container,
  /* … */
});
const { ScreenLayout, Grid, Form, Section, Info, Field, defineField } = kit;

export const { FIELD_DEFINITIONS, COMPONENTS, FORM_COMPONENTS, ELEMENTS,
  MODULE, SCREENS, SCREEN_WIDGETS } = defineSeed({
  fields: [ defineField(1, { name: "amount", displayName: "$trl_amount", type: "number" }) ],
  module: { id: 1, name: "wallet", displayName: "$trl_wallet", icon: "Wallet", displayOrder: 50 },
  components: [
    ScreenLayout({ id: 1, name: "wallet_page", displayName: "$trl_wallet" }, {
      body: [
        Grid({ id: 2, container: true, spacing: 2 }, {
          content: [
            Grid({ id: 3, sizes: { xs: 12, md: 8 } }, {
              content: [
                Form({ id: 4, settings: { validateOnBlur: true } }, {
                  content: [
                    Section({ id: 5, displayName: "" }, {
                      content: [ Field(1, { name: "amount", isRequired: true }).id(501) ],
                    }).id(502),
                  ],
                }).id(503),
              ],
            }).id(504),
          ],
        }).id(505),
      ],
    }),
  ],
});
```

## Node kinds

| Constructor | Kind | Emits `arch_components` row | Edge type |
|---|---|---|---|
| `ScreenLayout`, `Page`, `Form`, `Section`, `Info`, `Tabs`, `Table`, `Grid`, `Stack`, `Container` | Component | Yes | `component_ref` |
| `ref(componentId)` | Ref (embed an existing component) | No | `component_ref` |
| `Field(fieldDefId, overrides?)` | Field | No | `field` |
| `Badge`, `ActionButton`, `ChartCell`, `FieldRenderer` | Renderer (leaf) | No | `renderer` |

## Rules the compiler enforces

- **Static ids everywhere.** Components carry their id in config; every child
  needs `.id(...)` (the edge row id) — the compiler throws otherwise.
- **`displayOrder` is derived** from slot position (root = 1; `formComponents`
  roots = 0) unless `displayOrder` is set in config or via `.order(n)`.
- **Identity keys are stripped** from `config` (`name`, `displayName`,
  `category`, `pathPattern`, `visibleToPermissions`, … become columns).
- **`uiComponentId`** in a `Field` override is hoisted onto the edge row.
- **Explicit layout**: `Grid`/`Stack`/`Container` are components — the
  renderer maps them 1:1 (no hidden wrappers). Legacy `.grid({row,col,…})`
  edge chains still work for css-grid slots.

## Blueprint catalog

`DEFAULT_BLUEPRINTS` carries the canonical blueprint definitions
(`form`, `table`, `section`, `grid`, `stack`, `container`, renderers, charts,
…) keyed by the same keys the kit binds. The app assigns numeric ids:

```ts
import { DEFAULT_BLUEPRINTS } from "@wrk-t/nestjs-metadata/authoring";
const BLUEPRINTS = DEFAULT_BLUEPRINTS.map((bp) => ({ ...bp, id: blueprintIds[bp.key] }));
```

## Tests

`npm test` (node's built-in runner, no deps) — covers tree compilation,
field/renderer/ref edges, `formComponents` split, error cases, and the
blueprint catalog.
