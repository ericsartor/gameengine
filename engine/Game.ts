import { Pawn } from './Pawn.ts';
import { InputController, InputInit } from './Input.ts';
import { GameError } from './errors.ts';
import { Stage, StageInit } from './Stage.ts';

type LogicFunction = (deltaMs: number, timestampMs: number) => void;
type DrawFunction = (timestampMs: number) => void;
type LoadProgressCallback = (progress: { message: string, current: number, total: number }) => void;
type LoadCompleteCallback = () => void;
export class Game {
    
    // Pawns
    pawns = new Map<string, Pawn>();
    getPawn(name: string): Pawn {
        const pawn = this.pawns.get(name);
        if (pawn === undefined) throw new GameError(`addressed non-existent pawn "${name}"`);
        return pawn;
    }

    // Elements
    page = document.querySelector<HTMLCanvasElement>('body')!;
    canvas = document.createElement('canvas');
    modalContainer = document.createElement('div');
    ctx = this.canvas.getContext('2d')!;

    // Development mode
    developmentMode = false;
    fps = '0';

    // Options
    gridSize = 16;

    // Loop state
    timestampMs: number = 0;

    input = new InputController();

    constructor(options: {
        developmentMode?: boolean;
        gridSize?: number;
        inputInits?: InputInit[];
    }) {
        // Set options
        if (options.developmentMode !== undefined) this.developmentMode = options.developmentMode;
        if (options.gridSize !== undefined) this.gridSize = options.gridSize;
        
        // Style canvas
        this.canvas.style.backgroundColor = 'black';

        // Keep canvas same size as page
        const setCanvasSize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        };
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        // Append elements
        this.page.append(this.canvas);
        this.page.append(this.modalContainer);

