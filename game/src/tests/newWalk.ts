import { Game } from '../../../engine/Game.ts';
import { addBasicStage, addStageWithHitbox } from '../utils/stages.ts';
import { addControllablePawn } from '../utils/controllableCharacter.ts';
import { addPathPawn } from '../utils/pathing.ts';
import { centerCameraOnPawn, enableCameraMovementWithArrowKeys } from '../utils/camera.ts';

export const newWalkTest = async () => {
	// Create game instance, which will append elements to the body of the page
	const game = new Game({
		el: '#game',
		gridSize: 16,
		developmentMode: false, // enables overlay which eventually will be customizable
		// screenSize: {
		//     width: 400,
		//     height: 400,
		// },
		scale: 8,
	});

	addBasicStage(game);
	const pawnName = 'pawn';
	addControllablePawn(game, pawnName, '/testdata/walk-test.json');
	// enableCameraMovementWithArrowKeys(game, 5);
	centerCameraOnPawn(game, pawnName);

	// Start the game loop
	await game.start();
};
