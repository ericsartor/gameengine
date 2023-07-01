import zod from 'zod';
import { GameError } from './errors';
import { Game } from './Game';
import { GridCoord } from './types.ts';
import { GridBox, GridPosition, closerToZero, doBoxesOverlap } from './utils.ts';

const zPawn = zod.object({
    sheets: zod.array(zod.object({
        url: zod.string(),
        chromaKey: zod.union([zod.null(), zod.object({
            red: zod.union([zod.null(), zod.string()]),
            green: zod.union([zod.null(), zod.string()]),
            blue: zod.union([zod.null(), zod.string()]),
        })])
    })),
    width: zod.number(),
    height: zod.number(),
    origin: zod.object({
        x: zod.number(),
        y: zod.number(),
    }),
    hitBox: zod.union([zod.null(), zod.object({
        x: zod.number(),
        y: zod.number(),
        width: zod.number(),
        height: zod.number(),
    })]),
    animations: zod.array(zod.object({
        name: zod.string(),
        hitBoxTimeline: zod.union([zod.null(), zod.array(zod.object({
            x: zod.number(),
            y: zod.number(),
            width: zod.number(),
            height: zod.number(),
            empty: zod.boolean(),
            durationMs: zod.number(),
        }))]),
        timelines: zod.array(
            zod.array(
                zod.object({
                    sheetIndex: zod.number(),
                    x: zod.number(),
                    y: zod.number(),
                    offsetX: zod.number(),
                    offsetY: zod.number(),
                    width: zod.number(),
                    height: zod.number(),
                    empty: zod.boolean(),
                    durationMs: zod.number(),
                }),
            ),
        ),
    })),
});

interface Animation {
    name: string;
    durationMs: number;
    hitBoxTimeline: null | {
        x: number;
        y: number;
        width: number;
        height: number;
        empty: boolean;
        durationMs: number;
    }[];
    timelines: {
        sheetIndex: number;
        x: number;
        y: number;
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
        empty: boolean;
        durationMs: number;
    }[][];
}

export type Sprite = {
    source: HTMLCanvasElement;
    gridX: number;
    gridY: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
};

export type HitBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};



const rgbToHsl = (r: number, g: number, b: number) => {
    (r /= 255), (g /= 255), (b /= 255);

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h: number = (max + min) / 2;
    let s: number = (max + min) / 1;
    let l: number = (max + min) / 2;

    if (max === min) {
        h = 0;
        s = 0; // achromatic
    } else {
        let d: number = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return [Math.floor(h * 360), Math.floor(s * 100), Math.floor(l * 100)];
};

const hslToRgb = (h: number, s: number, l: number) => {
    s /= 100;
    l /= 100;
    const k = (n: any) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: any) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [255 * f(0), 255 * f(8), 255 * f(4)];
};

