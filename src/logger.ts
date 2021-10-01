import { Request, RequestHandler } from 'express';
import { USE_CLS } from './util';

const cls = USE_CLS ? (require('cls-hooked') as typeof import('cls-hooked')) : undefined;
const namespace = cls?.createNamespace('logger');

export class RequestContext {
	public static middleware: RequestHandler = (req, _, next) => {
		if (namespace) {
			namespace.run(() => {
				RequestContext.initContext(req);
				next();
			});
		} else {
			next();
		}
	};

	private static initContext(req: Request) {
		if (namespace) {
			namespace.set('id', req.headers['x-cloud-trace-context']?.toString());
		}
	}

	public static get id(): string | undefined {
		return namespace?.get('id');
	}
}