        // Initialize input
        if (options.inputInits) {
            this.input.add(options.inputInits);
        }
    }



    // User addin methods
    logicFunctions: LogicFunction[] = [];
    inputHandlers: { [inputName: string]: LogicFunction } = {};
    drawFunctions: DrawFunction[] = [];
    pawnsToLoad: { name: string, filePath: string }[] = [];
    inputMapToLoad: string | null = null;
    started = false;
    registerLogic(func: LogicFunction) {
        this.logicFunctions.push(func);
    }
    registerCustomDraw(func: DrawFunction) {
        this.drawFunctions.push(func);
    }
    registerPawn(name: string, filePath: string) {
        if (this.started) throw new GameError(`tried to register pawn "${name}" after game started`);
        this.pawnsToLoad.push({ name, filePath });
    }
    registerInputHandler(identifierOrName: string, handler: LogicFunction) {
        if (this.inputHandlers[identifierOrName]) throw new GameError(`already registered input handler for input with name/identifier "${identifierOrName}"`);
        this.inputHandlers[identifierOrName] = handler;
    }

    
    // Stages
    stagesToLoad: {
        name: string;
        init: StageInit;
        loadByDefault: boolean;
    }[] = [];
    stage: Stage | null = null;
    stages = new Map<string, Stage>();
    registerStage(name: string, init: StageInit, loadByDefault: boolean) {
        this.stagesToLoad.push({ name, init, loadByDefault});
    }
    setStage(name: string) {
        const stage = this.stages.get(name);
        if (!stage) throw new GameError(`tried to set unknown Stage "${name}"`);
        this.stage = stage;
    }



    // Loading/starting the game
    loadProgressCallback: LoadProgressCallback | null = null;
    onLoadProgress(callback: LoadProgressCallback) {
        if (this.loadProgressCallback !== null) throw new GameError('already added load progress handler');
        this.loadProgressCallback = callback;
    }
    loadCompleteCallback: LoadCompleteCallback | null = null;
    onLoadComplete(callback: LoadCompleteCallback) {
        if (this.loadCompleteCallback !== null) throw new GameError('already added load complete handler');
        this.loadCompleteCallback = callback;
    }
    async start() {
        // Load and create pawns
        if (this.loadProgressCallback !== null) {
            this.loadProgressCallback({
                message: 'Loading pawns...',
                current: 0,
                total: this.pawnsToLoad.length,
            });
        }
        await Promise.all(this.pawnsToLoad.map(async ({ name, filePath }, i) => {
            const jsonData = await fetch(filePath).then((r) => r.json());
            this.pawns.set(name, await Pawn.create(name, jsonData, this));
            if (this.loadProgressCallback !== null) {
                this.loadProgressCallback({
                    message: 'Loading pawns...',
                    current: i + 1,
                    total: this.pawnsToLoad.length,
                });
            }
        }));

        // Load and create stages
        if (this.loadProgressCallback !== null) {
            this.loadProgressCallback({
                message: 'Loading stages...',
                current: 0,
                total: this.stagesToLoad.length,
            });
        }
        await Promise.all(this.stagesToLoad.map(async ({ name, init, loadByDefault }, i) => {
            this.stages.set(name, new Stage(init));
            if (loadByDefault) {
                this.setStage(name);
            }
            if (this.loadProgressCallback !== null) {
                this.loadProgressCallback({
                    message: 'Loading stages...',
                    current: i + 1,
                    total: this.stagesToLoad.length,
                });
            }
        }));

        // Signal load completion
        if (this.loadCompleteCallback !== null) this.loadCompleteCallback();

        // Run game loop
        let lastTimestampMs = 0;
        const loop = (timestampMs: number) => {
            const deltaMs = lastTimestampMs > 0 ? timestampMs - lastTimestampMs : 0;
            lastTimestampMs = timestampMs;
            this.timestampMs = timestampMs
            this.logic(deltaMs, timestampMs);
            this.draw(timestampMs);
            window.requestAnimationFrame(loop);
        };
        window.requestAnimationFrame(loop);

        this.started = true;
    }



    // Private methods
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

        // Run user logic functions
        this.logicFunctions.forEach((func) => {
            func(deltaMs, timestampMs);
        });

        // Flush input actions regardless of if they were handled
        this.input.flush();
    }
    private draw(timestampMs: number) {
        // Prepare for next frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Run development mode draw functions
        if (this.developmentMode) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px "Courier New"';
            this.ctx.fillText(`${this.fps} FPS`, this.gridSize, this.gridSize * 2);
        }

        // Run stage draw functions
        if (this.stage) {
            // Draw hitbox
            if (this.developmentMode) {
                this.stage.hitboxes.forEach((hitBox) => {
                    this.ctx.strokeStyle = 'red';
                    this.ctx.strokeRect(
                        hitBox.x * this.gridSize,
                        hitBox.y * this.gridSize,
                        hitBox.width * this.gridSize,
                        hitBox.height * this.gridSize,
                    );
                });
            }
        }

        // Run user draw functions
        this.drawFunctions.forEach((func) => {
            func(timestampMs);
        });

        // Run Pawn draw functions
        this.pawns.forEach((pawn) => {
            // Draw sprite box
            if (this.developmentMode) {
                this.ctx.fillStyle = 'yellow';
                this.ctx.fillRect(
                    pawn.position.x * this.gridSize,
                    pawn.position.y * this.gridSize,
                    pawn.width,
                    pawn.height,
                );
            }

            // Draw sprites
            if (pawn.currentAnimation !== null) {
                const spriteLayers = pawn.getSprite(timestampMs);
                spriteLayers.forEach((sprite) => {
                    if (sprite === null) return;
                    this.ctx.drawImage(
                        sprite.source,
                        sprite.x + sprite.offsetX,
                        sprite.y,
                        sprite.width,
                        sprite.height,
                        (pawn.position.x * this.gridSize) + sprite.offsetX,
                        (pawn.position.y * this.gridSize) + sprite.offsetY,
                        sprite.width,
                        sprite.height,
                    );
                });
            }

            // Draw hitbox
            if (this.developmentMode) {
                const hitBox = pawn.getHitBox();
                if (hitBox !== null) {
                    this.ctx.strokeStyle = 'red';
                    this.ctx.strokeRect(
                        (pawn.position.x * this.gridSize) + hitBox.x,
                        (pawn.position.y * this.gridSize) + hitBox.y,
                        hitBox.width,
                        hitBox.height,
                    );
                }
            }
        });
    }

}