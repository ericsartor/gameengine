import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

type Result = {
	message: string; // Empty on 200
	data: any; // null on non-200 (but also potentially on 200)
};
export class RouteError extends Error {
	code: number;
	constructor(message: string, code: number) {
		super(message);
		this.code = code;
	}
}

export const routeHandler = (handler: (req: FastifyRequest) => Promise<Result | void>) => {
	return async (req: FastifyRequest, reply: FastifyReply) => {
		try {
			const result = await handler(req);
			reply.code(200).send(
				result ?? {
					message: '',
					data: null,
				},
			);
		} catch (e) {
			if (e instanceof RouteError) {
				reply.code(e.code).send({
					message: e.message,
					data: null,
				});
			} else if (e instanceof Error) {
				reply.code(500).send({
					message: e.message,
					data: null,
				});
			} else if (typeof e?.toString === 'function') {
				reply.code(500).send({
					message: e.toString(),
				});
			} else {
				reply.code(500).send({
					message: 'unknown error occured',
					data: null,
				});
			}
		}
	};
};
