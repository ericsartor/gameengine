import { Game } from '../../../engine/lib/Game';

const game = new Game({
	gridSize: 16,
	developmentMode: true, // enables overlay which eventually will be customizable
});

game.onLoadProgress((progress) => {
	console.log(progress.message, progress.current, progress.total);
});
game.onLoadComplete(() => {
	console.log('load complete');
});
