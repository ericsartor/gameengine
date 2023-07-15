import Fastify from 'fastify';
import zod from 'zod';
import { handleNewGame } from './handleNewGame';

(async () => {
	const fastify = Fastify({
		logger: true,
	});

	// Routes
	handleNewGame(fastify);

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
