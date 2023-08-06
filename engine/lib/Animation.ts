import zod from 'zod';
import { GameError } from './errors';
import { Game } from './Game';
import { GridBox, createZodErrorMessage } from './utils';
import { Sheet } from './Sheet';
import { ColorFilterSelections } from './colorFilter';

const zHitBoxTimeline = zod.array(
	zod.object({
		x: zod.number(),
		y: zod.number(),
		width: zod.number(),
		height: zod.number(),
		empty: zod.boolean(),
		durationMs: zod.number(),
	}),
);

const zTimelineItem = zod.object({
	sheetIndex: zod.number(),
	x: zod.number(),
	y: zod.number(),
	offsetX: zod.number(),
	offsetY: zod.number(),
	width: zod.number(),
	height: zod.number(),
	empty: zod.boolean(),
	durationMs: zod.number(),
});

const zTimeline = zod.array(zTimelineItem);

export const zAnimation = zod.object({
	location: zod.string(),
	sheets: zod.array(
		zod.object({
			location: zod.string(),
			colorFilterSelections: zod.tuple([
				zod.union([zod.null(), zod.string()]),
				zod.union([zod.null(), zod.string()]),
				zod.union([zod.null(), zod.string()]),
				zod.union([zod.null(), zod.string()]),
				zod.union([zod.null(), zod.string()]),
				zod.union([zod.null(), zod.string()]),
			]),
		}),
	),
	width: zod.number(),
	height: zod.number(),
	origin: zod.object({
		x: zod.number(),
		y: zod.number(),
	}),
	hitBox: zod.union([
		zod.null(),
		zod.object({
			x: zod.number(),
			y: zod.number(),
			width: zod.number(),
			height: zod.number(),
		}),
	]),
	hitBoxTimeline: zod.union([zod.null(), zHitBoxTimeline]),
	timelines: zod.array(zTimeline),
});

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

export type AnimationInit = zod.infer<typeof zAnimation>;

export class Animation {
	game: Game;
	location: string;
	width: number;
	height: number;
	origin: { gridX: number; gridY: number };
	hitBox: GridBox | null;
	hitBoxTimeline: null | zod.infer<typeof zHitBoxTimeline>;
	timelines: zod.infer<typeof zTimeline>[];
	durationMs: number;
	sheets: { instance: Sheet; colorFilterSelections: ColorFilterSelections }[];

	static _inventory = new Map<string, Animation>();
	constructor(init: AnimationInit, game: Game, updateMap = true) {
		this.game = game;
		this.location = init.location;
		this.width = init.width;
		this.height = init.height;
		this.origin = {
			gridX: init.origin.x / this.game.gridSize,
			gridY: init.origin.y / this.game.gridSize,
		};
		this.hitBox =
			init.hitBox === null
				? null
				: {
						gridX: init.hitBox.x / this.game.gridSize,
						gridY: init.hitBox.y / this.game.gridSize,
						gridWidth: init.width / this.game.gridSize,
						gridHeight: init.height / this.game.gridSize,
				  };
		this.hitBoxTimeline = init.hitBoxTimeline;
		this.timelines = init.timelines;

		// Get instances of all necessary sheets
		this.sheets = init.sheets.map((sheet) => {
			const instance = Sheet._inventory.get(sheet.location);
			if (!instance) throw new GameError(`no sheet found at ${sheet.location}`);
			return { instance, colorFilterSelections: sheet.colorFilterSelections };
		});

		// Validate and set duration
		const durations = this.timelines.map((t) =>
			t.reduce((total, item) => item.durationMs + total, 0),
		);
		if (new Set(durations).size !== 1)
			throw new GameError(
				`animation "${this.location}" contains timelines with differing durations`,
			);
		this.durationMs = durations[0];

		// Track animation
		if (updateMap) Animation._inventory.set(this.location, this);
	}

	static async _load(location: string, game: Game): Promise<Animation> {
		// Download animation file
		const jsonData = await fetch(`${location}.animation`).then((r) => r.json());

		// Attempt to validate input
		const animationInit = zAnimation.safeParse(jsonData);
		if (!animationInit.success) {
			throw new GameError('invalid animation init: ' + createZodErrorMessage(animationInit.error));
		}
		const animation = animationInit.data;

		// Grab/create properties
		const durations = animation.timelines.map((t) =>
			t.reduce((total, item) => item.durationMs + total, 0),
		);
		if (new Set(durations).size !== 1)
			throw new GameError(
				`animation "${animation.location}" contains timelines with differing durations`,
			);

		return new Animation(animation, game);
	}

