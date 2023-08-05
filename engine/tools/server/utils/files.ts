import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { getGameDir } from './gameMeta';
import { join } from 'path';
import { renameSync, readFileSync } from 'fs';
import { RouteError } from '../routeHandler';
import zod from 'zod';

const supportedGameFileExtensions = ['sheet', 'animation', 'pawn', 'stage'];

export const placeFileInGameDir = (
	gameName: string,
	location: string,
	type: string,
	data: any,
	encoding?: BufferEncoding,
) => {
	const gameDir = getGameDir(gameName);
	const locationSplit = location.split('/');
	const fileFolder = join(gameDir, 'public', locationSplit.slice(0, -1).join('/').slice(1));
	const fileName = `${locationSplit.pop()}.${type}`;
	if (!existsSync(fileFolder)) {
		mkdirSync(fileFolder, { recursive: true });
	}
	writeFileSync(join(fileFolder, fileName), data, { encoding });
};

// export const readGameFile = (gameName: string, file: string) => {

// };

const zGameFile = zod.object({
	location: zod.string(),
});

export const moveGameFile = (gameName: string, file: string, newFile: string) => {
	// Validate extensions were inlcuded
	if (!file.includes('.')) {
		throw new RouteError(`missing file extension on file to move '${file}'`, 400);
	}
	if (!newFile.includes('.')) {
		throw new RouteError(`missing file extension on new file location '${newFile}'`, 400);
	}

	// Get the source extension/location
	const fileSplit = file.split('.');
	const extension = fileSplit.pop();
	if (extension === undefined || !supportedGameFileExtensions.includes(extension)) {
		throw new RouteError(
			`unsupported file extension '${extension ?? 'undefined'}' on current file '${file}'`,
			400,
		);
	}
	const sourceLocation = fileSplit.join('.');

	// Get the new location
	const newFileSplit = newFile.split('.');
	const newExtension = newFileSplit.pop();
	if (newExtension === undefined || !supportedGameFileExtensions.includes(newExtension)) {
		throw new RouteError(
			`unsupported file extension '${newExtension ?? 'undefined'}' on new file '${newFile}'`,
			400,
		);
	}
	const newLocation = newFileSplit.join('.');

	if (extension !== newExtension) {
		throw new RouteError(`old and new file extension are not the same: ${file}, ${newFile}`, 400);
	}

	// Construct old and new locations
	const gameDir = getGameDir(gameName);
	const absoluteSourceLocation = join(gameDir, 'public', sourceLocation);
	const absoluteNewLocation = join(gameDir, 'public', newLocation);

	// Decided what file extensions are involved in the move
	const extensionsToCheck = [extension];
	if (extension === 'sheet') {
		extensionsToCheck.push('png');
	}

	// Check if there are any invalid moves
	extensionsToCheck.forEach((extension) => {
		const oldFileLocation = `${absoluteSourceLocation}.${extension}`;
		if (!existsSync(oldFileLocation)) {
			throw new RouteError(`current file '${file}' does not exist and cannot be moved`, 400);
		}
		const newFileLocation = `${absoluteNewLocation}.${extension}`;
		if (existsSync(newFileLocation)) {
			throw new RouteError(`new file path '${newFile}' already exists`, 400);
		}
	});

	// Move files by writing to new location then deleting old
	const oldFilePath = `${absoluteSourceLocation}.${extension}`;
	const rawData = JSON.parse(readFileSync(oldFilePath, { encoding: 'utf8' }));
	const data = zod.record(zod.any()).safeParse(rawData);
	if (!data.success) {
		throw new RouteError(`game file '${file}' is corrupt; it is no longer a JSON object`, 400);
	}
	const newData = {
		...data.data,
		location: newLocation,
	};
	placeFileInGameDir(gameName, newLocation, newExtension, JSON.stringify(newData), 'utf8');

	// Move PNG for sheets
	if (extension === 'sheet') {
		const oldFileLocation = `${absoluteSourceLocation}.png`;
		const newFileLocation = `${absoluteNewLocation}.png`;
		renameSync(oldFileLocation, newFileLocation);
	}
};
