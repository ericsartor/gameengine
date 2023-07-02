import { Game } from '../../../engine/Game';

const game = new Game({
	gridSize: 16,
	developmentMode: true, // enables overlay which eventually will be customizable
	// inputInits: [
	//     {
	//         identifier: "KeyW",
	//         names: ["RunNorth"],
	//     },
	//     {
	//         identifier: "KeyA",
	//         names: ["RunWest"],
	//     },
	//     {
	//         identifier: "KeyS",
	//         names: ["RunSouth"],
	//     },
	//     {
	//         identifier: "KeyD",
	//         names: ["RunEast"],
	//     }
	// ],
});

game.registerLogic(() => {
	// Test input buffer
	if (game.input.buffer.has('RunSouth')) {
		console.log('Just pressed RunSouth');
	}
});