const colorFilter = (
    ctx: CanvasRenderingContext2D,
    redColorTargetHex: string | null,
    greenColorTargetHex: string | null,
    blueColorTargetHex: string | null,
) => {
    //Declare variables
    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imgData.data;

    const red: number[] = [];
    const green: number[] = [];
    const blue: number[] = [];
    const alpha: number[] = [];

    //Read image and make changes on the fly as it's read
    for (let i: number = 0; i < data.length; i += 4) {

        // Red value indicates hair color
        if (imgData.data[i] >= 200 && imgData.data[i + 1] === 0 && imgData.data[i + 2] === 0 && redColorTargetHex) {
            const redValue = parseInt(redColorTargetHex.substring(1, 3), 16);
            const greenValue = parseInt(redColorTargetHex.substring(3, 5), 16);
            const blueValue = parseInt(redColorTargetHex.substring(5), 16);
            const hsl = rgbToHsl(redValue, greenValue, blueValue);
            switch (imgData.data[i]) {
                case 201:
                    const dark = hslToRgb(
                        hsl[0] - 4 < 0 ? hsl[0] - 4 + 360 : hsl[0] - 4,
                        hsl[1],
                        hsl[2] - 20 < 0 ? 0 : hsl[2] - 20
                    );
                    red[i] = dark[0];
                    green[i] = dark[1];
                    blue[i] = dark[2];
                    alpha[i] = 255;
                    break;
                case 225:
                    const base = hslToRgb(hsl[0], hsl[1], hsl[2]);
                    red[i] = base[0];
                    green[i] = base[1];
                    blue[i] = base[2];
                    alpha[i] = 255;
                    break;
                case 255:
                    const light = hslToRgb(
                        hsl[0] + 4 > 360 ? hsl[0] + 4 - 360 : hsl[0] + 4,
                        hsl[1] - 20 < 0 ? 0 : hsl[1] - 20,
                        hsl[2]
                    );
                    red[i] = light[0];
                    green[i] = light[1];
                    blue[i] = light[2];
                    alpha[i] = 255;
                    break;
            }
            // Green Color indicates body color
        } else if (imgData.data[i + 1] >= 82 && imgData.data[i] === 0 && imgData.data[i + 2] === 0 && greenColorTargetHex) {
            const redValue = parseInt(greenColorTargetHex.substring(1, 3), 16);
            const greenValue = parseInt(greenColorTargetHex.substring(3, 5), 16);
            const blueValue = parseInt(greenColorTargetHex.substring(5), 16);
            const hsl = rgbToHsl(redValue, greenValue, blueValue);
            switch (imgData.data[i + 1]) {
                case 82:
                    const darker = hslToRgb(
                        hsl[0] - 8 < 0 ? hsl[0] - 8 + 360 : hsl[0] - 8,
                        hsl[1],
                        hsl[2] - 40 < 0 ? 0 : hsl[2] - 40
                    );
                    red[i] = darker[0];
                    green[i] = darker[1];
                    blue[i] = darker[2];
                    alpha[i] = 255;
                    break;
                case 201:
                    const dark = hslToRgb(
                        hsl[0] - 4 < 0 ? hsl[0] - 4 + 360 : hsl[0] - 4,
                        hsl[1],
                        hsl[2] - 20 < 0 ? 0 : hsl[2] - 20
                    );
                    red[i] = dark[0];
                    green[i] = dark[1];
                    blue[i] = dark[2];
                    alpha[i] = 255;
                    break;
                case 225:
                    const base = hslToRgb(hsl[0], hsl[1], hsl[2]);
                    red[i] = base[0];
                    green[i] = base[1];
                    blue[i] = base[2];
                    alpha[i] = 255;
                    break;
                case 255:
                    const light = hslToRgb(
                        hsl[0] + 4 > 360 ? hsl[0] + 4 - 360 : hsl[0] + 4,
                        hsl[1] - 20 < 0 ? 0 : hsl[1] - 20,
                        hsl[2]
                    );
                    red[i] = light[0];
                    green[i] = light[1];
                    blue[i] = light[2];
                    alpha[i] = 255;
                    break;
            }
            // Blue Color indicates eye color
        } else if (imgData.data[i + 2] >= 255 && imgData.data[i] === 0 && imgData.data[i + 1] === 0  && blueColorTargetHex) {
            const redValue = parseInt(blueColorTargetHex.substring(1, 3), 16);
            const greenValue = parseInt(blueColorTargetHex.substring(3, 5), 16);
            const blueValue = parseInt(blueColorTargetHex.substring(5), 16);
            const hsl = rgbToHsl(redValue, greenValue, blueValue);
            const base = hslToRgb(hsl[0], hsl[1], hsl[2]);
            red[i] = base[0];
            green[i] = base[1];
            blue[i] = base[2];
            alpha[i] = 255;
            // Color should not change
        } else {
            red[i] = imgData.data[i];
            green[i] = imgData.data[i + 1];
            blue[i] = imgData.data[i + 2];
            alpha[i] = imgData.data[i + 3];
        }
    }

    // Write the image back to the canvas
    for (let i = 0; i < data.length; i += 4) {
        imgData.data[i] = red[i];
        imgData.data[i + 1] = green[i];
        imgData.data[i + 2] = blue[i];
        imgData.data[i + 3] = alpha[i];
    }

    ctx.putImageData(imgData, 0, 0);
};

type Spritesheet = {
    url: string; // Blob URL
    chromaKey: null | { red: null | string, green: null | string, blue: null | string };
}

export type PawnInit = {
    game: Game;
    name: string;
    width: number;
    height: number;
    origin: {
        gridX: number;
        gridY: number;
    };
    hitBox: HitBox | null;
    spritesheets: Spritesheet[];
    animations: Map<string, Animation>;
};

