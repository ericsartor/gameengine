import './style.css';
import { Game } from  '../../engine/Game.ts';
import { animationTest1 } from './testdata/animationTest1.ts';
import { Pawn } from '../../engine/Pawn.ts';

interface GameState {
    x: number;
    y: number;
}
const state: GameState = {
    x: 0,
    y: 0,
};

// Create game instance, which will append elements to the body of the page
const game = new Game({
    developmentMode: true, // enables overlay which eventually will be customizable
});

const p = new Pawn('test1', animationTest1);

// Run logic to modify state, and eventually, modify game assets when that's implemented
game.registerLogic((deltaMs: number, timestampMs: number) => {
    const deltaSeconds = deltaMs / 1000;
    state.x += Math.random() * (Math.random() * 10 - 3) * deltaSeconds;
    state.y += Math.random() * (Math.random() * 10 - 3) * deltaSeconds;

    if (timestampMs > 1000 && p.currentAnimation === null) p.setAnimation('walk-left', timestampMs);
});

// Drawing will mostly be handled by the engine, but custom draw functions
// can be implemented, it was convenient for testing
game.registerCustomDraw(() => {
    game.ctx.fillRect(state.x * game.gridSize, state.y * game.gridSize, game.gridSize, game.gridSize)
});

// Start the game loop
game.start();