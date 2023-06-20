import './style.css';
import { Game } from  '../../engine/Game.ts';
import { Input } from '../../engine/Input.ts';
import { Pawn } from '../../engine/Pawn.ts';

interface GameState {
    x: number;
    y: number;
}
const state: GameState = {
    x: 0,
    y: 0,
};

(async () => {
    // Create game instance, which will append elements to the body of the page
    const game = new Game({
        gridSize: 16,
        developmentMode: true, // enables overlay which eventually will be customizable
        inputInits: [
            {
                identifier: "KeyW",
                names: ["RunNorth"],
            },
            {
                identifier: "KeyA",
                names: ["RunWest"],
            },
            {
                identifier: "KeyS",
                names: ["RunSouth"],
            },
            {
                identifier: "KeyD",
                names: ["RunEast"],
            }
        ],
    });


    game.registerStage('test', {
        hitboxes: [
            { gridX: 3, gridY: 3, gridWidth: 1, gridHeight: 1 },
        ],
    }, true);
    
    // Register pawn files, must be done before starting game so they can be loaded
    // game.registerPawn('test', '/testdata/animation-test-1.json');
    game.registerPawn('test', '/testdata/player-test.json');
    
    // Run logic to modify state, and eventually, modify game assets when that's implemented
    let otherPawn: Pawn | null = null;
    let otherPawnTowards = 8;
    game.registerLogic((deltaMs: number, timestampMs: number) => {
        const deltaSeconds = deltaMs / 1000;

        if (otherPawn === null) {
            otherPawn = game.getPawn('test').clone();
            otherPawn.position.gridX = 5;
            otherPawn.position.gridY = 5;
            
        } else {
            if (otherPawn.position.gridX === otherPawnTowards) {
                otherPawnTowards = otherPawnTowards === 8 ? 5 : 8;
            }
            
            otherPawn.moveTowards(otherPawnTowards, otherPawn.position.gridY, 2);
        }

        // state.x += Math.random() * (Math.random() * 10 - 3) * deltaSeconds;
        // state.y += Math.random() * (Math.random() * 10 - 3) * deltaSeconds;

        // Test input buffer
        if (game.input.buffer.has('RunSouth')) {
            console.log('Just pressed RunSouth');
        }
    
        const p = game.getPawn('test');

        // TODO: known issue: if you going up+right or down+left, the animation is constantly changing so
        // it gets stuck on the first frame, technically not an engine bug but a game logic bug
        let pressedInputTimestamp = Infinity;
        let animationToPlay = 'Idle';

        let input = game.input.get('RunNorth');
        if (input.pressed) {
            game.getPawn('test').moveRelative(0, deltaSeconds * -4);
            animationToPlay = 'RunNorth';
            pressedInputTimestamp = input.timestampMs;
        }
        input = game.input.get('RunSouth');
        if (input.pressed) {
            game.getPawn('test').moveRelative(0, deltaSeconds * 4);
            if (input.timestampMs < pressedInputTimestamp) {
                animationToPlay = 'RunSouth';
                pressedInputTimestamp = input.timestampMs;
            }
        }
        input = game.input.get('RunWest');
        if (input.pressed) {
            game.getPawn('test').moveRelative(deltaSeconds * -4, 0);
            if (input.timestampMs < pressedInputTimestamp) {
                animationToPlay = 'RunWest';
                pressedInputTimestamp = input.timestampMs;
            }
        }
        input = game.input.get('RunEast');
        if (input.pressed) {
            game.getPawn('test').moveRelative(deltaSeconds * 4, 0);
            if (input.timestampMs < pressedInputTimestamp) {
                animationToPlay = 'RunEast';
                pressedInputTimestamp = input.timestampMs;
            }
        }
        if (animationToPlay !== 'Idle') p.setAnimation(animationToPlay, timestampMs);
    });
    
    // Drawing will mostly be handled by the engine, but custom draw functions
    // can be implemented, it was convenient for testing
    // game.registerCustomDraw(() => {
    //     game.ctx.fillRect(state.x * game.gridSize, state.y * game.gridSize, game.gridSize, game.gridSize)
    // });

    game.onLoadProgress((progress) => {
        console.log(progress.message, progress.current, progress.total);
    });
    game.onLoadComplete(() => {
        console.log('load complete');
    });
    
    // Start the game loop
    await game.start();
})();
