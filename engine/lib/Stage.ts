import { Game } from './Game';
import { Sheet } from './Sheet';
import { GameError } from './errors';
import { GridBox, createZodErrorMessage } from './utils';
import zod from 'zod';

const zStageItem = zod.object({
	sheetIndex: zod.number(),
	x: zod.number(),
	y: zod.number(),
	offsetX: zod.number(),
	offsetY: zod.number(),
	width: zod.number(),
	height: zod.number(),
});

const zStage = zod.object({
	location: zod.string(),
	sheets: zod.array(zod.string()),
	gridSize: zod.number(),
	hitBoxes: zod.array(
		zod.object({
			gridX: zod.number(),
			gridY: zod.number(),
			gridWidth: zod.number(),
			gridHeight: zod.number(),
		}),
	),
	// array of columns -> array of cells in column -> array of items in draw order
	grid: zod.array(zod.array(zod.array(zStageItem))),
});

export type StageInit = {
	location: string;
	hitBoxes: GridBox[];
	gridSize: number;
	sheets: string[];
	grid: zod.infer<typeof zStageItem>[][][]; // Column (x), cell (y), layers, spritesheet coordinates
};

export class Stage {
	location: string;
	gridSize: number;
	game: Game;
	hitBoxes: GridBox[];
	grid: zod.infer<typeof zStageItem>[][][];
	sheets: Sheet[];

	static _inventory = new Map<string, Stage>();
	constructor(init: StageInit, game: Game, updateMap = true) {
		this.location = init.location;
		this.gridSize = init.gridSize;
		this.game = game;
		this.hitBoxes = init.hitBoxes;
		this.grid = init.grid;

		// Get instances of all necessary sheets
		this.sheets = init.sheets.map((sheet) => {
			const instance = Sheet._inventory.get(sheet);
			if (!instance) throw new GameError(`no sheet found at ${sheet}`);
			return instance;
		});

		// Track animation
		if (updateMap) Stage._inventory.set(this.location, this);
	}

	static async _load(location: string, game: Game) {
		// Download pawn file
		const jsonData = await fetch(`${location}.stage`).then((r) => r.json());

		// Attempt to validate input
		const stageInit = zStage.safeParse(jsonData);
		if (!stageInit.success) {
			throw new GameError(`invalid stage init: ${createZodErrorMessage(stageInit.error)}`);
		}

		return new Stage(stageInit.data, game);
	}
}
