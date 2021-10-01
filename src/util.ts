import { Request } from 'express';
import { RequestContext } from './logger';

export const USE_CLS = !!process.env.USE_CLS;

export const getTraceId = (req?: Request) => {
	if (USE_CLS) {
		return RequestContext.id;
	}
	return req?.headers?.['x-cloud-trace-context']?.toString();
};
