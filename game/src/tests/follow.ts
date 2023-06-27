import { Game } from  '../../../engine/Game.ts';
import { addStageWithHitbox } from '../utils/stageWithHitbox.ts';
import { addControllablePawn } from '../utils/controllableCharacter.ts';
import { centerCameraOnPawn } from '../utils/camera.ts';

export const followerTest = async () => {
    // Create game instance, which will append elements to the body of the page
    const game = new Game({
        gridSize: 16,
        developmentMode: true, // enables overlay which eventually will be customizable
        screenSize: {
            width: 400,
            height: 400,
        },
        scale: 2,
    });

    addStageWithHitbox(game);
    const playerPawnName = 'pawn';
    addControllablePawn(game, playerPawnName);
    centerCameraOnPawn(game, playerPawnName);
    game.registerPawn('follower', '/testdata/player-test-static-hitbox.json', (pawn) => {
        pawn.position.gridX = 5;
        pawn.position.gridY = 5;
    });

    game.registerLogic((deltaMs) => {
        const player = game.getPawn(playerPawnName);
        const follower = game.getPawn('follower');
        follower.moveTowards(player.position.gridX, player.position.gridY, 2);
    });
    
    // Start the game loop
    await game.start();
};
