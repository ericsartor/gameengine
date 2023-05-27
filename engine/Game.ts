import { Pawn } from './Pawn.ts';

type LogicFunction = (deltaMs: number, timestampMs: number) => void;
type DrawFunction = (timestampMs: number) => void;
export class Game {
    page = document.querySelector<HTMLCanvasElement>('body')!;
    canvas = document.createElement('canvas');
    modalContainer = document.createElement('div');
    ctx = this.canvas.getContext('2d')!;

    developmentMode = false;
    fps = '0';

    gridSize = 16;
    logicFunctions: LogicFunction[] = [];
    drawFunctions: DrawFunction[] = [];

    constructor(options: {
        developmentMode?: boolean;
    }) {
        // Set flags
        this.developmentMode = options.developmentMode === true;
        
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
    }

    start() {
        // Run game loop
        let lastTimestampMs = 0;
        const loop = (timestampMs: number) => {
            const deltaMs = lastTimestampMs > 0 ? timestampMs - lastTimestampMs : 0;
            lastTimestampMs = timestampMs;
            this.logic(deltaMs, timestampMs);
            this.draw(timestampMs);
            window.requestAnimationFrame(loop);
        };
        window.requestAnimationFrame(loop);
    }

    registerLogic(func: LogicFunction) {
        this.logicFunctions.push(func);
    }

    registerCustomDraw(func: DrawFunction) {
        this.drawFunctions.push(func);
    }

    logic(deltaMs: number, timestampMs: number) {
        // Run development mode logic
        if (this.developmentMode) {
            this.fps = (1000 / deltaMs).toFixed(2);
        }

        // Run user logic functions
        this.logicFunctions.forEach((func) => {
            func(deltaMs, timestampMs);
        });
    }

    draw(timestampMs: number) {
        // Prepare for next frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Run development mode draw functions
        if (this.developmentMode) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px "Courier New"';
            this.ctx.fillText(`${this.fps} FPS`, this.gridSize, this.gridSize * 2);
        }

        // Run user draw functions
        this.drawFunctions.forEach((func) => {
            func(timestampMs);
        });

        // Run Pawn draw functions
        Pawn.map.forEach((pawn) => {
            if (pawn.currentAnimation !== null) {
                const sprite = pawn.getSprite(timestampMs);
                this.ctx.drawImage(
                    sprite.source,
                    sprite.x,
                    sprite.y,
                    sprite.w,
                    sprite.h,
                    0,
                    0,
                    sprite.w,
                    sprite.h,
                );
            }
        });
    }

}