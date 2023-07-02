import { Game } from '../../../engine/Game.ts';
import { addBasicStage, addStageWithHitbox } from '../utils/stages.ts';
import { addControllablePawn } from '../utils/controllableCharacter.ts';
import { addPathPawn } from '../utils/pathing.ts';
import { centerCameraOnPawn, enableCameraMovementWithArrowKeys } from '../utils/camera.ts';

export const stageTest = async () => {
	// Create game instance, which will append elements to the body of the page
	const game = new Game({
		el: '#game',
		gridSize: 16,
		developmentMode: true, // enables overlay which eventually will be customizable
		// screenSize: {
		//     width: Math.round(window.innerWidth / 2),
		//     height: Math.round(window.innerHeight / 2),
		// },
		scale: 3,
	});

	addBasicStage(game);
	const pawnName = 'pawn';
	addControllablePawn(game, pawnName);
	// addPathPawn(game, 2, true, [
	//     { gridX: 4, gridY: 4 },
	//     { gridX: 8, gridY: 4 },
	//     { gridX: 8, gridY: 8 },
	//     { gridX: 4, gridY: 4 },
	// ]);
	// enableCameraMovementWithArrowKeys(game, 5);
	centerCameraOnPawn(game, pawnName);

	// Start the game loop
	await game.start();
};
