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
	constructor(game: Game, init: CameraInit) {
		if (init.position) this.position = init.position;
		this.game = game;
	}

	get gridWidth() {
		return this.game.canvas.width / (this.game.gridSize * this.game.scale * this.zoom);
	}
	get gridHeight() {
		return this.game.canvas.height / (this.game.gridSize * this.game.scale * this.zoom);
	}

	zoom = 1;
	nextZoom = 1;
	setZoom(zoom: number) {
		if (zoom <= 0) return;
		this.nextZoom = zoom;
	}
	changeZoom(change: number) {
		this.setZoom(this.zoom + change);
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
			box.gridX - this.gridWidth / 2 + box.gridWidth / 2,
			box.gridY - this.gridHeight / 2 + box.gridHeight / 2,
		);
	}
}
