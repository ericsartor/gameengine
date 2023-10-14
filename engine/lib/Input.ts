// This represents an instance of a change in the value of a device input
type Input = {
	value: number; // Between 0 and 1, degree to which that input is activated (most buttons will only be 0 or 1)
	identifier: string; // code or name of input
	device: DeviceName; // name of device that produced the input
};

// This is a map of the actual event handlers for input changes, by device, by game input
type InputHandler = (input: Input) => void;
type HandlerMap = { [gameInput: string]: Set<InputHandler> };
type DeviceName = 'keyboard' | 'controller0' | 'controller1' | 'controller2' | 'controller3';
const handlerMap: { [name in DeviceName]: HandlerMap } = {
	keyboard: {},
	controller0: {},
	controller1: {},
	controller2: {},
	controller3: {},
};

// These map game inputs to actual device input codes/names, and vice versa
type Identifier = string;
type InputMap = { [gameInput: string]: Identifier };
const inputMaps: { [name in DeviceName]: InputMap } = {
	keyboard: {},
	controller0: {},
	controller1: {},
	controller2: {},
	controller3: {},
};
type IdentifierMap = { [inputIdentifier: Identifier]: Set<string> };
const identifierMaps: { [name in DeviceName]: IdentifierMap } = {
	keyboard: {},
	controller0: {},
	controller1: {},
	controller2: {},
	controller3: {},
};

export const Input = {
	// Registers an input handler, duplicate callbacks will be ignored per input per device
	addInputListener(gameInput: string, deviceName: DeviceName, callback: InputHandler): boolean {
		if (!handlerMap[deviceName][gameInput]) {
			handlerMap[deviceName][gameInput] = new Set();
		}
		if (handlerMap[deviceName][gameInput].has(callback)) return false;
		handlerMap[deviceName][gameInput].add(callback);
		return true;
	},

	// Allows for remapping of game inputs to device inputs
	mapInput(gameInput: string, inputIdentifier: Identifier, deviceName?: DeviceName) {
		(deviceName ? [deviceName] : (Object.keys(inputMaps) as DeviceName[])).forEach((deviceName) => {
			inputMaps[deviceName][gameInput] = inputIdentifier;
			if (!identifierMaps[deviceName][inputIdentifier]) {
				identifierMaps[deviceName][inputIdentifier] = new Set();
			}
			identifierMaps[deviceName][inputIdentifier].add(gameInput);
		});
	},
};

// Handle keyboard events by calling input handlers
const keyboardInputMap: { [code: string]: boolean } = {};
window.addEventListener('keydown', (e) => {
	if (keyboardInputMap[e.code]) return;
	keyboardInputMap[e.code] = true;
	const gameInputs = identifierMaps.keyboard[e.code];
	if (gameInputs) {
		gameInputs.forEach((gameInput) => {
			handlerMap.keyboard[gameInput].forEach((handler) => {
				handler({
					value: 1,
					identifier: e.code,
					device: 'keyboard',
				});
			});
		});
	}
});
window.addEventListener('keyup', (e) => {
	if (!keyboardInputMap[e.code]) return;
	keyboardInputMap[e.code] = false;
	const gameInputs = identifierMaps.keyboard[e.code];
	if (gameInputs) {
		gameInputs.forEach((gameInput) => {
			handlerMap.keyboard[gameInput].forEach((handler) => {
				handler({
					value: 0,
					identifier: e.code,
					device: 'keyboard',
				});
			});
		});
	}
});