export const loadPawnFromFile = async (name: string, filePath: string, game: Game) => {
    // Download pawn file
    const jsonData = await fetch(filePath).then((r) => r.json());

    // Attempt to validate input
    const pawnInit = zPawn.safeParse(jsonData);
    if (!pawnInit.success) {
        throw new GameError('invalid pawn init');
    }

    // Grab/create properties
    const animations = new Map<string, Animation>();
    pawnInit.data.animations.forEach((animation) => {
        const durations = animation.timelines.map((t) => t.reduce((total, item) => item.durationMs + total , 0));
        if (new Set(durations).size !== 1) throw new GameError(`animation "${animation.name}" in pawn "${name}" contains timelines with differing durations`)
        animations.set(animation.name, {
            ...animation,
            durationMs: durations[0],
        });
    });
    
    const spritesheets = await Promise.all(pawnInit.data.sheets.map((sheet) => {
        return new Promise<Spritesheet>(async (resolve) => {
            const spritesheetData = await fetch(sheet.url).then((r) => r.blob());
            resolve({
                url: URL.createObjectURL(spritesheetData),
                chromaKey: sheet.chromaKey,
            })
        });
    }));

    return new Pawn(name, {
        name,
        game,
        width: pawnInit.data.width,
        height: pawnInit.data.height,
        origin: {
            gridX: pawnInit.data.origin.x / game.gridSize,
            gridY: pawnInit.data.origin.y / game.gridSize,
        },
        hitBox: pawnInit.data.hitBox,
        spritesheets,
        animations,
    }, game);
}

export class Pawn {

    static nextId = 1;
    static getNextId() {
        return Pawn.nextId++;
    }

    clone() {
        const name = `${this.name}-${Pawn.getNextId()}`;
        const pawn = new Pawn(name, { ...this }, this.game);
        this.game.addPawn(pawn);
        return pawn;
    }

    game: Game;
    name: string;
    width = 0;
    height = 0;
    origin = { gridX: 0, gridY: 0 };
    hitBox: HitBox | null = null;
    spritesheets: Spritesheet[];
    canvases: HTMLCanvasElement[];
    contexts: CanvasRenderingContext2D[];
    animations: Map<string, Animation>;

