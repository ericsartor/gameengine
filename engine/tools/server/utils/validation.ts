import { RouteError } from '../routeHandler';
import { getGameDir } from './gameMeta';
import { join } from 'path';
import { existsSync } from 'fs';

// Grid size
export const validateGridSize = (gridSize: number) => {
	if (gridSize < 1) {
		throw new RouteError('gridSize must be greater than 0', 400);
	}
};

// Location
const invalidCharactersLocationRegexString = '[^a-zA-Z0-9\\-_\\/]';
const invalidCharactersLocationRegex = new RegExp(invalidCharactersLocationRegexString);
export const validateLocation = (location: string) => {
	if (location[0] !== '/') {
		throw new RouteError(`invalid location '${location}', should begin with a '/'`, 400);
	}
	if (location.match(invalidCharactersLocationRegex)) {
		throw new RouteError(
			`invalid location '${location}', must pass: ${invalidCharactersLocationRegexString}`,
			400,
		);
	}
};

export const validateAssetDependency = (
	gameName: string,
	dependencyLocation: string,
	type: string,
) => {
	const gameDir = getGameDir(gameName);
	const dependencyPath = join(gameDir, 'public', `${dependencyLocation}.${type}`);
	if (!existsSync(dependencyPath)) {
		throw new RouteError(`invalid dependency '${dependencyLocation}' doesnt exist`, 404);
	}
};