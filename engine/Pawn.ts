import zod from "zod";
import { GameError } from "./errors";

const zPawn = zod.object({
	sheets: zod.array(
		zod.object({
			url: zod.string(),
			chromaKey: zod.union([
				zod.null(),
				zod.object({
					red: zod.union([zod.null(), zod.string()]),
					green: zod.union([zod.null(), zod.string()]),
					blue: zod.union([zod.null(), zod.string()]),
				}),
			]),
		})
	),
	width: zod.number(),
	height: zod.number(),
	hitBox: zod.union([
		zod.null(),
		zod.object({
			x: zod.number(),
			y: zod.number(),
			width: zod.number(),
			height: zod.number(),
		}),
	]),
	animations: zod.array(
		zod.object({
			name: zod.string(),
			hitBoxTimeline: zod.union([
				zod.null(),
				zod.array(
					zod.object({
						x: zod.number(),
						y: zod.number(),
						width: zod.number(),
						height: zod.number(),
						empty: zod.boolean(),
						durationMs: zod.number(),
					})
				),
			]),
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
						scale: zod.number(),
						empty: zod.boolean(),
						durationMs: zod.number(),
					})
				)
			),
		})
	),
});

interface Animation {
	name: string;
	durationMs: number;
	hitBoxTimeline:
		| null
		| {
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
		scale: number;
		empty: boolean;
		durationMs: number;
	}[][];
}

