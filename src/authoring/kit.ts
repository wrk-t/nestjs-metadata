import type { IComponentIdentity } from "./nodes";
import {
	ActionButton,
	Badge,
	ChartCell,
	Component,
	Container,
	Field,
	FieldRenderer,
	Form,
	Grid,
	Info,
	Page,
	ref,
	Renderer,
	ScreenLayout,
	Section,
	Stack,
	Table,
	Tabs,
	type SlotChildren,
} from "./nodes";
import { defineField, type IFieldOverride } from "./config-types";

// ──────────────────────────────────────────────────────────────────
// createAuthoringKit — binds the package's app-agnostic classes to
// the app's blueprint ids. The returned constructors are factory
// functions (no `new`), each stamped with its blueprint id.
// ──────────────────────────────────────────────────────────────────

export type BlueprintIdMap = Record<string, number>;

export function createAuthoringKit(blueprints: BlueprintIdMap) {
	const requireBlueprint = (key: string): number => {
		const id = blueprints[key];
		if (!id) {
			throw new Error(
				`createAuthoringKit: missing blueprint id for key "${key}" — add it to the kit's blueprint map.`,
			);
		}
		return id;
	};

	const bindComponent = <
		TCfg extends IComponentIdentity,
		T extends Component<TCfg>,
	>(
		Ctor: new (config: TCfg, children?: SlotChildren) => T,
	): ((config: TCfg, children?: SlotChildren) => T) => {
		const blueprintId = requireBlueprint(
			(Ctor as unknown as typeof Component).blueprintKey,
		);
		return (config, children) => {
			const inst = new Ctor(config, children);
			inst.blueprintId = blueprintId;
			return inst;
		};
	};

	const bindRenderer = <T extends Renderer>(
		Ctor: new (config?: Record<string, unknown>) => T,
	): ((config?: Record<string, unknown>) => T) => {
		const blueprintId = requireBlueprint(
			(Ctor as unknown as typeof Renderer).blueprintKey,
		);
		return (config) => {
			const inst = new Ctor(config);
			inst.rendererBlueprintId = blueprintId;
			return inst;
		};
	};

	const bindField = (
		fieldDefinitionId: number,
		overrides?: IFieldOverride,
	): Field => new Field(fieldDefinitionId, overrides);

	return {
		ScreenLayout: bindComponent(ScreenLayout),
		Page: bindComponent(Page),
		Form: bindComponent(Form),
		Section: bindComponent(Section),
		Info: bindComponent(Info),
		Tabs: bindComponent(Tabs),
		Table: bindComponent(Table),
		Grid: bindComponent(Grid),
		Stack: bindComponent(Stack),
		Container: bindComponent(Container),
		Field: bindField,
		ref,
		Badge: bindRenderer(Badge),
		ActionButton: bindRenderer(ActionButton),
		ChartCell: bindRenderer(ChartCell),
		FieldRenderer: bindRenderer(FieldRenderer),
		defineField,
	};
}

export type AuthoringKit = ReturnType<typeof createAuthoringKit>;
