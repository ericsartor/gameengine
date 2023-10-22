// This represents an instance of a change in the value of a device input
type Input = {
	value: number; // Between 0 and 1, degree to which that input is activated (most buttons will only be 0 or 1)
	identifier: string; // code or name of input
	device: DeviceName; // name of device that produced the input
};
type InputWithGameAction = Input & {
	gameAction: string;
};

// This is a map of the actual event handlers for input changes, by device, by game input
type InputHandler = (input: InputWithGameAction) => void;
type HandlerMap = { [gameAction: string]: Set<InputHandler> };
type DeviceName = 'keyboard' | 'controller0' | 'controller1' | 'controller2' | 'controller3';
const handlerMap: { [name in DeviceName]: HandlerMap } = {
	keyboard: {},
	controller0: {},
	controller1: {},
	controller2: {},
	controller3: {},
};

// This maps game actions to input identifiers on a per device basis
type Identifier = string;
type InputMap = { [gameAction: string]: Identifier };
const actionToInputMaps: { [name in DeviceName]: InputMap } = {
	keyboard: {},
	controller0: {},
	controller1: {},
	controller2: {},
	controller3: {},
};

// This maps devince inputs to game actions on a per device basis, one to many
type IdentifierMap = { [inputIdentifier: Identifier]: Set<string> };
const inputToActionMaps: { [name in DeviceName]: IdentifierMap } = {
	keyboard: {},
	controller0: {},
	controller1: {},
	controller2: {},
	controller3: {},
};

type InputListenerRemover = Function;
export const Input = {
	// Registers an input handler, duplicate callbacks will be ignored per input per device
	addInputListener(
		gameAction: string,
		deviceName: DeviceName,
		inputHandler: InputHandler,
	): InputListenerRemover | null {
		if (!handlerMap[deviceName][gameAction]) {
			handlerMap[deviceName][gameAction] = new Set();
		}
		if (handlerMap[deviceName][gameAction].has(inputHandler)) return null;
		handlerMap[deviceName][gameAction].add(inputHandler);
		return () => this.removeInputListener(gameAction, deviceName, inputHandler);
	},
	removeInputListener(gameAction: string, deviceName: DeviceName, callback: InputHandler): boolean {
		if (handlerMap[deviceName][gameAction] && handlerMap[deviceName][gameAction].has(callback)) {
			handlerMap[deviceName][gameAction].delete(callback);
			return true;
		}
		return false;
	},

	// Allows for remapping of game inputs to device inputs
	mapInput(gameAction: string, inputIdentifier: Identifier, deviceName?: DeviceName) {
		// Either only remap the provided device, or remap all of them
		const devicesToRemap = deviceName
			? [deviceName]
			: (Object.keys(actionToInputMaps) as DeviceName[]);

		// Perform the remaps
		devicesToRemap.forEach((deviceName) => {
			// Remove game input from input map if there is one
			const currentlyMappedInputIdentifier = actionToInputMaps[deviceName][gameAction];
			if (currentlyMappedInputIdentifier) {
				inputToActionMaps[deviceName][currentlyMappedInputIdentifier].delete(gameAction);
			}

			// Remap the game input to the new identifier
			actionToInputMaps[deviceName][gameAction] = inputIdentifier;

			// Ensure a mapping exists for that input identifier
			if (!inputToActionMaps[deviceName][inputIdentifier]) {
				inputToActionMaps[deviceName][inputIdentifier] = new Set();
			}

			// Update the input mapping
			inputToActionMaps[deviceName][inputIdentifier].add(gameAction);
		});
	},

	remapInput(
		gameAction: string,
		onRemap: () => void,
		deviceName?: DeviceName,
		options?: { cancelOnInput?: Identifier; timeout?: number },
	) {
		// Potentially set up a timeout to remove our event listeners if the user doesn't press any inputs
		const timerId = !options?.timeout
			? null
			: setTimeout(() => {
					onRemap();
					document.removeEventListener('keydown', keyboardHandler);
					// TODO: remove controller handler
					// document.removeEventListener('keydown', controllerHandler);
			  }, options?.timeout);

		// Define keyboard input handler for remapping
		const keyboardHandler = (e: KeyboardEvent) => {
			if (timerId !== null) clearTimeout(timerId);
			if (options?.cancelOnInput && e.code !== options.cancelOnInput) return false;
			this.mapInput(gameAction, e.code, deviceName);
			onRemap();
		};

		const controllerHandler = () => {
			// TODO: provide controller input ID here
			// this.mapInput(gameAction, e.code, deviceName);
			onRemap();
		};

		if (!deviceName || deviceName === 'keyboard') {
			// Listen for keyboard remap input
			document.addEventListener('keydown', keyboardHandler, { once: true });
		}
		if (!deviceName || deviceName !== 'keyboard') {
			// TODO: listen to controller inputs as well
			// controllerHandler();
		}
	},
};

// Handle keyboard events by calling input handlers
const keyboardInputMap: { [code: string]: boolean } = {};
window.addEventListener('keydown', (e) => {
	if (keyboardInputMap[e.code]) return;
	keyboardInputMap[e.code] = true;
	const gameActions = inputToActionMaps.keyboard[e.code];
	if (gameActions) {
		gameActions.forEach((gameAction) => {
			handlerMap.keyboard[gameAction].forEach((handler) => {
				handler({
					value: 1,
					identifier: e.code,
					device: 'keyboard',
					gameAction,
				});
			});
		});
	}
});
window.addEventListener('keyup', (e) => {
	if (!keyboardInputMap[e.code]) return;
	keyboardInputMap[e.code] = false;
	const gameActions = inputToActionMaps.keyboard[e.code];
	if (gameActions) {
		gameActions.forEach((gameAction) => {
			handlerMap.keyboard[gameAction].forEach((handler) => {
				handler({
					value: 0,
					identifier: e.code,
					device: 'keyboard',
					gameAction,
				});
			});
		});
	}
});
