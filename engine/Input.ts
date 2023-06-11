import { GameError } from './errors';

export type InputInit = {
    names: string[];
    identifier: string;
};
export type Input = {
    names: string[];            // keys used to look up the input
    identifier: string;         // either a KeyboardEvent.code value or a Gamepad button/axis name
    justHappened: boolean;      // determines if a button was pressed during the last logic loop
    pressed: boolean;           // only applies to buttons, not axes
    timestampMs: number;        // last time a change happened on this input
    value: number;              // a number that means something different depending on the input:
                                // gamepad axes use -1.0 - 1.0 to indicate direction/extent, gamepad buttons use 0.0 - 1.0
                                // to indicate extent (triggers, for example), and potentially analog keyboards might use this too
};

export class InputController {

    // Handle inputs
    static initialized = false;
    static instances: InputController[] = [];
    static keyDownHandler(event: KeyboardEvent) {
        InputController.instances.forEach((controller) => {
            const input = controller.inputMap[event.code];
            if (!input) return;
            event.preventDefault();
            event.stopPropagation();
            if (input.pressed === false) {
                input.pressed = true;
                input.justHappened = true;
                input.value = 1;
                input.timestampMs = performance.now();
                controller.buffer.add(input.identifier);
                input.names.forEach((name) => {
                    controller.buffer.add(name);
                });
            } 
        });
    }
    static keyUpHandler(event: KeyboardEvent) {
        InputController.instances.forEach((controller) => {
            const input = controller.inputMap[event.code];
            if (!input) return;
            event.preventDefault();
            event.stopPropagation();
            if (input.pressed === true) {
                input.pressed = false;
                input.justHappened = true;
                input.value = 0;
                input.timestampMs = performance.now();

                // TODO: should keyup events insert into the buffer?
                // controller.buffer.add(input.identifier);
                // input.names.forEach((name) => {
                //     controller.buffer.add(name);
                // });
            }
        });
    }

    private inputMap: { [identifier: string]: Input } = {};

    constructor() {
        InputController.instances.push(this);
        if (!InputController.initialized) {
            window.addEventListener('keydown', InputController.keyDownHandler);
            window.addEventListener('keyup', InputController.keyUpHandler);
        }
    }
    add(inits: InputInit[]) {
        inits.forEach((init) => {
            const input = {
                ...init,
                pressed: false,
                justHappened: false,
                value: 0,
                timestampMs: 0,
            };
            this.inputMap[init.identifier] = input;
            init.names.forEach((name) => {
                if (this.inputMap[name]) throw new GameError(`duplicate input name ${name}`);
                this.inputMap[name] = input;
            });
        });
    }


    // Remapping

    remap(name: string, identifier: string) {
        const input: Input = this.inputMap[identifier] ?? {
            names: [name],
            identifier,
            justHappened: false,
            pressed: false,
            value: 0,
            timestampMs: 0,
        };
        this.inputMap[name] = input;
    }


    // Context management

    private activeContexts = new Set<string>();
    activateContext(context: string) {
        this.activeContexts.add(context);
    }
    setOnlyContext(context: string) {
        this.deactivateAllContexts();
        this.activateContext(context);
    }
    deactivateContext(context: string) {
        this.activeContexts.delete(context);
    }
    deactivateAllContexts() {
        this.activeContexts.clear();
    }


    // Input querying

    buffer = new Set<string>();
    flush() {
        this.buffer.clear();
    }

    get(name: string): Input {
        const input = this.inputMap[name];
        if (!input) throw new GameError(`requested input with unknown name/identifier "${name}"`);
        return input;
    }

}