    constructor(name: string, init: PawnInit, game: Game) {
        this.name = name;
        this.game = game;
        this.spritesheets = structuredClone(init.spritesheets);
        this.width = init.width;
        this.height = init.height;
        this.origin = init.origin;
        this.hitBox = structuredClone(init.hitBox);
        this.animations = structuredClone(init.animations);

        // Set up canvases
        this.canvases = [];
        this.canvases.length = this.spritesheets.length;
        this.contexts = [];
        this.contexts.length = this.spritesheets.length;
        this.spritesheets.forEach((sheet, sheetIndex) => {
            const img = new Image();
            img.src = sheet.url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx === null) throw new GameError(`could not initialize context for Pawn ${name}`);
                ctx.imageSmoothingEnabled = false;
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                if (sheet.chromaKey) colorFilter(ctx, sheet.chromaKey.red, sheet.chromaKey.green, sheet.chromaKey.blue);
                this.canvases[sheetIndex] = canvas;
                this.contexts[sheetIndex] = ctx;
            };
        });
    }


    // Animations

    currentAnimation: Animation | null = null;
    currentAnimationStartMs: number = 0;
    setAnimation(name: string, timestampMs: number) {
        const animation = this.animations.get(name);
        if (animation === undefined) throw new GameError(`invalid animation name "${name}" for Pawn "${this.name}"`);
        if (this.currentAnimation === animation) return;
        this.currentAnimation = animation;
        this.currentAnimationStartMs = timestampMs;
    }
    stopAnimation() {
        this.currentAnimation = null;
        this.currentAnimationStartMs = 0;
    }

    spriteCache = new Map<number, (Sprite | null)[]>();
    clearSpriteCache() {
        this.spriteCache.clear();
    }
    getSprite(timestampMs: number): (Sprite | null)[] {
        // Use cache if possible
        const cachedSprites = this.spriteCache.get(timestampMs);
        if (cachedSprites) return cachedSprites;

        // Validate a sprite can be generated
        if (this.currentAnimation === null) throw new GameError(`requested sprite when no animation playing on pawn "${this.name}"`);
        if (this.contexts.length === 0) throw new GameError(`requested sprite when spritesheets have not been loaded on pawn "${this.name}"`);

        // Find sprites
        const spot = (timestampMs - this.currentAnimationStartMs) % this.currentAnimation.durationMs;
        const sprites = this.currentAnimation.timelines.map((timeline, i) => {
            let progressThroughTimeline = 0;
            const timelineItem = timeline.find((item) => {
                if (spot >= progressThroughTimeline && spot < progressThroughTimeline + item.durationMs) {
                    return true;
                } else {
                    progressThroughTimeline += item.durationMs;
                    return false;
                }
            });
            if (timelineItem === undefined) throw new GameError(`did not find timeline item for current animation "${this.currentAnimation!.name}" on pawn "${this.name}", timeline ${i}`);
            if (this.contexts[timelineItem.sheetIndex] === undefined) throw new GameError(`selected sprite's sheetIndex ${timelineItem.sheetIndex} doesnt exist on pawn "${this.name}"`);
            return timelineItem.empty ? null : {
                source: this.canvases[timelineItem.sheetIndex],
                gridX: timelineItem.x / this.game.gridSize,
                gridY: timelineItem.y / this.game.gridSize,
                width: timelineItem.width,
                height: timelineItem.height,
                offsetX: timelineItem.offsetX,
                offsetY: timelineItem.offsetY,
            };
        });

        // Cache sprites
        this.spriteCache.set(timestampMs, sprites);

        return sprites;
    }


    // Hitboxes

    hitBoxCache = new Map<number, GridBox | null>();
    clearHitBoxCache() {
        this.hitBoxCache.clear();
    }
    getHitBox(xPosOverride?: number, yPosOverride?: number): GridBox | null {

        // Use cache if possible (and only if we aren't overriding the position of the pawn
        // in order to check a positional new position)
        if (xPosOverride === undefined && yPosOverride === undefined) {
            const cachedHitBox = this.hitBoxCache.get(this.game.timestampMs);
            if (cachedHitBox) return cachedHitBox;
        }

        // Return null if no animation and no fallback hit box
        if (this.currentAnimation === null && this.hitBox === null) return null;

        if (this.currentAnimation !== null && this.currentAnimation.hitBoxTimeline !== null) {
            // Find current hitbox for animation if there is a hitbox timeline

            // Find hitbox
            const spot = (this.game.timestampMs - this.currentAnimationStartMs) % this.currentAnimation.durationMs;
            let progressThroughTimeline = 0;
            const hitBox = this.currentAnimation.hitBoxTimeline.find((item) => {
                if (spot >= progressThroughTimeline && spot < progressThroughTimeline + item.durationMs) {
                    return true;
                } else {
                    progressThroughTimeline += item.durationMs;
                    return false;
                }
            });
            if (hitBox === undefined) throw new GameError(`did not find hitbox for current animation "${this.currentAnimation!.name}" on pawn "${this.name}"`);

            if (hitBox.empty) {
                if (xPosOverride === undefined && yPosOverride === undefined) this.hitBoxCache.set(this.game.timestampMs, null);
                return null;
            }

            const gridBox = {
                gridX: (xPosOverride ?? this.position.gridX) + (hitBox.x / this.game.gridSize) - this.origin.gridX,
                gridY: (yPosOverride ?? this.position.gridY) + (hitBox.y / this.game.gridSize) - this.origin.gridY,
                gridWidth: hitBox.width / this.game.gridSize,
                gridHeight: hitBox.height / this.game.gridSize,
            };

            // Set hitbox cache
            if (xPosOverride === undefined && yPosOverride === undefined) this.hitBoxCache.set(this.game.timestampMs, gridBox);

            return gridBox;
            
        } else if (this.hitBox !== null) {
            // Use fall back hit box if defined

            const gridBox = {
                gridX: (xPosOverride ?? this.position.gridX) + (this.hitBox.x / this.game.gridSize) - this.origin.gridX,
                gridY: (yPosOverride ?? this.position.gridY) + (this.hitBox.y / this.game.gridSize) - this.origin.gridY,
                gridWidth: this.hitBox.width / this.game.gridSize,
                gridHeight: this.hitBox.height / this.game.gridSize,
            };
            if (xPosOverride === undefined && yPosOverride === undefined) this.hitBoxCache.set(this.game.timestampMs, gridBox);
            return gridBox;

        } else {

            return null;

        }

    }


    // Movement

    position: GridPosition = {
        gridX: 0,
        gridY: 0,
    };
    moveTo(destinationGridX: number, destinationGridY: number, allowPartialMovement = false): boolean {
        
        // Check hitbox before moving, avoid cache with overrides
        const unmovedHitBox = this.getHitBox(this.position.gridX, this.position.gridY);
        if (unmovedHitBox !== null) {
            
            // Define movement strategies
            const strategies = allowPartialMovement ?
                [
                    [
                        { gridX: destinationGridX },
                        { gridY: destinationGridY },
                    ],
                    [
                        { gridY: destinationGridY },
                        { gridX: destinationGridX },
                    ],
                ] :
                // Just move directly to the location if partial movement isn't allowed
                [
                    [
                        { gridX: destinationGridX, gridY: destinationGridY },
                    ]
                ];

            // Attempt movement strategies
            let mostSuccessfulMovement: null | {
                successes: number;
                position: {
                    gridX: number;
                    gridY: number;
                };
            } = null;
            for (const strategy of strategies) {
    
                // Attempt movement strategy, track how successful it was
                let successes = 0;
                const strategyPosition = { gridX: this.position.gridX, gridY: this.position.gridY };
                for (const strategyMovement of strategy) {
    
                    let minPartialX = Infinity;
                    let minPartialY = Infinity;
                    const tryPartialMovement = (conflictingHitBox: GridBox): boolean => {

                        if (!allowPartialMovement) return false;
    
                        if (strategyMovement.gridX !== undefined) {
                            const diff = strategyMovement.gridX - this.position.gridX;
                            if (diff > 0) {
                                // Moving right
                                const otherLeft = conflictingHitBox.gridX;
                                const thisRight = unmovedHitBox.gridX + unmovedHitBox.gridWidth;
                                const partialX = otherLeft - thisRight;
                                if (partialX === 0) return false; // Can't even do partial movement, this strategy won't work
                                minPartialX = closerToZero(partialX, minPartialX);
                            } else if (diff < 0) {
                                // Moving left
                                const otherRight = conflictingHitBox.gridX + conflictingHitBox.gridWidth;
                                const thisLeft = unmovedHitBox.gridX;
                                const partialX = otherRight - thisLeft;
                                if (partialX === 0) return false; // Can't even do partial movement, this strategy won't work
                                minPartialX = closerToZero(partialX, minPartialX);
                            }
                        }
                        if (strategyMovement.gridY !== undefined) {
                            const diff = strategyMovement.gridY - this.position.gridY;
                            if (diff > 0) {
                                // Moving down
                                const otherTop = conflictingHitBox.gridY;
                                const thisBottom = unmovedHitBox.gridY + unmovedHitBox.gridHeight;
                                const partialY = otherTop - thisBottom;
                                if (partialY === 0) return false; // Can't even do partial movement, this strategy won't work
                                minPartialY = closerToZero(partialY, minPartialY);
                            } else if (diff < 0) {
                                // Moving up
                                const otherBottom = conflictingHitBox.gridY + conflictingHitBox.gridHeight;
                                const thisTop = unmovedHitBox.gridY;
                                const partialY = otherBottom - thisTop;
                                if (partialY === 0) return false; // Can't even do partial movement, this strategy won't work
                                minPartialY = closerToZero(partialY, minPartialY);
                            }

                        }

                        return true;

                    };
    
                    // Get hitbox after potential movement
                    const thisPawnHitBox = this.getHitBox(
                        strategyMovement.gridX ?? strategyPosition.gridX,
                        strategyMovement.gridY ?? strategyPosition.gridY,
                    );
                    if (thisPawnHitBox) {
                        let conflict = false;
    
                        // Check stage hitboxes
                        if (this.game.stage) {
    
                            for (const stageHitBox of this.game.stage.hitboxes) {
    
                                if (doBoxesOverlap(stageHitBox, thisPawnHitBox) && !tryPartialMovement(stageHitBox)) {
                                    conflict = true;
                                    break;
                                }
    
                            }
                            if (conflict) break;
    
                        }
            
                        // Check other pawn hitboxes
                        for (const pawn of this.game.pawnList) {

                            if (pawn === this) continue; // Skip self
                            const pawnHitBox = pawn.getHitBox();
                            if (pawnHitBox !== null && doBoxesOverlap(pawnHitBox, thisPawnHitBox) && !tryPartialMovement(pawnHitBox)) {
                                conflict = true;
                                break;
                            }

                        }
                        if (conflict) break;
    
                    }
            
                    // Track the succesful movement
                    successes++;
                    if (minPartialX !== Infinity) strategyPosition.gridX += minPartialX;
                    else if (strategyMovement.gridX !== undefined) strategyPosition.gridX = strategyMovement.gridX;
                    if (minPartialY !== Infinity) strategyPosition.gridY += minPartialY;
                    else if (strategyMovement.gridY !== undefined) strategyPosition.gridY = strategyMovement.gridY;
    
                }
    
                // If we had more success in this strategy than the current most successful strategy, track that
                if ((mostSuccessfulMovement === null && successes > 0) || (mostSuccessfulMovement !== null && successes > mostSuccessfulMovement.successes)) {
                    mostSuccessfulMovement = {
                        successes,
                        position: strategyPosition,
                    };
                    
                    // If this strategy was entirely successful, use it
                    if (successes === strategy.length) break;
                }
    
            }
    
            // No movements had any succcess, so the move was not possible
            if (mostSuccessfulMovement === null) return false;
            
            // Actually move pawn
            this.position.gridX = mostSuccessfulMovement.position.gridX;
            this.position.gridY = mostSuccessfulMovement.position.gridY;

            // Must clear this if we move because the cache becomes invalidated after a movement
            this.clearHitBoxCache();

            return true;
            
        }
        
        // Actually move pawn
        this.position.gridX = destinationGridX;
        this.position.gridY = destinationGridY;

        // Must clear this if we move because the cache becomes invalidated after a movement
        this.clearHitBoxCache();

        return true;
    }
    moveRelative(changeX: number, changeY: number): boolean {
        return this.moveTo(this.position.gridX + changeX, this.position.gridY + changeY, true);
    }
    moveTowards(destinationX: number, destinationY: number, gridUnitsPerSecond: number) {
        // Calculate required X movement
        const speedX = this.position.gridX > destinationX ? -gridUnitsPerSecond : gridUnitsPerSecond;
        const diffX = destinationX - this.position.gridX;
        const newX = this.position.gridX + closerToZero(diffX, (speedX * this.game.deltaSeconds));

        // Calculate required Y movement
        const speedY = this.position.gridY > destinationY ? -gridUnitsPerSecond : gridUnitsPerSecond;
        const diffY = destinationY - this.position.gridY;
        const newY = this.position.gridY + closerToZero(diffY, (speedY * this.game.deltaSeconds));

        // Move
        this.moveTo(newX, newY, true);
    }


    // Pathing

    currentPath: GridCoord[] | null = null;
    shouldLoopPath = false;
    pathSpeed = 0;
    pathDirection = 1; // 1 / -1
    nextPathIndex = 0;
    setPath(speed: number, loop: boolean, path: GridCoord[]) {
        this.pathSpeed = speed;
        this.currentPath = path;
        this.nextPathIndex = 0;
        this.shouldLoopPath = loop;
        this.pathDirection = 1;
    }
    removePath() {
        if (this.currentPath === null) throw new GameError(`tried to remove path from pawn ${this.name} but there was no active path`);
        this.currentPath = null;
        this.pathSpeed = 0;
        this.nextPathIndex = 0;
        this.shouldLoopPath = false;
        this.pathDirection = 1;
    }
    moveAlongPath() {
        if (this.currentPath === null) return;

        // Move along path
        const nextDestination = this.currentPath[this.nextPathIndex];
        this.moveTowards(nextDestination.gridX, nextDestination.gridY, this.pathSpeed);

        // If we arrive at a path point, handle updating to the next path point
        if (this.position.gridX === nextDestination.gridX && this.position.gridY === nextDestination.gridY) {
            this.nextPathIndex += this.pathDirection;
            if (this.nextPathIndex === this.currentPath.length || this.nextPathIndex < 0) {
                if (this.shouldLoopPath) {
                    // Go to the previous path point and update direction
                    this.pathDirection *= -1;
                    this.nextPathIndex += this.pathDirection * 2;
                } else {
                    // Not looping so end path
                    this.removePath();
                }
            }
        }
    }



    // Distances

    distanceMap = new Map<Pawn, { timestampMs: number, gridDistance: number }>();
    getDistanceToPawn(otherPawn: Pawn) {
        // Used previous distance value if it was calculated during this logic loop
        const distanceEntry = this.distanceMap.get(otherPawn);
        if (distanceEntry && distanceEntry.timestampMs === this.game.timestampMs) return distanceEntry.gridDistance;

        // Make a new distance entry for these pawns
        const xDistance = Math.abs(this.position.gridX - otherPawn.position.gridX);
        const yDistance = Math.abs(this.position.gridY - otherPawn.position.gridY);
        const distance = Math.sqrt((xDistance ** 2) + (yDistance ** 2));
        const newDistanceEntry = {
            timestampMs: this.game.timestampMs,
            gridDistance: distance,
        };
        this.distanceMap.set(otherPawn, newDistanceEntry);
        otherPawn.distanceMap.set(this, newDistanceEntry);

        return newDistanceEntry.gridDistance;
    }

}