	copy() {
		return new Animation(
			{
				width: this.width,
				height: this.height,
				location: this.location,
				sheets: this.sheets.map((sheet) => ({
					location: sheet.instance.location,
					colorFilterSelections: sheet.colorFilterSelections,
				})),
				origin: {
					y: this.origin.gridX * this.game.gridSize,
					x: this.origin.gridY * this.game.gridSize,
				},
				hitBox:
					this.hitBox === null
						? null
						: {
								x: this.hitBox.gridX * this.game.gridSize,
								y: this.hitBox.gridY * this.game.gridSize,
								width: this.hitBox.gridWidth * this.game.gridSize,
								height: this.hitBox.gridHeight * this.game.gridSize,
						  },
				hitBoxTimeline: this.hitBoxTimeline,
				timelines: this.timelines,
			},
			this.game,
			false,
		);
	}

	// Play state
	startMs: number = 0;
	playing = false;
	start() {
		this.playing = true;
		this.startMs = this.game.timestampMs;
	}
	stop() {
		this.playing = false;
		this.startMs = 0;
	}

	// Sprite logic
	spriteCache = new Map<number, (Sprite | null)[]>();
	_clearSpriteCache() {
		this.spriteCache.clear();
	}
	_getSprite(): (Sprite | null)[] {
		const timestampMs = this.game.timestampMs;

		// Use cache if possible
		const cachedSprites = this.spriteCache.get(timestampMs);
		if (cachedSprites) return cachedSprites;

		// Find sprites
		const spot = (timestampMs - this.startMs) % this.durationMs;
		const sprites = this.timelines.map((timeline, i) => {
			// Get timeline item
			let progressThroughTimeline = 0;
			const timelineItem = timeline.find((item) => {
				if (spot >= progressThroughTimeline && spot < progressThroughTimeline + item.durationMs) {
					return true;
				} else {
					progressThroughTimeline += item.durationMs;
					return false;
				}
			});
			if (timelineItem === undefined)
				throw new GameError(
					`did not find timeline item for animation "${this.location}", timeline ${i}`,
				);

			// Return nothing if empty
			if (timelineItem.empty) return null;

			// Get sheet and return colored version
			const sheet = this.sheets[timelineItem.sheetIndex];
			if (sheet === undefined)
				throw new GameError(
					`selected sprite's sheetIndex ${timelineItem.sheetIndex} doesnt exist on animation "${this.location}"`,
				);
			return {
				source: sheet.instance.withColorFilter(sheet.colorFilterSelections).canvas,
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
	_clearHitBoxCache() {
		this.hitBoxCache.clear();
	}
	_getHitBox(positionX: number, positionY: number, avoidCache = false): GridBox | null {
		// Check cache for hitbox
		const cachedHitBox = avoidCache ? undefined : this.hitBoxCache.get(this.game.timestampMs);
		if (cachedHitBox) return cachedHitBox;

		// Return static hitbox if defined and no hit box timeline
		if (this.hitBox !== null && this.hitBoxTimeline === null) {
			const hitBox = {
				gridX: this.hitBox.gridX + positionX,
				gridY: this.hitBox.gridY + positionY,
				gridWidth: this.hitBox.gridWidth,
				gridHeight: this.hitBox.gridHeight,
			};
			if (!avoidCache) this.hitBoxCache.set(this.game.timestampMs, hitBox);
			return hitBox;
		}

		if (this.hitBoxTimeline !== null) {
			// Find current hitbox for animation if there is a hitbox timeline

			// Find hitbox in timeline
			const spot = (this.game.timestampMs - this.startMs) % this.durationMs;
			let progressThroughTimeline = 0;
			const hitBox = this.hitBoxTimeline.find((item) => {
				if (spot >= progressThroughTimeline && spot < progressThroughTimeline + item.durationMs) {
					return true;
				} else {
					progressThroughTimeline += item.durationMs;
					return false;
				}
			});
			if (hitBox === undefined)
				throw new GameError(`did not find hitbox for animation "${this.location}"`);

			// The hitbox is empty at this point in the timeline, cache it and return null
			if (hitBox.empty) {
				if (!avoidCache) this.hitBoxCache.set(this.game.timestampMs, null);
				return null;
			}

			const gridBox = {
				gridX: positionX + hitBox.x / this.game.gridSize,
				gridY: positionY + hitBox.y / this.game.gridSize,
				gridWidth: hitBox.width / this.game.gridSize,
				gridHeight: hitBox.height / this.game.gridSize,
			};

			// Set hitbox cache
			if (!avoidCache) this.hitBoxCache.set(this.game.timestampMs, gridBox);

			return gridBox;
		}

		return null;
	}
}
