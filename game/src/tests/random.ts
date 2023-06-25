import { Game } from  '../../../engine/Game.ts';
import { addStageWithHitbox } from '../utils/stageWithHitbox.ts';
import { addControllablePawn } from '../utils/controllableCharacter.ts';
import { addPathPawn } from '../utils/pathing.ts';
import { enableCameraMovementWithArrowKeys } from '../utils/camera.ts';

export const randomTest = async () => {
    // Create game instance, which will append elements to the body of the page
    const game = new Game({
        gridSize: 16,
        developmentMode: true, // enables overlay which eventually will be customizable
    });

    addStageWithHitbox(game);
    addControllablePawn(game);
    addPathPawn(game, 2, true, [
        { gridX: 4, gridY: 4 },
        { gridX: 8, gridY: 4 },
        { gridX: 8, gridY: 8 },
        { gridX: 4, gridY: 4 },
    ]);
    enableCameraMovementWithArrowKeys(game, 5);
    
    // Start the game loop
    await game.start();
};
