import { Game } from '../../../engine/lib/Game';
import { GridCoord } from '../../../engine/lib/types';

export const addPathPawn = (game: Game, speed: number, loop: boolean, path: GridCoord[]) => {
	game.registerPawn('path-pawn', '/testdata/player-test-static-hitbox.json', (p) => {
		const pathStart = path[0];
		p.position.gridX = pathStart.gridX;
		p.position.gridY = pathStart.gridY;
		p.setPath(speed, loop, path);
	});
};
