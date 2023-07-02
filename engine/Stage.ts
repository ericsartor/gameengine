import { Game } from './Game';
import { GameError } from './errors';
import { GridBox } from './utils';
import zod from 'zod';

const zStage = zod.object({
	sheet: zod.string(),
	gridSize: zod.number(),
	hitBoxes: zod.array(
		zod.object({
			gridX: zod.number(),
			gridY: zod.number(),
			gridWidth: zod.number(),
			gridHeight: zod.number(),
		}),
	),
	grid: zod.array(zod.array(zod.array(zod.array(zod.tuple([zod.number(), zod.number()]))))),
});

export const loadStageFromFile = async (name: string, filePath: string, game: Game) => {
	// Download pawn file
	const jsonData = await fetch(filePath).then((r) => r.json());

	// Attempt to validate input
	const stageInit = zStage.safeParse(jsonData);
	if (!stageInit.success) {
		throw new GameError('invalid stage init');
	}

	const spritesheetData = await fetch(stageInit.data.sheet).then((r) => r.blob());

	return new Stage(
		name,
		{
			hitboxes: stageInit.data.hitBoxes,
			spritesheet: URL.createObjectURL(spritesheetData),
			grid: stageInit.data.grid,
		},
		game,
	);
};

export type StageInit = {
	hitboxes: GridBox[];
	spritesheet: string;
	grid: [number, number][][][][]; // Column (x), cell (y), layers, spritesheet coordinates
};

export class Stage {
	name: string;
	game: Game;
	hitboxes: GridBox[];
	spritesheet: string;
	grid: [number, number][][][][];
	canvas: HTMLCanvasElement = document.createElement('canvas');
	context: CanvasRenderingContext2D = this.canvas.getContext('2d')!;

	constructor(name: string, init: StageInit, game: Game) {
		this.name = name;
		this.game = game;
		this.hitboxes = init.hitboxes;
		this.spritesheet = init.spritesheet;
		this.grid = init.grid;

		// Set up canvases
		const img = new Image();
		img.src = this.spritesheet;
		img.onload = () => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (ctx === null) throw new GameError(`could not initialize context for Pawn ${name}`);
			ctx.imageSmoothingEnabled = false;
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			ctx.drawImage(img, 0, 0);
			this.canvas = canvas;
			this.context = ctx;
		};
	}
}
