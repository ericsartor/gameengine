import zod from 'zod';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'path';
import { RouteError } from '../routeHandler';

export const GAMES_DIR = resolve(join(__dirname, '../../../games'));
const GAME_META_FILE_NAME = 'game.json';

export const zGameMeta = zod.object({
	name: zod.string(),
	gridSize: zod.number(),
});

export type GameMeta = zod.infer<typeof zGameMeta>;

const readGameMeta = (gameFolder: string): GameMeta => {
	if (!existsSync(GAMES_DIR)) {
		throw new RouteError(`game folder '${gameFolder}' doesn't exist`, 500);
	}
	const metaFilePath = join(gameFolder, GAME_META_FILE_NAME);
	const data = readFileSync(metaFilePath, { encoding: 'utf8' });
	const parsedData = JSON.parse(data);
	const validated = zGameMeta.safeParse(parsedData);
	if (!validated.success) {
		throw new RouteError(`game at '${gameFolder}' has invalid '${GAME_META_FILE_NAME}'`, 500);
	}
	return validated.data;
};

export const getGameDir = (gameName: string): string => {
	if (!existsSync(GAMES_DIR)) {
		throw new RouteError(`game with name '${gameName}' was not found in games directory`, 404);
	}
	let meta: GameMeta | null = null;
	const gameFolders = readdirSync(GAMES_DIR);
	for (const folder of gameFolders) {
		meta = readGameMeta(join(GAMES_DIR, folder));
		if (meta.name === gameName) return resolve(join(GAMES_DIR, folder));
	}
	throw new RouteError(`game with name '${gameName}' was not found in games directory`, 404);
};

export const getGameMeta = (gameName: string): GameMeta => {
	const gameDir = getGameDir(gameName);
	return readGameMeta(gameDir);
};

export const createOrUpdateGameMeta = (
	update: Pick<GameMeta, 'name'> & Partial<GameMeta>,
): GameMeta => {
	// Either get current meta or default to epty object
	const gameDir = getGameDir(update.name);
	const metaPath = join(gameDir, GAME_META_FILE_NAME);
	const currentMeta: GameMeta | {} = existsSync(metaPath) ? getGameMeta(update.name) : {};

	// Create new meta
	const newMeta = {
		...currentMeta,
		...update,
	};
	const newMetaWithDefaults = {
		...newMeta,
		gridSize: newMeta.gridSize ?? 16,
	};

	// Write file down
	writeFileSync(metaPath, JSON.stringify(newMetaWithDefaults, undefined, 4), {
		encoding: 'utf8',
	});

	return newMetaWithDefaults;
};
