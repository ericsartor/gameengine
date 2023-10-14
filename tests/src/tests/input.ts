import { Input } from '../../../engine/lib/Input';
import { Game } from '../../../engine/lib/Game';
import { adjustDiagonalDistance } from '../../../engine/lib/utils';

const dev = import.meta.env.MODE === 'development';

export const testInput = () => {
	// Map inputs
	Input.mapInput('MoveNorth', 'KeyW');
	Input.mapInput('MoveNorth', 'ArrowUp');
	Input.mapInput('MoveWest', 'KeyA');
	Input.mapInput('MoveWest', 'ArrowLeft');
	Input.mapInput('MoveSouth', 'KeyS');
	Input.mapInput('MoveSouth', 'ArrowDown');
	Input.mapInput('MoveEast', 'KeyD');
	Input.mapInput('MoveEast', 'ArrowRight');

	// Create game
	const game = new Game({
		el: '#game',
		developmentMode: dev,
		drawGrid: dev,
		cellSize: 16,
		scale: 1,
	});

	// Set up basic pawn
	const canvas = document.createElement('canvas');
	canvas.width = 16;
	canvas.height = 16;
	const ctx = canvas.getContext('2d');
	if (ctx === null) throw Error('null ctx');
	ctx.fillStyle = 'red';
	ctx.fillRect(0, 0, 16, 16);
	const box = {
		x: 0,
		y: 0,
		northSpeed: 0,
		eastSpeed: 0,
		southSpeed: 0,
		westSpeed: 0,
		baseSpeed: 10, // This is in cells, not pixels
		canvas,
		ctx,
	};

	// Listen to game inputs to adjust movement speeds of pawn
	Input.addInputListener('MoveNorth', 'keyboard', (input) => {
		box.northSpeed = box.baseSpeed * input.value;
	});
	Input.addInputListener('MoveEast', 'keyboard', (input) => {
		box.eastSpeed = box.baseSpeed * input.value;
	});
	Input.addInputListener('MoveSouth', 'keyboard', (input) => {
		box.southSpeed = box.baseSpeed * input.value;
	});
	Input.addInputListener('MoveWest', 'keyboard', (input) => {
		box.westSpeed = box.baseSpeed * input.value;
	});

	// Handle updating pawn location
	game.registerLogic((deltaMs) => {
		const deltaSeconds = deltaMs / 1000;
		const newX = box.x + deltaSeconds * (box.eastSpeed - box.westSpeed);
		const newY = box.y + deltaSeconds * (box.southSpeed - box.northSpeed);
		const [adjustedX, adjustedY] = adjustDiagonalDistance(
			newX - box.x,
			newY - box.y,
			box.baseSpeed * deltaSeconds,
		);
		box.x += adjustedX;
		box.y += adjustedY;
	});

	// Draw pawn to screen every frame
	game.registerCustomDraw(() => {
		game.drawToCanvas(box.canvas, 0, 0, 0, 0, 16, 16, box.x, box.y);
	});

	// Start game loop
	game.start();
};
