import { Game } from '../../../engine/Game';

const game = new Game({
	gridSize: 16,
	developmentMode: true, // enables overlay which eventually will be customizable
});

game.registerLogic(() => {
	// Drawing will mostly be handled by the engine, but custom draw functions
	// can be implemented, it was convenient for testing
	game.registerCustomDraw(() => {
		// game.ctx.fillRect(state.x * game.gridSize, state.y * game.gridSize, game.gridSize, game.gridSize)
	});
});
