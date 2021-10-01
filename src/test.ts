import { Request } from 'express';
import { getTraceId } from './util';

export function simulateCallDepth(depth: number, req?: Request, maxDepth?: number) {
	maxDepth = maxDepth ?? depth;
	console.log(`simulateCallDepth -- Trace ID: ${getTraceId(req)} -- Depth: ${maxDepth - depth + 1}/${maxDepth}`);
	if (depth > 1) {
		simulateCallDepth(depth - 1, req, maxDepth);
	}
}

export function simulateCallSize(size: number, req?: Request) {
	for (let i = 1; i <= size; i++) {
		console.log(`simulateCallDepth -- Trace ID: ${getTraceId(req)} -- Iteration: ${i}/${size}`);
	}
}