export type Sprite = {
	source: HTMLCanvasElement;
	x: number;
	y: number;
	offsetX: number;
	offsetY: number;
	width: number;
	height: number;
	scale: number;
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
	blueColorTargetHex: string | null
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
		if (i === (80 * 8 + 8) * 4) {
			console.log();
		}
		// Red value indicates hair color
		if (
			imgData.data[i] >= 200 &&
			imgData.data[i + 1] === 0 &&
			imgData.data[i + 2] === 0 &&
			redColorTargetHex
		) {
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
		} else if (
			imgData.data[i + 1] >= 82 &&
			imgData.data[i] === 0 &&
			imgData.data[i + 2] === 0 &&
			greenColorTargetHex
		) {
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
		} else if (
			imgData.data[i + 2] >= 255 &&
			imgData.data[i] === 0 &&
			imgData.data[i + 1] === 0 &&
			blueColorTargetHex
		) {
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

export class Pawn {
	name: string;
	width = 0;
	height = 0;
	hitBox: HitBox | null = null;
	spritesheets: {
		url: string;
		chromaKey: null | { red: null | string; green: null | string; blue: null | string };
	}[];
	canvases: HTMLCanvasElement[] = [];
	contexts: CanvasRenderingContext2D[] = [];
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
			throw new GameError("invalid pawn init");
		}

		// Grab/create properties
		this.name = name;
		this.spritesheets = pawn.data.sheets;
		this.width = pawn.data.width;
		this.height = pawn.data.height;
		this.hitBox = pawn.data.hitBox;
		pawn.data.animations.forEach((animation) => {
			const durations = animation.timelines.map((t) =>
				t.reduce((total, item) => item.durationMs + total, 0)
			);
			if (new Set(durations).size !== 1)
				throw new GameError(
					`animation "${animation.name}" in pawn "${name}" contains timelines with differing durations`
				);
			this.animations.set(animation.name, {
				...animation,
				durationMs: durations[0],
			});
		});
	}
	loadData() {
		this.canvases.length = this.spritesheets.length;
		return Promise.all(
			this.spritesheets.map((sheet, sheetIndex) => {
				return new Promise<void>(async (resolve) => {
					const spritesheetData = await fetch(sheet.url).then((r) => r.blob());
					const img = new Image();
					img.src = URL.createObjectURL(spritesheetData);
					img.onload = () => {
						const canvas = document.createElement("canvas");
						const ctx = canvas.getContext("2d");
						if (ctx === null)
							throw new GameError(`could not initialize context for Pawn ${name}`);
						canvas.width = img.naturalWidth;
						canvas.height = img.naturalHeight;
						ctx.drawImage(img, 0, 0);
						if (sheet.chromaKey)
							colorFilter(
								ctx,
								sheet.chromaKey.red,
								sheet.chromaKey.green,
								sheet.chromaKey.blue
							);
						this.canvases[sheetIndex] = canvas;
						this.contexts[sheetIndex] = ctx;
						resolve();
					};
				});
			})
		);
	}

	setAnimation(name: string, timestampMs: number) {
		const animation = this.animations.get(name);
		if (animation === undefined)
			throw new GameError(`invalid animation name "${name}" for Pawn "${this.name}"`);
		if (this.currentAnimation === animation) return;
		this.currentAnimation = animation;
		this.currentAnimationStartMs = timestampMs;
	}

	stopAnimation() {
		this.currentAnimation = null;
		this.currentAnimationStartMs = 0;
	}

	spriteCache = new Map<number, (Sprite | null)[]>();
	getSprite(timestampMs: number): (Sprite | null)[] {
		// Use cache if possible
		const cachedSprites = this.spriteCache.get(timestampMs);
		if (cachedSprites) return cachedSprites;

		// Validate a sprite can be generated
		if (this.currentAnimation === null)
			throw new GameError(
				`requested sprite when no animation playing on pawn "${this.name}"`
			);
		if (this.contexts.length === 0)
			throw new GameError(
				`requested sprite when spritesheets have not been loaded on pawn "${this.name}"`
			);

		// Find sprites
		const spot =
			(timestampMs - this.currentAnimationStartMs) % this.currentAnimation.durationMs;
		const sprites = this.currentAnimation.timelines.map((timeline, i) => {
			let progressThroughTimeline = 0;
			const timelineItem = timeline.find((item) => {
				if (
					spot >= progressThroughTimeline &&
					spot < progressThroughTimeline + item.durationMs
				) {
					return true;
				} else {
					progressThroughTimeline += item.durationMs;
					return false;
				}
			});
			if (timelineItem === undefined)
				throw new GameError(
					`did not find timeline item for current animation "${
						this.currentAnimation!.name
					}" on pawn "${this.name}", timeline ${i}`
				);
			if (this.contexts[timelineItem.sheetIndex] === undefined)
				throw new GameError(
					`selected sprite's sheetIndex ${timelineItem.sheetIndex} doesn't exist on pawn "${this.name}"`
				);
			return timelineItem.empty
				? null
				: {
						source: this.canvases[timelineItem.sheetIndex],
						x: timelineItem.x,
						y: timelineItem.y,
						width: timelineItem.width,
						height: timelineItem.height,
						offsetX: timelineItem.offsetX,
						offsetY: timelineItem.offsetY,
						scale: timelineItem.scale,
				  };
		});

		// Cache sprites
		this.spriteCache.set(timestampMs, sprites);

		return sprites;
	}

	hitBoxCache = new Map<number, HitBox | null>();
	getHitBox(timestampMs: number): HitBox | null {
		// Use cache if possible
		const cachedHitBox = this.hitBoxCache.get(timestampMs);
		if (cachedHitBox) return cachedHitBox;

		// Return null if no animation
		if (this.currentAnimation === null) return null;

		// Return base hitbox if no hitbox timeline
		if (this.currentAnimation.hitBoxTimeline === null) return this.hitBox;

		// Find hitbox
		const spot =
			(timestampMs - this.currentAnimationStartMs) % this.currentAnimation.durationMs;
		let progressThroughTimeline = 0;
		const hitBox = this.currentAnimation.hitBoxTimeline.find((item) => {
			if (
				spot >= progressThroughTimeline &&
				spot < progressThroughTimeline + item.durationMs
			) {
				return true;
			} else {
				progressThroughTimeline += item.durationMs;
				return false;
			}
		});
		if (hitBox === undefined)
			throw new GameError(
				`did not find hitbox for current animation "${
					this.currentAnimation!.name
				}" on pawn "${this.name}"`
			);

		// Set hitbox cache
		this.hitBoxCache.set(timestampMs, hitBox);

		return hitBox.empty ? null : hitBox;
	}
}
