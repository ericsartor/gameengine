import { Game } from '../../../engine/Game.ts';
import { addBasicStage, addStageWithHitbox } from '../utils/stages.ts';
import { addControllablePawn } from '../utils/controllableCharacter.ts';
import { centerCameraOnPawn } from '../utils/camera.ts';

export const followerTest = async () => {
	// Create game instance, which will append elements to the body of the page
	const game = new Game({
		el: '#game',
		gridSize: 16,
		drawGrid: true,
		developmentMode: true, // enables overlay which eventually will be customizable
		// screenSize: {
		//     width: 400,
		//     height: 400,
		// },
		scale: 3,
	});

	addBasicStage(game);
	const playerPawnName = 'pawn';
	addControllablePawn(game, playerPawnName);
	centerCameraOnPawn(game, playerPawnName);

	game.registerPawn('follower', '/testdata/player-test-static-hitbox.json', (pawn) => {
		pawn.position.gridX = 4;
		pawn.position.gridY = 4;
	});
	game.registerPawn('follower2', '/testdata/player-test-static-hitbox.json', (pawn) => {
		pawn.position.gridX = 4;
		pawn.position.gridY = 5;
	});
	game.registerLogic((deltaMs) => {
		const player = game.getPawn(playerPawnName);
		const follower = game.getPawn('follower');
		follower.moveTowards(player.position.gridX, player.position.gridY, 2);
		const follower2 = game.getPawn('follower2');
		follower2.moveTowards(
			player.position.gridX,
			player.position.gridY,
			follower2.getDistanceToPawn(player),
		);
	});

	// Start the game loop
	await game.start();
};
