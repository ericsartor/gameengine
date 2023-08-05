import zod from 'zod';
import { zSheet } from '../../lib/Sheet';
import { FastifyInstance } from 'fastify';
import { RouteError, routeHandler } from './routeHandler';
import { validateGridSize, validateLocation } from './utils/validation';
import { placeFileInGameDir } from './utils/files';
import {
	getBodyAsSchema,
	getStringParamByName,
	getStringQueryValuesByName,
} from './utils/requests';

const zSheetMetadataParams = zod.object({
	gameName: zod.string(),
});

export const handleSheet = (f: FastifyInstance) => {
	f.post(
		'/game/:gameName/sheet/metadata',
		routeHandler(async (req) => {
			// Get body
			const body = getBodyAsSchema(req, zSheet);
			const { location, tileData, gridSize } = body;

			// Validate body
			validateLocation(location);
			validateGridSize(gridSize);
			const invalidTileDatas = Object.entries(tileData).filter(([coord, data]) => {
				const { gridX, gridY, gridWidth, gridHeight } = data;
				return (
					[gridX, gridY].some((num) => num < 0) || [gridWidth, gridHeight].some((num) => num < 1)
				);
			});
			if (invalidTileDatas.length > 0) {
				throw new RouteError(
					`some tile datas contained invalid numbers: ${invalidTileDatas
						.map(([coord]) => `"${coord}"`)
						.join(', ')}`,
					400,
				);
			}

			// Get game name
			const gameName = getStringParamByName(req, 'gameName');

			// Place file in game dir
			placeFileInGameDir(gameName, location, 'sheet', JSON.stringify(body), 'utf8');
		}),
	);
	f.post(
		'/game/:gameName/sheet/image',
		routeHandler(async (req) => {
			// Get game name
			const gameName = getStringParamByName(req, 'gameName');

			// Get image
			const file = await req.file();
			if (!file) {
				throw new RouteError('no files found in request body, an image is required', 400);
			}

			// Get location from query
			const locations = getStringQueryValuesByName(req, 'location');
			const location = Array.isArray(locations) ? locations[0] : locations;

			// Get data
			const data = await file.toBuffer();

			// Write file down
			placeFileInGameDir(gameName, location, 'png', data, 'binary');
		}),
	);
};
