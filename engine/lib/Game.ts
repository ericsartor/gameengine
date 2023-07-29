import { Pawn } from './Pawn';
import { InputController, InputInit } from './Input';
import { GameError } from './errors';
import { Stage } from './Stage';
import { ONE_MINUTE } from './numbers';
import { Camera } from './Camera';
import { Animation } from './Animation';
import { Sheet } from './Sheet';

type LogicFunction = (deltaMs: number, timestampMs: number) => void;
type DrawFunction = (timestampMs: number) => void;
type LoadProgressCallback = (progress: { message: string; current: number; total: number }) => void;
type LoadCompleteCallback = () => void;
export class Game {
	// Canvas/elements
	targetEl: Element;
	scale: number;
	canvas = document.createElement('canvas');
	ctx = this.canvas.getContext('2d')!;

	// Development mode
	developmentMode: boolean;
	drawGrid: boolean;
	fps = '0';

	// Options
	gridSize;

	// Loop state
	timestampMs: number = 0;
	deltaMs: number = 0;
	deltaSeconds: number = 0;

	input = new InputController();
	camera: Camera;

	constructor(options: {
		el: string | Element;
		developmentMode?: boolean;
		drawGrid?: boolean;
		gridSize?: number;
		scale?: number;
		inputInits?: InputInit[];
		// screenSize?: {
		//     width: number;
		//     height: number;
		// },
	}) {
		console.log(this);

		// Set options
		this.developmentMode = options.developmentMode ?? false;
		this.drawGrid = options.drawGrid ?? false;
		this.gridSize = options.gridSize ?? 16;
		this.scale = options.scale ?? 1;

		// Initialize camera
		this.camera = new Camera(this, {
			width: 0,
			height: 0,
		});

		// Get target element
		if (options.el instanceof Element) {
			this.targetEl = options.el;
		} else {
			const maybeEl = document.querySelector(options.el);
			if (!maybeEl) throw new GameError(`element does not exist with selector ${options.el}`);
			this.targetEl = maybeEl;
		}

		// Set up canvas
		this.canvas.style.backgroundColor = 'black';
		this.resizeCanvas();
		window.addEventListener('resize', () => {
			this.resizeCanvas();
		});

		// Initialize input
		if (options.inputInits) {
			this.input.add(options.inputInits);
		}

		// Append canvas to page
		this.targetEl.append(this.canvas);
	}

