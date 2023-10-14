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
		return this.game.canvas.width / (this.game.cellSize * this.game.scale * this.zoom);
	}
	get gridHeight() {
		return this.game.canvas.height / (this.game.cellSize * this.game.scale * this.zoom);
	}

	zoom = 1;
	nextZoom = 1;
	private virtualZoom = 1;
	private _zoomSteps = Array.from(
		new Set(
			[0, 1, 3, 4, 6, 9, 12, 14, 15, 17, 18, 20, 23, 25]
				.map((n) => [n, n + 25, n + 50, n + 75])
				.flat()
				.sort((a, b) => a - b),
		),
	);
	setZoom(zoom: number, resetVirtualZoom = true) {
		if (zoom <= 0) return;
		const zoomInt = Math.floor(zoom);
		const decimal = zoom - zoomInt;
		const roundedDecimal = Math.round(decimal * 100);
		let diff = Infinity;
		let stepToUse = 0;
		for (const step of this._zoomSteps) {
			const thisDiff = Math.abs(step - roundedDecimal);
			stepToUse = step;
			if (thisDiff > diff) {
				break;
			}
			diff = thisDiff;
		}
		this.nextZoom = zoomInt + stepToUse / 100;
		console.log(zoom, this.virtualZoom, stepToUse, this.nextZoom);
		if (resetVirtualZoom) this.virtualZoom = this.nextZoom;
	}
	changeZoom(change: number) {
		this.virtualZoom += change;
		this.setZoom(this.virtualZoom, false);
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
