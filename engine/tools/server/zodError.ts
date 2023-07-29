import { ZodError } from 'zod';

export const createZodErrorMessage = (e: ZodError): string => {
	return e.issues
		.map((issue) => {
			const path = Array.isArray(issue.path) ? issue.path : [issue.path];
			return `[${path.join('.')}] ${issue.message}`;
		})
		.join(' | ');
};
