import { Pawn, loadPawnFromFile } from './Pawn.ts';
import { InputController, InputInit } from './Input.ts';
import { GameError } from './errors.ts';
import { Stage, StageInit, loadStageFromFile } from './Stage.ts';
import { ONE_MINUTE } from './numbers.ts';
import { Camera } from './Camera';

type LogicFunction = (deltaMs: number, timestampMs: number) => void;
type DrawFunction = (timestampMs: number) => void;
type LoadProgressCallback = (progress: { message: string, current: number, total: number }) => void;
type LoadCompleteCallback = () => void;
export class Game {
    
    // Pawns
    pawns = new Map<string, Pawn>();
    pawnList: Pawn[] = [];
    addPawn(pawn: Pawn) {
        this.pawns.set(pawn.name, pawn);
        this.pawnList.push(pawn);
    }
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
    deltaMs: number = 0;
    deltaSeconds: number = 0;

    input = new InputController();

    camera: Camera;

    constructor(options: {
        developmentMode?: boolean;
        gridSize?: number;
        scale?: number;
        inputInits?: InputInit[];
        screenSize?: {
            width: number;
            height: number;
        },
    }) {
        // Set options
        if (options.developmentMode !== undefined) this.developmentMode = options.developmentMode;
        if (options.gridSize !== undefined) this.gridSize = options.gridSize;

        const scale = options.scale ?? 1;
        
        // Style canvas
        this.canvas.style.backgroundColor = 'black';
        this.canvas.width = (options.screenSize?.width ?? window.innerWidth);
        this.canvas.height = (options.screenSize?.height ??  window.innerHeight);

        // Disable anti-aliasing
        this.ctx.imageSmoothingEnabled = false;

        // Append elements
        this.page.append(this.canvas);
        this.page.append(this.modalContainer);

        // Initialize input
        if (options.inputInits) {
            this.input.add(options.inputInits);
        }

        // Initialize camera
        this.camera = new Camera(this, {
            width: this.canvas.width,
            height: this.canvas.height,
        });
    }



