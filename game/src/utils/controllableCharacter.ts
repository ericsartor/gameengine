import { Game } from "../../../engine/Game";

export const addControllablePawn = (game: Game) => {
    game.input.remap('RunNorth', 'KeyW');
    game.input.remap('RunEast', 'KeyD');
    game.input.remap('RunSouth', 'KeyS');
    game.input.remap('RunWest', 'KeyA');
    game.registerPawn('controllable-pawn', '/testdata/player-test-static-hitbox.json');
    game.registerLogic((deltaMs: number, timestampMs: number) => {
        const deltaSeconds = deltaMs / 1000;
        const p = game.getPawn('controllable-pawn');

        let pressedInputTimestamp = Infinity;
        let animationToPlay = 'Idle';

        let input = game.input.get('RunNorth');
        if (input.pressed) {
            game.getPawn('controllable-pawn').moveRelative(0, deltaSeconds * -4);
            animationToPlay = 'RunNorth';
            pressedInputTimestamp = input.timestampMs;
        }
        input = game.input.get('RunSouth');
        if (input.pressed) {
            game.getPawn('controllable-pawn').moveRelative(0, deltaSeconds * 4);
            if (input.timestampMs < pressedInputTimestamp) {
                animationToPlay = 'RunSouth';
                pressedInputTimestamp = input.timestampMs;
            }
        }
        input = game.input.get('RunWest');
        if (input.pressed) {
            game.getPawn('controllable-pawn').moveRelative(deltaSeconds * -4, 0);
            if (input.timestampMs < pressedInputTimestamp) {
                animationToPlay = 'RunWest';
                pressedInputTimestamp = input.timestampMs;
            }
        }
        input = game.input.get('RunEast');
        if (input.pressed) {
            game.getPawn('controllable-pawn').moveRelative(deltaSeconds * 4, 0);
            if (input.timestampMs < pressedInputTimestamp) {
                animationToPlay = 'RunEast';
                pressedInputTimestamp = input.timestampMs;
            }
        }
        if (animationToPlay !== 'Idle') p.setAnimation(animationToPlay, timestampMs);
        else p.stopAnimation();
    });
};