# @wrk-t/nestjs-metadata/authoring

A typed, nested DSL for authoring metadata UI seeds. Each UI component is a
**class** (`new` constructor) taking **typed config** + **React-style children**
(a single node, an array, or nothing). Seeding is embedded in the classes: a
per-file `SeedContext` becomes active, constructors register their rows into
it, and the file exports the bundle via a no-arg `collect()`.

```ts
import "./_kit"; // side effect: registerBlueprintIds(...) — must run first
import {
  SeedContext, Form, Stack, EmailField, PasswordField, Button, Link,
} from "@wrk-t/nestjs-metadata/authoring";
import { archComponents as C, fieldDefinitions as F } from "./cuid";

const seed = new SeedContext(); // becomes the active context

const email = new EmailField({ id: F.email, name: "email", label: "$trl_email", isRequired: true });
const password = new PasswordField({ id: F.password, name: "password", label: "$trl_password" });

new Form(
  {
    id: C.authLoginForm, name: "auth_login_form", displayName: "$trl_sign_in",
    settings: { validateOnChange: true },
    actions: [ // node-typed config key → "actions" slot (stripped from stored config)
      new Button({ id: C.loginSubmit, label: "$trl_sign_in", action: "submit", endpoint: "/api/v1/auth/login", method: "POST" }),
      new Link({ id: C.loginRegisterLink, label: "$trl_create_account", path: "/auth/register" }),
    ],
  },
  [ new Stack({ id: C.loginStack, displayName: "" }, [email, password]) ],
);

// Optional routing wrappers
seed.module = { id: 1, name: "users", displayName: "$trl_users", icon: "User", displayOrder: 20 };
seed.screens = [{ id: 1, moduleId: 1, name: "users", displayName: "$trl_users", displayOrder: 1 }];
seed.widgets = [{ id: 1, screenId: 1, widgetType: "page", resourceId: C.usersLayout, displayOrder: 1 }];

export const { FIELD_DEFINITIONS, COMPONENTS, ELEMENTS,
  MODULE, SCREENS, SCREEN_WIDGETS } = seed.collect();
```

`collect()` finalizes the bundle: roots get `displayOrder` 1, and
module/screens/widgets are normalized. Aggregate seed files merge bundles
(`back/src/config/database/main/seeds/metadata/index.ts`).

## Blueprint ids

Classes resolve their blueprint id from a registry the app populates once:

```ts
import { registerBlueprintIds, createBlueprintRows } from "@wrk-t/nestjs-metadata/authoring";
registerBlueprintIds({ form: 2, layout: 15, grid: 30, button: 33, link: 34, /* … */ });
const BLUEPRINTS = createBlueprintRows({ form: 2, layout: 15, /* … */ }); // catalog stamped with ids
```

`createBlueprintRows` throws if a catalog key has no id, so the registry and
the seeded `arch_component_blueprints` rows can never drift.

## Node kinds

| Constructor | Emits `arch_components` row | Edge type |
|---|---|---|
| `ScreenLayout`, `Page`, `Form`, `Info`, `Tabs`, `Table`, `Box`, `Stack`, `Grid`, `Container`, `Paper`, `Typography`, `Layout`, `Button`, `Link`, charts, viewers, … | Yes | `component_ref` |
| `TextField`, `PasswordField`, `NumberField`, `EmailField`, `SelectField`, … | No — self-provisions a `field_definitions` row | `field` |
| `Badge`, `ActionButton`, `ChartCell`, `FieldRenderer` | No | `renderer` |
| **bare number child** | No — embeds an existing component by id | `component_ref` |

## Rules the compiler enforces

- **Every node has a static id** (config.id). Element **edge** ids are
  auto-minted from a process-global counter — no row references an element id,
  so this is safe across re-seeds and across files.
- **Children** fill the component's default slot (`content`; `body` for
  screens/pages; `columns` for tables). Extra slots are node-typed config keys
  (`actions` on `Form`/`Layout`; `toolbar`/`rowActions` on `Table`).
- **`displayOrder` is derived** from slot position (root = 1) unless
  `displayOrder` is set in config.
- **Identity keys are stripped** from `config` (`name`, `displayName`,
  `category`, `pathPattern`, `visibleToPermissions`, … become columns), as are
  node-typed slot keys (never JSON).
- **Shared instances dedupe**: the same component/field instance reused in
  multiple parents emits its own rows once; each parent adds its own edge.
  Rows are also ensured by the referencing parent, so shared instances
  constructed outside any seed context (e.g. in an imported `_shared` module)
  are still collected.
- **`uiComponentId`** on a field is hoisted onto the edge row.

## Blueprint catalog

`DEFAULT_BLUEPRINTS` carries the canonical blueprint definitions, keyed by the
same keys the classes declare (`form`, `table`, `layout`, `grid`, `stack`,
`container`, `button`, `link`, renderers, charts, …).

## Tests

`npm test` (node's built-in runner, no deps) — covers construction, field
self-provisioning, node-slot actions, table toolbar/row-actions slots, dedupe,
bare-id refs, renderer edges, per-file seed contexts, and the blueprint
catalog.
