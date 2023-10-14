import { GameError } from './errors';
import { Camera } from './Camera';

type LogicFunction = (deltaMs: number, timestampMs: number) => void;
type DrawFunction = (timestampMs: number) => void;
export class Game {
	// Canvas/elements
	canvasContainer: Element;
	scale: number;
	canvas = document.createElement('canvas');
	ctx = this.canvas.getContext('2d')!;

	// Development mode
	developmentMode: boolean;
	drawGrid: boolean;
	fps = '0';

	// Options
	cellSize: number;

	// Loop state
	timestampMs: number = 0;
	deltaMs: number = 0;
	deltaSeconds: number = 0;

	camera: Camera;

	constructor(options: {
		el: string | Element;
		developmentMode?: boolean;
		drawGrid?: boolean;
		cellSize?: number;
		scale?: number;
		// screenSize?: {
		//     width: number;
		//     height: number;
		// },
	}) {
		console.log(this);

		// Set options
		this.developmentMode = options.developmentMode ?? false;
		this.drawGrid = options.drawGrid ?? false;
		this.cellSize = options.cellSize ?? 16;
		this.scale = options.scale ?? 1;

		// Initialize camera
		this.camera = new Camera(this, {
			width: 0,
			height: 0,
		});

		// Get target element
		if (options.el instanceof Element) {
			this.canvasContainer = options.el;
		} else {
			const maybeEl = document.querySelector(options.el);
			if (!maybeEl) throw new GameError(`element does not exist with selector ${options.el}`);
			this.canvasContainer = maybeEl;
		}

		// Set up canvas
		this.canvas.style.backgroundColor = 'black';
		this.resizeCanvas();
		window.addEventListener('resize', () => {
			this.resizeCanvas();
		});

		// Append canvas to page
		this.canvasContainer.append(this.canvas);
	}

	resizeCanvas() {
		const targetElRect = this.canvasContainer.getBoundingClientRect();
		const cssWidth = Math.round(targetElRect.width);
		const cssHeight = Math.round(targetElRect.height);
		this.canvas.style.width = cssWidth + 'px';
		this.canvas.style.height = cssHeight + 'px';
		this.canvas.width = cssWidth * window.devicePixelRatio;
		this.canvas.height = cssHeight * window.devicePixelRatio;
		// this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		this.ctx.imageSmoothingEnabled = false;
	}

	// User addin methods
	logicFunctions: LogicFunction[] = [];
	started = false;
	registerLogic(func: LogicFunction) {
		this.logicFunctions.push(func);
	}
	drawFunctions: DrawFunction[] = [];
	registerCustomDraw(func: DrawFunction) {
		this.drawFunctions.push(func);
	}
	inputHandlers: { [inputName: string]: LogicFunction } = {};
	registerInputHandler(identifierOrName: string, handler: LogicFunction) {
		if (this.inputHandlers[identifierOrName])
			throw new GameError(
				`already registered input handler for input with name/identifier "${identifierOrName}"`,
			);
		this.inputHandlers[identifierOrName] = handler;
	}
	async start(setup?: () => void) {
		if (this.started) throw new GameError('game has already started');

		// Run game loop
		let lastTimestampMs = 0;
		const loop = (timestampMs: number) => {
			const deltaMs = lastTimestampMs > 0 ? timestampMs - lastTimestampMs : 0;
			lastTimestampMs = timestampMs;
			this.timestampMs = timestampMs;
			this.deltaMs = deltaMs;
			this.deltaSeconds = deltaMs / 1000;
			this.logic(deltaMs, timestampMs);
			this.draw(timestampMs);
			window.requestAnimationFrame(loop);
		};
		window.requestAnimationFrame(loop);

		this.started = true;

		if (setup) setup();
	}

	// Private methods
	lastCacheClear = 0;
	private logic(deltaMs: number, timestampMs: number) {
		// Run development mode logic
		if (this.developmentMode) {
			this.fps = (1000 / deltaMs).toFixed(2);
		}

		// Run user logic functions
		this.logicFunctions.forEach((func) => {
			func(deltaMs, timestampMs);
		});
	}
	drawToCanvas(
		source: CanvasImageSource,
		sourceX: number,
		sourceXOffset: number,
		sourceY: number,
		sourceYOffset: number,
		sourceWidth: number,
		sourceHeight: number,
		destinationX: number,
		destinationY: number,
	) {
		const scale = this.scale * this.camera.zoom;
		this.ctx.drawImage(
			source,
			sourceX * this.cellSize,
			sourceY * this.cellSize,
			sourceWidth,
			sourceHeight,
			Math.round(
				destinationX * this.cellSize * scale +
					sourceXOffset * scale -
					this.camera.position.gridX * this.cellSize * scale,
			),
			Math.round(
				destinationY * this.cellSize * scale +
					sourceYOffset * scale -
					this.camera.position.gridY * this.cellSize * scale,
			),
			Math.round(sourceWidth * scale),
			Math.round(sourceHeight * scale),
		);
	}
	private draw(timestampMs: number) {
		// Prepare for next frame
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		const scale = this.scale * this.camera.zoom;

		// Run user draw functions
		this.drawFunctions.forEach((func) => {
			func(timestampMs);
		});

		// Run development mode draw functions
		if (this.developmentMode) {
			// Draw grid
			if (this.drawGrid) {
				const cameraX = this.camera.position.gridX;
				const cameraXRemainder = cameraX - Math.round(cameraX);
				const cameraY = this.camera.position.gridY;
				const cameraYRemainder = cameraY - Math.round(cameraY);
				const xStart = 0 - cameraXRemainder;
				const xEnd = xStart + this.camera.gridWidth;
				const yStart = 0 - cameraYRemainder;
				const yEnd = yStart + this.camera.gridHeight;
				for (let destinationX = xStart; destinationX < xEnd; destinationX++) {
					for (let destinationY = yStart; destinationY < yEnd; destinationY++) {
						this.ctx.strokeStyle = 'pink';
						this.ctx.strokeRect(
							Math.round(destinationX * this.cellSize * scale),
							Math.round(destinationY * this.cellSize * scale),
							this.cellSize * scale,
							this.cellSize * scale,
						);
					}
				}
			}

			// Set up font drawing
			this.ctx.fillStyle = 'white';
			this.ctx.font = `${this.cellSize}px "Courier New"`;
			let lineY = 2;
			const writeNextLine = (text: string) => {
				this.ctx.fillText(text, this.cellSize, this.cellSize * lineY++);
			};

			// FPS counter
			writeNextLine(`${this.fps} FPS`);
		}

		// Update camera zoom cleanly after having drawn everything, for some reason updating it before drawing doesn't work
		this.camera.zoom = this.camera.nextZoom;
	}
}
