import { Game } from '../../../engine/Game';

export const addControllablePawn = (game: Game, pawnName?: string, pawnFile?: string) => {
	const definedPawnName = pawnName ?? 'controllable-pawn';
	game.input.remap('MoveNorth', 'KeyW');
	game.input.remap('MoveEast', 'KeyD');
	game.input.remap('MoveSouth', 'KeyS');
	game.input.remap('MoveWest', 'KeyA');
	game.registerPawn(definedPawnName, pawnFile ?? '/testdata/player-test-static-hitbox.json');
	game.registerLogic((deltaMs: number, timestampMs: number) => {
		const deltaSeconds = deltaMs / 1000;
		const p = game.getPawn(definedPawnName);

		let pressedInputTimestamp = Infinity;
		let animationToPlay = 'Idle';

		let xMovement = 0;
		let yMovement = 0;
		const speed = 4;
		const maxDistance = deltaSeconds * speed;

		let input = game.input.get('MoveNorth');
		if (input.pressed) {
			yMovement -= input.value * maxDistance;
			animationToPlay = 'MoveNorth';
			pressedInputTimestamp = input.timestampMs;
		}
		input = game.input.get('MoveSouth');
		if (input.pressed) {
			yMovement += input.value * maxDistance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = 'MoveSouth';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		input = game.input.get('MoveWest');
		if (input.pressed) {
			xMovement -= input.value * maxDistance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = 'MoveWest';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		input = game.input.get('MoveEast');
		if (input.pressed) {
			xMovement += input.value * maxDistance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = 'MoveEast';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		if (animationToPlay !== 'Idle') p.setAnimation(animationToPlay, timestampMs);
		else p.stopAnimation();
		const newX = p.position.gridX + xMovement;
		const newY = p.position.gridY + yMovement;
		p.moveTowards(newX, newY, 4);
	});
};
