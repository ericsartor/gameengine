import { Game } from '../../../engine/Game';

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
		const distance = deltaSeconds * 4;

		let input = game.input.get('RunNorth');
		if (input.pressed) {
			// game.getPawn(definedPawnName).moveRelative(0, deltaSeconds * -4);
			yMovement -= input.value * distance;
			animationToPlay = 'RunNorth';
			pressedInputTimestamp = input.timestampMs;
		}
		input = game.input.get('RunSouth');
		if (input.pressed) {
			// game.getPawn(definedPawnName).moveRelative(0, deltaSeconds * 4);
			yMovement += input.value * distance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = 'RunSouth';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		input = game.input.get('RunWest');
		if (input.pressed) {
			// game.getPawn(definedPawnName).moveRelative(deltaSeconds * -4, 0);
			xMovement -= input.value * distance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = 'RunWest';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		input = game.input.get('RunEast');
		if (input.pressed) {
			// game.getPawn(definedPawnName).moveRelative(deltaSeconds * 4, 0);
			xMovement += input.value * distance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = 'RunEast';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		if (animationToPlay !== 'Idle') p.setAnimation(animationToPlay, timestampMs);
		else p.stopAnimation();
		if (xMovement !== 0 && yMovement !== 0) {
			const hypotenuse = Math.sqrt(xMovement ** 2 + yMovement ** 2);
			const xPercent = Math.abs(xMovement) / Math.abs(distance);
			const yPercent = Math.abs(yMovement) / Math.abs(distance);
			const averagePercent = (xPercent + yPercent) / 2;
			const reductionRatio = (distance * averagePercent) / hypotenuse;
			game
				.getPawn(definedPawnName)
				.moveRelative(xMovement * reductionRatio, yMovement * reductionRatio);
		} else {
			game.getPawn(definedPawnName).moveRelative(xMovement, yMovement);
		}
	});
};
