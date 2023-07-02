import { GridCoord } from './types';
import { GridBox } from './utils';
import { Game } from './Game';

type CameraInit = {
	width: number;
	height: number;
	position?: GridCoord;
};

export class Camera {
	game: Game;
	position: GridCoord = { gridX: 0, gridY: 0 };
	gridWidth: number;
	gridHeight: number;
	constructor(game: Game, init: CameraInit) {
		if (init.position) this.position = init.position;
		this.gridWidth = init.width / game.gridSize;
		this.gridHeight = init.height / game.gridSize;
		this.game = game;
	}
	set width(w: number) {
		this.gridWidth = w / this.game.gridSize;
	}
	set height(h: number) {
		this.gridHeight = h / this.game.gridSize;
	}

	moveTo(x: number, y: number) {
		this.position.gridX = x;
		this.position.gridY = y;
	}
	moveRelative(x: number, y: number) {
		this.moveTo(this.position.gridX + x, this.position.gridY + y);
	}
	centerOn(box: GridBox) {
		this.moveTo(
			box.gridX - (this.gridWidth - box.gridWidth) / 2,
			box.gridY - (this.gridHeight - box.gridHeight) / 2,
		);
	}
}
