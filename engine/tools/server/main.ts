import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import zod from 'zod';
import { handleNewGame } from './handleNewGame';
import { handleGame } from './handleGame';
import { handleSheet } from './handleSheet';
import { handleFiles } from './handleFiles';

(async () => {
	const fastify = Fastify({
		logger: true,
	});

	// Set up support for multipart form request bodies
	fastify.register(multipart);

	// Routes
	handleNewGame(fastify);
	handleGame(fastify);
	handleSheet(fastify);
	handleFiles(fastify);

	// Fallback route for front end assets
	fastify.get('/', async function handler(request, reply) {
		return '/get route has not been configured yet';
	});

	// Run the server!
	try {
		const port = 3000;
		await fastify.listen({ port: port });
		console.log('');
		console.log('');
		console.log(`tools live at http://localhost:${port}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
})();
