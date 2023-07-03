import { Game } from '../../../engine/Game';
import { adjustDiagonalDistance } from '../../../engine/utils';

export const addControllablePawn = (game: Game, pawnName?: string) => {
	const definedPawnName = pawnName ?? 'controllable-pawn';
	game.input.remap('RunNorth', 'KeyW');
	game.input.remap('RunEast', 'KeyD');
	game.input.remap('RunSouth', 'KeyS');
	game.input.remap('RunWest', 'KeyA');
	game.registerPawn(definedPawnName, '/testdata/player-test-static-hitbox.json');
	game.registerLogic((deltaMs: number, timestampMs: number) => {
		const deltaSeconds = deltaMs / 1000;
		const p = game.getPawn(definedPawnName);

		let pressedInputTimestamp = Infinity;
		let animationToPlay = 'Idle';

		let xMovement = 0;
		let yMovement = 0;
		const maxDistance = deltaSeconds * 4;

		let input = game.input.get('RunNorth');
		if (input.pressed) {
			yMovement -= input.value * maxDistance;
			animationToPlay = 'RunNorth';
			pressedInputTimestamp = input.timestampMs;
		}
		input = game.input.get('RunSouth');
		if (input.pressed) {
			yMovement += input.value * maxDistance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = 'RunSouth';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		input = game.input.get('RunWest');
		if (input.pressed) {
			xMovement -= input.value * maxDistance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = 'RunWest';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		input = game.input.get('RunEast');
		if (input.pressed) {
			xMovement += input.value * maxDistance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = 'RunEast';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		if (animationToPlay !== 'Idle') p.setAnimation(animationToPlay, timestampMs);
		else p.stopAnimation();
		game
			.getPawn(definedPawnName)
			.moveRelative(...adjustDiagonalDistance(xMovement, yMovement, maxDistance));
	});
};
