import zod from 'zod';
import { GameError } from './errors';

const zPawn = zod.object({
    spritesheetImage: zod.string(),
    imageSize: zod.object({
        width: zod.number(),
        height: zod.number(),
    }),
    animations: zod.array(zod.object({
        name: zod.string(),
        timelines: zod.array(
            zod.array(
                zod.object({
                    x: zod.number(),
                    y: zod.number(),
                    empty: zod.boolean(),
                    durationMs: zod.number(),
                }),
            ),
        ),
    })),
});

interface Animation {
    name: string;
    timelines: { x: number, y: number, durationMs: number, empty: boolean }[][];
    durationMs: number;
}

export type Sprite = {
    source: HTMLCanvasElement;
    x: number;
    y: number;
    w: number;
    h: number;
};

export class Pawn {

    name: string;
    spritesheetImageUrl: string;
    canvas = document.createElement('canvas');
    spritesheet: CanvasRenderingContext2D | null = null;
    imageSize = { width: 0, height: 0 };
    animations = new Map<string, Animation>();
    currentAnimation: Animation | null = null;
    currentAnimationStartMs: number = 0;
    position = {
        x: 0,
        y: 0,
    };

    static async create(name: string, init: any) {
        const pawn = new Pawn(name, init);
        await pawn.loadData();
        return pawn;
    }

    constructor(name: string, init: any) {
        // Attempt to validate input
        const pawn = zPawn.safeParse(init);
        if (!pawn.success) {
            throw new GameError('invalid pawn init');
        }

        // Grab/create properties
        this.name = name;
        this.imageSize = pawn.data.imageSize;
        this.spritesheetImageUrl = pawn.data.spritesheetImage;
        pawn.data.animations.forEach((animation) => {
            const durations = animation.timelines.map((t) => t.reduce((total, item) => item.durationMs + total , 0));
            if (new Set(durations).size !== 1) throw new GameError(`animation "${animation.name}" in pawn "${name}" contains timelines with differing durations`)
            this.animations.set(animation.name, {
                ...animation,
                durationMs: durations[0],
            });
        });
    }

    loadData() {
        return new Promise<void>(async (resolve) => {
            const spritesheetData = await fetch(this.spritesheetImageUrl).then((r) => r.blob());
            const img = new Image();
            img.src = URL.createObjectURL(spritesheetData);
            img.onload = () => {
                const ctx = this.canvas.getContext('2d');
                if (ctx === null) throw new GameError(`could not initialize context for Pawn ${name}`);
                this.canvas.width = img.naturalWidth;
                this.canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                this.spritesheet = ctx;
                resolve();
            };
        });
    }

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

    getSprite(timestampMs: number): (Sprite | null)[] {
        if (this.currentAnimation === null) throw new GameError(`requested sprite when no animation playing on pawn "${this.name}"`);
        if (this.spritesheet === null) throw new GameError(`requested sprite when spritesheet has not loaded on pawn "${this.name}"`);
        const spot = (timestampMs - this.currentAnimationStartMs) % this.currentAnimation.durationMs;
        return this.currentAnimation.timelines.map((timeline, i) => {
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
            return timelineItem.empty ? null : {
                source: this.canvas,
                x: timelineItem.x * this.imageSize.width,
                y: timelineItem.y * this.imageSize.height,
                w: this.imageSize.width,
                h: this.imageSize.height,
            };
        });
    }

}