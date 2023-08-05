import { FastifyInstance } from 'fastify';
import { routeHandler } from './routeHandler';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createOrUpdateGameMeta, getGameMeta, zGameMeta } from './utils/gameMeta';
import { getBodyAsSchema, getStringParamByName } from './utils/requests';
const execPromise = promisify(exec);

export const handleGame = (f: FastifyInstance) => {
	f.post(
		'/game/:gameName/metadata',
		routeHandler(async (req) => {
			// Get body
			const body = getBodyAsSchema(req, zGameMeta);

			// Get game name
			const gameName = getStringParamByName(req, 'gameName');

			// Update meta
			const newMeta = createOrUpdateGameMeta({
				...body,
				name: gameName,
			});
			return {
				message: '',
				data: newMeta,
			};
		}),
	);
	f.get(
		'/game/:gameName/metadata',
		routeHandler(async (req) => {
			// Get game name
			const gameName = getStringParamByName(req, 'gameName');

			// Update meta
			const meta = getGameMeta(gameName);
			return {
				message: '',
				data: meta,
			};
		}),
	);
};