    // User addin methods
    logicFunctions: LogicFunction[] = [];
    inputHandlers: { [inputName: string]: LogicFunction } = {};
    drawFunctions: DrawFunction[] = [];
    pawnsToLoad: { name: string, filePath: string, initializer?: (p: Pawn) => void }[] = [];
    inputMapToLoad: string | null = null;
    started = false;
    registerLogic(func: LogicFunction) {
        this.logicFunctions.push(func);
    }
    registerCustomDraw(func: DrawFunction) {
        this.drawFunctions.push(func);
    }
    registerPawn(name: string, filePath: string, initializer?: (p: Pawn) => void) {
        if (this.started) throw new GameError(`tried to register pawn "${name}" after game started`);
        this.pawnsToLoad.push({ name, filePath, initializer });
    }
    registerInputHandler(identifierOrName: string, handler: LogicFunction) {
        if (this.inputHandlers[identifierOrName]) throw new GameError(`already registered input handler for input with name/identifier "${identifierOrName}"`);
        this.inputHandlers[identifierOrName] = handler;
    }

    
    // Stages
    stagesToLoad: {
        name: string;
        filePath: string;
        loadByDefault: boolean;
    }[] = [];
    stage: Stage | null = null;
    stages = new Map<string, Stage>();
    registerStage(name: string, filePath: string, loadByDefault: boolean) {
        this.stagesToLoad.push({ name, filePath, loadByDefault });
    }
    addStage(name: string, stage: Stage) {
        this.stages.set(name, stage);
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
        // Load and create stages
        if (this.loadProgressCallback !== null) {
            this.loadProgressCallback({
                message: 'Loading stages...',
                current: 0,
                total: this.stagesToLoad.length,
            });
        }
        await Promise.all(this.stagesToLoad.map(async ({ name, filePath, loadByDefault }, i) => {
            const stage = await loadStageFromFile(name, filePath, this);
            this.addStage(name, stage);
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

        // Load and create pawns
        if (this.loadProgressCallback !== null) {
            this.loadProgressCallback({
                message: 'Loading pawns...',
                current: 0,
                total: this.pawnsToLoad.length,
            });
        }
        await Promise.all(this.pawnsToLoad.map(async ({ name, filePath, initializer }, i) => {
            const pawn = await loadPawnFromFile(name, filePath, this);
            this.addPawn(pawn);
            if (initializer) {
                initializer(pawn);
            }
            if (this.loadProgressCallback !== null) {
                this.loadProgressCallback({
                    message: 'Loading pawns...',
                    current: i + 1,
                    total: this.pawnsToLoad.length,
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
            this.deltaMs = deltaMs;
            this.deltaSeconds = deltaMs / 1000;
            this.logic(deltaMs, timestampMs);
            this.draw(timestampMs);
            window.requestAnimationFrame(loop);
        };
        window.requestAnimationFrame(loop);

        this.started = true;
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
        this.pawns.forEach((p) => {
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
            this.pawns.forEach((pawn) => {
                pawn.clearHitBoxCache();
                pawn.clearSpriteCache();
            });
        }
    }
    private draw(timestampMs: number) {
        // Prepare for next frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Run development mode draw functions
        if (this.developmentMode) {
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
            this.pawns.forEach((p) => {
                pawns.push(p);
            });
            for (let i = 0; i < pawns.length; i++) {
                for (let j = i + 1; j < pawns.length; j++) {
                    const gridDistance = pawns[i].getDistanceToPawn(pawns[j]);
                    writeNextLine(`${pawns[i].name} -> ${pawns[j].name} = ${gridDistance}`);
                }
            }
        }

        // Run stage draw functions
        if (this.stage !== null) {
            // Draw stage tiles
            const xStart = Math.max(0, Math.floor(this.camera.position.gridX));
            const xEnd = xStart + this.camera.gridWidth + 1;
            for (let destinationX = xStart; destinationX < xEnd; destinationX++) {

                const yStart = Math.max(0, Math.floor(this.camera.position.gridY));
                const yEnd = yStart + this.camera.gridHeight + 1;
                for (let destinationY = yStart; destinationY < yEnd; destinationY++) {

                    // Get layers for this cell if it/they exist
                    const layers = this.stage.grid[destinationX]?.[destinationY];

                    // Nothing left in this row
                    if (!layers) break;

                    // Nothing in this layer, but potentially more in the row
                    if (layers.length === 0) continue;

                    for (const layer of layers) {

                        for (const [sourceX, sourceY] of layer) {

                            this.ctx.drawImage(
                                this.stage!.canvas,
                                sourceX * this.gridSize,
                                sourceY * this.gridSize,
                                this.gridSize,
                                this.gridSize,
                                (destinationX * this.gridSize) - (this.camera.position.gridX * this.gridSize),
                                (destinationY * this.gridSize) - (this.camera.position.gridY * this.gridSize),
                                this.gridSize,
                                this.gridSize,
                            );
                            
                        }

                    }

                }

            }
            // this.stage.grid.forEach((column, destinationX) => {
            //     column.forEach((cell, destinationY) => {
            //         cell.forEach((layer) => {
            //             layer.forEach(([sourceX, sourceY]) => {
            //                 this.ctx.drawImage(
            //                     this.stage!.canvas,
            //                     sourceX * this.gridSize,
            //                     sourceY * this.gridSize,
            //                     this.gridSize,
            //                     this.gridSize,
            //                     (destinationX * this.gridSize) - (this.camera.position.gridX * this.gridSize),
            //                     (destinationY * this.gridSize) - (this.camera.position.gridY * this.gridSize),
            //                     this.gridSize,
            //                     this.gridSize,
            //                 );
            //             });
            //         });
            //     });
            // });

            // Draw hitbox
            if (this.developmentMode) {
                this.stage.hitboxes.forEach((hitBox) => {
                    this.ctx.strokeStyle = 'red';
                    this.ctx.strokeRect(
                        (hitBox.gridX * this.gridSize) - (this.camera.position.gridX * this.gridSize),
                        (hitBox.gridY * this.gridSize) - (this.camera.position.gridY * this.gridSize),
                        hitBox.gridWidth * this.gridSize,
                        hitBox.gridHeight * this.gridSize,
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
                    (pawn.position.gridX * this.gridSize) - (this.camera.position.gridX * this.gridSize),
                    (pawn.position.gridY * this.gridSize) - (this.camera.position.gridY * this.gridSize),
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
                        (pawn.position.gridX * this.gridSize) + sprite.offsetX - (this.camera.position.gridX * this.gridSize),
                        (pawn.position.gridY * this.gridSize) + sprite.offsetY - (this.camera.position.gridY * this.gridSize),
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
                        (hitBox.gridX * this.gridSize) - (this.camera.position.gridX * this.gridSize),
                        (hitBox.gridY * this.gridSize) - (this.camera.position.gridY * this.gridSize),
                        hitBox.gridWidth * this.gridSize,
                        hitBox.gridHeight * this.gridSize,
                    );
                }
            }
        });
    }

}