	resizeCanvas() {
		const targetElRect = this.targetEl.getBoundingClientRect();
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

	// Pawns
	_currentPawns: Pawn[] = [];
	getPawn(location: string): Pawn {
		const pawn = Pawn._inventory.get(location);
		if (pawn === undefined) throw new GameError(`addressed non-existent pawn "${location}"`);
		return pawn;
	}

	// Stages
	stage: Stage | null = null;
	setStage(location: string) {
		const stage = Stage._inventory.get(location);
		if (!stage) throw new GameError(`tried to set unknown Stage "${location}"`);
		this.stage = stage;
	}

	// Loading/starting the game
	loadProgressCallback: LoadProgressCallback | null = null;
	onLoadProgress(callback: LoadProgressCallback) {
		if (this.loadProgressCallback !== null)
			throw new GameError('already added load progress handler');
		this.loadProgressCallback = callback;
	}
	loadCompleteCallback: LoadCompleteCallback | null = null;
	onLoadComplete(callback: LoadCompleteCallback) {
		if (this.loadCompleteCallback !== null)
			throw new GameError('already added load complete handler');
		this.loadCompleteCallback = callback;
	}
	_filesToLoad: string[] = [];
	registerFiles(files: string[]) {
		this._filesToLoad.push(...files);

		// Sort by load priority
		const priority = ['sheet', 'animation', 'pawn', 'stage'];
		this._filesToLoad.sort((a, b) => {
			const aExtension = a.split('.').pop();
			const bExtension = b.split('.').pop();
			if (!aExtension) throw new GameError(`cannot load file with missing extension: ${a}`);
			if (!bExtension) throw new GameError(`cannot load file with missing extension: ${b}`);
			if (!priority.includes(aExtension))
				throw new GameError(`cannot load file with unknown extension: ${a}`);
			if (!priority.includes(bExtension))
				throw new GameError(`cannot load file with unknown extension: ${b}`);
			return priority.indexOf(aExtension) - priority.indexOf(bExtension);
		});
	}
	async start(setup?: () => void) {
		if (this.started) throw new GameError('game has already started');

		// Load game assets
		let firstStageLocation: string | null = null;
		let i = 1;
		for (const file of this._filesToLoad) {
			if (this.loadProgressCallback !== null) {
				this.loadProgressCallback({
					message: `Loading ${file}...`,
					current: i++,
					total: this._filesToLoad.length,
				});
			}
			const [location, extension] = file.split('.');
			switch (extension) {
				case 'sheet':
					await Sheet._load(location);
					break;
				case 'animation':
					await Animation._load(location, this);
					break;
				case 'pawn':
					await Pawn._load(location, this);
					break;
				case 'stage':
					if (firstStageLocation === null) firstStageLocation = location;
					await Stage._load(location, this);
					break;
				default:
					throw new GameError('unknown file extension');
			}
		}

		// Signal load completion
		if (this.loadCompleteCallback !== null) this.loadCompleteCallback();

		// Set up initial pawns
		Pawn._inventory.forEach((pawn) => {
			this._currentPawns.push(pawn);
		});

		// Set up initial stage
		if (firstStageLocation) {
			const stage = Stage._inventory.get(firstStageLocation);
			if (!stage)
				throw new GameError(
					`tried to set default stage but stage was missing: ${firstStageLocation}`,
				);
			this.stage = stage;
		}

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

		// Handle inputs that have handlers
		this.input.buffer.forEach((nameOrIdentifier) => {
			const handler = this.inputHandlers[nameOrIdentifier];
			if (handler) handler(deltaMs, timestampMs);
			this.input.get(nameOrIdentifier).names.forEach((name) => {
				const handler = this.inputHandlers[name];
				if (handler) handler(deltaMs, timestampMs);
			});
		});

		// Handling Pawn paths
		this._currentPawns.forEach((p) => {
			p.moveAlongPath();
		});

		// Run user logic functions
		this.logicFunctions.forEach((func) => {
			func(deltaMs, timestampMs);
		});

		// Flush input actions regardless of if they were handled
		this.input.flush();

		// Clear caches occasionally to avoid memory leaks
		if (timestampMs - this.lastCacheClear > ONE_MINUTE) {
			this._currentPawns.forEach((pawn) => {
				pawn._clearHitBoxCache();
				pawn._clearSpriteCache();
				pawn.animations.forEach((animation) => {
					animation._clearHitBoxCache();
					animation._clearSpriteCache();
				});
			});
		}
	}
	private drawToCanvas(
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
			sourceX * this.gridSize,
			sourceY * this.gridSize,
			sourceWidth,
			sourceHeight,
			Math.round(
				destinationX * this.gridSize * scale +
					sourceXOffset * scale -
					this.camera.position.gridX * this.gridSize * scale,
			),
			Math.round(
				destinationY * this.gridSize * scale +
					sourceYOffset * scale -
					this.camera.position.gridY * this.gridSize * scale,
			),
			Math.round(sourceWidth * scale),
			Math.round(sourceHeight * scale),
		);
	}
	private draw(timestampMs: number) {
		// Prepare for next frame
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		const scale = this.scale * this.camera.zoom;

		// Run stage draw functions
		if (this.stage !== null) {
			const stage = this.stage;
			// Draw stage tiles
			const xStart = Math.max(0, Math.floor(this.camera.position.gridX));
			const xEnd = xStart + this.camera.gridWidth + 1;
			for (let destinationX = xStart; destinationX < xEnd; destinationX++) {
				const yStart = Math.max(0, Math.floor(this.camera.position.gridY));
				const yEnd = yStart + this.camera.gridHeight + 1;
				for (let destinationY = yStart; destinationY < yEnd; destinationY++) {
					// Get layers for this cell if it/they exist
					const items = stage.grid[destinationX]?.[destinationY];

					// Nothing left in this row
					if (!items) break;

					for (const item of items) {
						this.drawToCanvas(
							this.stage.sheets[item.sheetIndex].ctx.canvas,
							item.x,
							item.offsetX,
							item.y,
							item.offsetY,
							item.width,
							item.height,
							destinationX,
							destinationY,
						);
					}
				}
			}

			// Draw hitbox
			if (this.developmentMode) {
				this.stage.hitBoxes.forEach((hitBox) => {
					this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
					this.ctx.fillRect(
						Math.round(
							hitBox.gridX * this.gridSize * scale -
								this.camera.position.gridX * this.gridSize * scale,
						),
						Math.round(
							hitBox.gridY * this.gridSize * scale -
								this.camera.position.gridY * this.gridSize * scale,
						),
						hitBox.gridWidth * this.gridSize * scale,
						hitBox.gridHeight * this.gridSize * scale,
					);
				});
			}
		}

		// Run user draw functions
		this.drawFunctions.forEach((func) => {
			func(timestampMs);
		});

		// Run Pawn draw functions
		this._currentPawns.forEach((pawn) => {
			// Draw sprite box
			if (this.developmentMode) {
				this.ctx.fillStyle = 'yellow';
				if (pawn.currentAnimation !== null) {
					this.ctx.fillRect(
						Math.round(
							(pawn.position.gridX - pawn.currentAnimation.origin.gridX) * this.gridSize * scale -
								this.camera.position.gridX * this.gridSize * scale,
						),
						Math.round(
							(pawn.position.gridY - pawn.currentAnimation.origin.gridY) * this.gridSize * scale -
								this.camera.position.gridY * this.gridSize * scale,
						),
						pawn.currentAnimation.width * scale,
						pawn.currentAnimation.height * scale,
					);
				}
			}

			// Draw sprites
			const currentAnimation = pawn.currentAnimation;
			if (currentAnimation !== null) {
				const spriteLayers = pawn._getSprite();
				spriteLayers.forEach((sprite) => {
					if (sprite === null) return;
					this.drawToCanvas(
						sprite.source,
						sprite.gridX,
						sprite.offsetX,
						sprite.gridY,
						sprite.offsetY,
						sprite.width,
						sprite.height,
						pawn.position.gridX - currentAnimation.origin.gridX,
						pawn.position.gridY - currentAnimation.origin.gridY,
					);
				});
			}

			// Draw hitbox
			if (this.developmentMode) {
				const hitBox = pawn._getHitBox();
				if (hitBox !== null) {
					this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
					this.ctx.fillRect(
						hitBox.gridX * this.gridSize * scale -
							this.camera.position.gridX * this.gridSize * scale,
						hitBox.gridY * this.gridSize * scale -
							this.camera.position.gridY * this.gridSize * scale,
						hitBox.gridWidth * this.gridSize * scale,
						hitBox.gridHeight * this.gridSize * scale,
					);
				}
			}
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
							Math.round(destinationX * this.gridSize * scale),
							Math.round(destinationY * this.gridSize * scale),
							this.gridSize * scale,
							this.gridSize * scale,
						);
					}
				}
			}

			// Set up font drawing
			this.ctx.fillStyle = 'white';
			this.ctx.font = `${this.gridSize}px "Courier New"`;
			let lineY = 2;
			const writeNextLine = (text: string) => {
				this.ctx.fillText(text, this.gridSize, this.gridSize * lineY++);
			};

			// FPS counter
			writeNextLine(`${this.fps} FPS`);

			// Pawn distances
			const pawns: Pawn[] = [];
			this._currentPawns.forEach((p) => {
				pawns.push(p);
				writeNextLine(
					`${p.location}: ${p.position.gridX.toFixed(20)}, ${p.position.gridY.toFixed(20)}`,
				);
			});
			for (let i = 0; i < pawns.length; i++) {
				for (let j = i + 1; j < pawns.length; j++) {
					const gridDistance = pawns[i].getDistanceToPawn(pawns[j]);
					writeNextLine(`${pawns[i].location} -> ${pawns[j].location} = ${gridDistance}`);
				}
			}
		}

		// Update camera zoom cleanly after having drawn everything, for some reason updating it before drawing doesn't work
		this.camera.zoom = this.camera.nextZoom;
	}
}
