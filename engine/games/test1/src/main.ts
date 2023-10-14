import { Game } from '../../../lib/Game';

// Create game instance and insert game canvas in page
const game = new Game({
	el: '#game', // target selector or node to place game within
	cellSize: 16, // base grid size of game
	developmentMode: true, // enables various overlays and elements to aid in development
	scale: 6, // increase this to effectively set the default camera zoom
});

// TODO: implement some basic stuff like a stage and a controllable character as examples

game.registerFiles([
	'/sheets/test-character.sheet',
	'/sheets/test-stage.sheet',
	'/animations/test-character-move-east.animation',
	'/animations/test-character-move-west.animation',
	'/animations/test-character-move-north.animation',
	'/animations/test-character-move-south.animation',
	'/pawns/test-character.pawn',
	'/stages/test-stage.stage',
]);

// Start the game loop
await game.start(() => {
	game.input.remap('MoveNorth', 'KeyW');
	game.input.remap('MoveEast', 'KeyD');
	game.input.remap('MoveSouth', 'KeyS');
	game.input.remap('MoveWest', 'KeyA');
	const p = game.getPawn('/pawns/test-character');
	p.position.gridX = 1;
	p.position.gridY = 1;
	game.registerLogic((deltaMs: number) => {
		const deltaSeconds = deltaMs / 1000;

		let pressedInputTimestamp = Infinity;
		let animationToPlay = 'Idle';

		let xMovement = 0;
		let yMovement = 0;
		const speed = 4;
		const maxDistance = deltaSeconds * speed;

		let input = game.input.get('MoveNorth');
		if (input.pressed) {
			yMovement -= input.value * maxDistance;
			animationToPlay = '/animations/test-character-move-north';
			pressedInputTimestamp = input.timestampMs;
		}
		input = game.input.get('MoveSouth');
		if (input.pressed) {
			yMovement += input.value * maxDistance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = '/animations/test-character-move-south';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		input = game.input.get('MoveWest');
		if (input.pressed) {
			xMovement -= input.value * maxDistance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = '/animations/test-character-move-west';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		input = game.input.get('MoveEast');
		if (input.pressed) {
			xMovement += input.value * maxDistance;
			if (input.timestampMs < pressedInputTimestamp) {
				animationToPlay = '/animations/test-character-move-east';
				pressedInputTimestamp = input.timestampMs;
			}
		}
		if (animationToPlay !== 'Idle') p.setAnimation(animationToPlay);
		else p.stopAnimation();
		const newX = p.position.gridX + xMovement;
		const newY = p.position.gridY + yMovement;
		p.moveTowards(newX, newY, 4);

		game.camera.centerOn({
			gridX: p.position.gridX,
			gridY: p.position.gridY,
			gridWidth: 1,
			gridHeight: 1,
		});
	});
});
