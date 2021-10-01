import express from 'express';
import { RequestContext } from './logger';
import { simulateCallDepth, simulateCallSize } from './test';
import { getTraceId, USE_CLS } from './util';

const app = express();
const port = process.env.PORT ?? 8080;

// Request Context (CLS) middleware
app.use(RequestContext.middleware);

app.get('/depth/:depth', (req, res) => {
	const depth = Number(req.params.depth);
	simulateCallDepth(depth, USE_CLS ? undefined : req);
	res.send(`${getTraceId(req)}\n`);
});

app.get('/size/:size', (req, res) => {
	const size = Number(req.params.size);
	simulateCallSize(size, USE_CLS ? undefined : req);
	res.send(`${getTraceId(req)}\n`);
});

app.listen(port, () => {
	console.log(`App running on port ${port}`);
});
