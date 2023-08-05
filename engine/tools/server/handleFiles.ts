import { FastifyInstance } from 'fastify';
import { routeHandler } from './routeHandler';
import { getStringParamByName, getStringQueryValuesByName } from './utils/requests';
import { moveGameFile } from './utils/files';

export const handleFiles = (f: FastifyInstance) => {
	f.post(
		'/game/:gameName/files/move',
		routeHandler(async (req) => {
			const gameName = getStringParamByName(req, 'gameName');
			const file = getStringQueryValuesByName(req, 'file')[0]; // With extension
			const to = getStringQueryValuesByName(req, 'to')[0]; // With extension
			moveGameFile(gameName, file, to);
			return {
				message: '',
				data: null,
			};
		}),
	);
};
