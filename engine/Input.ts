import zod from "zod";
import { GameError } from "./errors";

type Input = {
	identifier: string;
	pressed: boolean;
	value: number;
};

// "context" represents "in a menu" vs "controlling character", etc,
// it allows for buttons to be used differently in different contexts.
// "identifier" is either a KeyboardEvent.code value or a Gamepad button/axis name.
// "value" is a number that means something different depending on the input:
// gamepad axes use -1.0 - 1.0 to indicate direction/extent, gamepad buttons use 0.0 - 1.0
// to indicate extent (triggers, for example), and potentially analog keyboards might use this too
type Action = {
	context: string;
	action: string;
	identifier: string;
};
type InputMapping = Action[];
const zInputMapping = zod.array(
	zod.object({
		context: zod.string(),
		action: zod.string(),
		identifier: zod.string(),
	})
);

type InputMappingUpdate = {
	context: string;
	action: string;
	identifier: string;
};

export class InputController {
	private inputMap: { [identifier: string]: Input } = {};
	private actionLookupMap: { [identifier: string]: Action[] } = {};
	private inputLookupMap: { [action: string]: { [context: string]: Input } } = {};
	private mapping: InputMapping;
	private activeContexts = new Set<string>();

	actionsToHandle: Action[] = [];
	flush() {
		this.actionsToHandle.length = 0;
	}

	constructor(mapping: any) {
		// Create action look up map and define Inputs
		const mappingResult = zInputMapping.safeParse(mapping);
		if (!mappingResult.success) throw new GameError("invalid input mapping provided");
		this.mapping = mappingResult.data;
		mappingResult.data.forEach((action) => {
			// Populate action lookup map
			if (!this.actionLookupMap[action.identifier])
				this.actionLookupMap[action.identifier] = [];
			this.actionLookupMap[action.identifier].push(action);

			// Create Input
			if (!this.inputMap[action.identifier]) {
				this.inputMap[action.identifier] = {
					identifier: action.identifier,
					pressed: false,
					value: 0,
				};
			}

			// Populate Input lookup map
			if (!this.inputLookupMap[action.context]) this.inputLookupMap[action.context] = {};
			if (this.inputLookupMap[action.context][action.action])
				throw new GameError(
					`duplicate action "${action.action}" in context "${action.context}"`
				);
			this.inputLookupMap[action.context][action.action] = this.inputMap[action.identifier];
		});

		window.addEventListener("keydown", (event) => {
			const input = this.inputMap[event.code];
			if (input) {
				event.preventDefault();
				event.stopPropagation();
			}
			if (input && input.pressed === false) {
				input.pressed = true;
				input.value = 1;
				const actions = this.actionLookupMap[input.identifier];
				if (actions) {
					this.actionsToHandle.push(
						...actions.filter((action) => this.activeContexts.has(action.context))
					);
				}
			} else if (!input) {
				this.inputMap[event.code] = {
					identifier: event.code,
					pressed: true,
					value: 1,
				};
			}
		});
		window.addEventListener("keyup", (event) => {
			const input = this.inputMap[event.code];
			if (input) {
				event.preventDefault();
				event.stopPropagation();
			}
			if (input && input.pressed === true) {
				input.pressed = false;
				input.value = 0;
			} else if (!input) {
				this.inputMap[event.code] = {
					identifier: event.code,
					pressed: false,
					value: 0,
				};
			}
		});
	}

	updateMapping(update: InputMappingUpdate) {
		const action = this.mapping.find((action) => {
			return action.action === update.action && action.context === update.context;
		});
		if (!action)
			throw new GameError(
				`tried to update input mapping for context "${update.context}" and action "${update.action}" but could not find matching context/action`
			);
		action.identifier = update.identifier;
		if (!this.inputMap[update.identifier]) {
			this.inputMap[update.identifier] = {
				identifier: update.identifier,
				pressed: false,
				value: 0,
			};
		}
	}

	activateContext(context: string) {
		this.activeContexts.add(context);
	}
	deactivateContext(context: string) {
		this.activeContexts.delete(context);
	}
	getInput(context: string, action: string) {
		const input = this.inputLookupMap[context][action];
		if (!input)
			throw new GameError(
				`requested invalid input with context "${context}" and action "${action}"`
			);
		return input;
	}
}
