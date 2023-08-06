import zod, { number } from 'zod';
import { zSheet } from '../../lib/Sheet';
import { FastifyInstance } from 'fastify';
import { RouteError, routeHandler } from './routeHandler';
import { validateAssetDependency, validateGridSize, validateLocation } from './utils/validation';
import { placeFileInGameDir } from './utils/files';
import {
	getBodyAsSchema,
	getStringParamByName,
	getStringQueryValuesByName,
} from './utils/requests';
import { zAnimation } from '../../lib/Animation';

const zSheetMetadataParams = zod.object({
	gameName: zod.string(),
});

export const handleAssets = (f: FastifyInstance) => {
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
	f.post(
		'/game/:gameName/animation/metadata',
		routeHandler(async (req) => {
			// Get body
			const body = getBodyAsSchema(req, zAnimation);
			const { location, timelines, sheets, hitBoxTimeline, hitBox, origin, width, height } = body;

			// Get game name
			const gameName = getStringParamByName(req, 'gameName');

			// Validate location
			validateLocation(location);

			// Validate sheets
			if (sheets.length === 0) {
				throw new RouteError('animation cannot have 0 sheets', 400);
			}
			sheets.forEach((sheet, i) => {
				validateAssetDependency(gameName, sheet.location, 'sheet');
				sheet.colorFilterSelections.forEach((selection, j) => {
					if (typeof selection === 'string' && !selection.match(/^#([0-9a-fA-F]){6}$/)) {
						throw new RouteError(
							`sheet ${i} has an invalid color selection at index ${j}, it should be either null or a hex code with leading #`,
							400,
						);
					}
				});
			});

			// Validate timelines
			if (timelines.length === 0) {
				throw new RouteError('animation cannot have 0 timelines', 400);
			}
			const numberProps = ['x', 'y', 'offsetX', 'offsetY', 'width', 'height', 'durationMs'];
			timelines.forEach((timeline, t) => {
				if (timeline.length === 0) {
					throw new RouteError(`timeline at index ${t} is empty`, 400);
				}
				timeline.forEach((item, i) => {
					if (item.sheetIndex < 0 || item.sheetIndex >= sheets.length) {
						throw new RouteError(
							`invalid sheet index of '${item.sheetIndex}' in item ${i} of timeline ${t}`,
							400,
						);
					}
					const invalidNumberProps = Object.entries(item).filter(([key, value]) => {
						return numberProps.includes(key) && typeof value === 'number' && value < 1;
					});
					if (invalidNumberProps.length > 0) {
						throw new RouteError(
							`item ${i} of timeline ${t} has some invalid numeric values (less than 1): ${invalidNumberProps.join(
								', ',
							)}`,
							400,
						);
					}
				});
			});

			// Validate hitbox timeline
			if (hitBoxTimeline !== null) {
				hitBoxTimeline.forEach((item, i) => {
					const invalidNumberProps = Object.entries(item).filter(([key, value]) => {
						return numberProps.includes(key) && typeof value === 'number' && value < 1;
					});
					if (invalidNumberProps.length > 0) {
						throw new RouteError(
							`item ${i} of hitbox timeline has some invalid numeric values (less than 1): ${invalidNumberProps.join(
								', ',
							)}`,
							400,
						);
					}
				});
			}

			// Validate hitbox
			if (hitBox !== null) {
				const invalidNumberProps = Object.entries(hitBox).filter(([key, value]) => {
					return numberProps.includes(key) && typeof value === 'number' && value < 1;
				});
				if (invalidNumberProps.length > 0) {
					throw new RouteError(
						`hitbox has some invalid numeric values (less than 1): ${invalidNumberProps.join(
							', ',
						)}`,
						400,
					);
				}
			}

			// Validate origin
			const invalidNumberPropsOrigin = Object.entries(origin).filter(([key, value]) => {
				return numberProps.includes(key) && typeof value === 'number' && value < 1;
			});
			if (invalidNumberPropsOrigin.length > 0) {
				throw new RouteError(
					`origin has some invalid numeric values (less than 1): ${invalidNumberPropsOrigin.join(
						', ',
					)}`,
					400,
				);
			}

			// Validate root object
			const invalidNumberPropsRoot = Object.entries(body).filter(([key, value]) => {
				return numberProps.includes(key) && typeof value === 'number' && value < 1;
			});
			if (invalidNumberPropsRoot.length > 0) {
				throw new RouteError(
					`animation has some invalid numeric values (less than 1): ${invalidNumberPropsRoot.join(
						', ',
					)}`,
					400,
				);
			}

			// Place file in game dir
			placeFileInGameDir(gameName, location, 'animation', JSON.stringify(body), 'utf8');
		}),
	);
};
