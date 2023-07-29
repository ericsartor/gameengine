import { FastifyInstance } from 'fastify';
import { RouteError, routeHandler } from './routeHandler';
import { createZodErrorMessage } from './zodError';
import zod from 'zod';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execPromise = promisify(exec);

const zNewGame = zod.object({
	name: zod.string(),
	gridSize: zod.number(),
});

const defaultViteHtmlFile = `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<!-- <link rel="icon" type="image/svg+xml" href="/vite.svg" /> -->
		<meta
			name="viewport"
			content="width=device-width, initial-scale=1.0" />
		<title>Engine</title>
		<style>
			body, div, canvas {
				overflow: hidden;
				box-sizing: border-box;
				margin: 0;
				padding: 0;
			}
		</style>
	</head>
	<body>
		<div
			id="game"
			style="width: 100vw; height: 100vh"></div>
		<script
			type="module"
			src="/src/main.ts"></script>
	</body>
</html>`;

const createDefaultMain = (
	gridSize: number,
) => `// Use \`npm run dev \` from within the root game folder to run your game

import { Game } from '../../../lib/Game';

// Create game instance and insert game canvas in page
const game = new Game({
	el: '#game', // target selector or node to place game within
	gridSize: ${gridSize}, // base grid size of game
	developmentMode: false, // enables various overlays and elements to aid in development
	scale: 1, // increase this to effectively set the default camera zoom
});

// TODO: implement some basic stuff like a stage and a controllable character as examples

// Start the game loop
await game.start();`;

export const handleNewGame = (f: FastifyInstance) => {
	f.post(
		'/new-game',
		routeHandler(async (req) => {
			const body = zNewGame.safeParse(req.body);
			if (!body.success) throw new RouteError(createZodErrorMessage(body.error), 400);

			// Make parent games folder if not made yet
			const gamesParentFolder = join(__dirname, '../../games');
			if (!existsSync(gamesParentFolder)) mkdir(gamesParentFolder);

			// Check for existence of game folder with provided name
			const gameFolder = join(gamesParentFolder, body.data.name);
			if (existsSync(gameFolder))
				throw new RouteError(`game with name "${body.data.name}" already exists`, 400);

			// Initialize game and make necessary subfolders
			process.chdir(gamesParentFolder);
			await execPromise(`npm create vite@latest ${body.data.name} -- --template vanilla-ts`);
			process.chdir(gameFolder);
			await Promise.all(
				['src', 'public'].map(async (dir) => {
					await rm(dir, { recursive: true, force: true });
					await mkdir(dir);
				}),
			);
			await Promise.all([
				// Set up HTML file
				writeFile('index.html', defaultViteHtmlFile, { encoding: 'utf8' }),

				// Set up main TS file
				writeFile('src/main.ts', createDefaultMain(body.data.gridSize), { encoding: 'utf8' }),

				// Set up Vite type file
				writeFile('src/vite-env.d.ts', '/// <reference types="vite/client" />', {
					encoding: 'utf8',
				}),

				// Create asset directories
				...['public/sheets', 'public/pawns', 'public/stages'].map((folder) =>
					mkdir(join(gameFolder, folder)),
				),
			]);
		}),
	);
};
