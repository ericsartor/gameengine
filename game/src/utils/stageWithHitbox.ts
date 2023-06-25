import { Game } from "../../../engine/Game";

export const addStageWithHitbox = (game: Game) => {
    
    game.registerStage('test', {
        hitboxes: [
            { gridX: 3, gridY: 3, gridWidth: 1, gridHeight: 1 },
        ],
    }, true);
    
};