import { FastifyInstance } from 'fastify';
import { RouteError, routeHandler } from './routeHandler';
import { createZodErrorMessage } from './zodError';
import zod from 'zod';

const zNewGame = zod.object({
	name: zod.string(),
	gridSize: zod.number(),
});

export const handleNewGame = (f: FastifyInstance) => {
	f.post('/new-game', async (req, reply) => {
		routeHandler(req, reply, async (req) => {
			const body = zNewGame.safeParse(req.body);
			if (!body.success) throw new RouteError(createZodErrorMessage(body.error), 400);
			return {
				message: 'success',
				data: body,
			};
		});
	});
};
