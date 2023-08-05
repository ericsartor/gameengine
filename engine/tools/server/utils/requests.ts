import { FastifyRequest } from 'fastify';
import zod, { ZodSchema } from 'zod';
import { RouteError } from '../routeHandler';
import { createZodErrorMessage } from '../zodError';

// URL Params
export const getStringParamByName = (req: FastifyRequest, paramName: string): string => {
	const schema = zod.object({
		[paramName]: zod.string(),
	});
	const params = schema.safeParse(req.params);
	if (!params.success) {
		throw new RouteError(`url param '${paramName}' was missing`, 400);
	}
	return params.data[paramName];
};
export const getNumericParamByName = (req: FastifyRequest, paramName: string): number => {
	const stringValue = getStringParamByName(req, paramName);
	const numericValue = Number(stringValue);
	if (isNaN(numericValue)) {
		throw new RouteError(`param '${paramName}' must be numeric`, 400);
	}
	return numericValue;
};

// URL Queries
export const getStringQueryValuesByName = (req: FastifyRequest, queryName: string): string[] => {
	const schema = zod.object({
		[queryName]: zod.union([zod.array(zod.string()), zod.string()]),
	});
	const query = schema.safeParse(req.query);
	if (!query.success) {
		throw new RouteError(`url query '${queryName}' was missing`, 400);
	}
	const value = query.data[queryName];
	return Array.isArray(value) ? value : [value];
};

// Request body
export const getBodyAsSchema = <T>(req: FastifyRequest, schema: ZodSchema<T>): T => {
	const body = schema.safeParse(req.body);
	if (!body.success) throw new RouteError(createZodErrorMessage(body.error), 400);
	return body.data;
};
