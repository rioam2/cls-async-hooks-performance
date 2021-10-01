# Async-Hooks & Continuation Local-Storage (CLS) Performance Analysis

This repository is used to test the utility and performance of using Continuation Local-Storage (CLS) for request-scoped context in NodeJS Express servers. Specifically, how does enabling the experimental NodeJS `async_hooks` API ([ref](https://nodejs.org/api/async_hooks.html)) negatively affect performance?

# Background

Consider a web server that receives many concurrent requests. For each request, multiple logs are generated. It is useful to see logs for each individual request grouped together. In Google Cloud, this can be accomplished by adding the `x-cloud-trace-context` header value to the log entry payload. The problem then becomes, how do we add this value to the log payload when the application has a very deep function call structure?

## Solution 1: Parameter Passing

The most obvious option is to pass the request itself to each function call as an argument. The header can then be read and logged as normal:

```js
export async function f1(req) {
	console.log({
		trace: req.headers.['x-cloud-trace-context']?.toString(),
		// ...
	});
	await f2(req);
}

export async function f2(req) {
	console.log({
		trace: req.headers.['x-cloud-trace-context']?.toString(),
		// ...
	});
	await f3(req);
}

export async function f3(req) {
	console.log({
		trace: req.headers.['x-cloud-trace-context']?.toString(),
		// ...
	});
	await f4(req);
}

export async function f4(req) {
	console.log({
		trace: req.headers.['x-cloud-trace-context']?.toString(),
		// ...
	});
}
```

When managing deep call structures and large function interfaces, this can become increasingly tedious. This is where CLS and `async_hooks` can help.

## Solution 2: CLS Call Context Scope

Using CLS, a context can be created around closures or call stacks. This is made possible by the NodeJS `async_hooks` API ([ref](https://nodejs.org/api/async_hooks.html)). Using this API, we can attach arbitrary values to a context scope and retrieve them without having to pass the values manually down to each function call.

Consider the following function call hierarchy:

```js
                                    CLS Context Scope
                          ______________________________________
                         |                                      |
    main()  ---->  context.run()  ---->  f1()  ---->  f2() ...  |
                         |______________________________________|
```

In this example, the `context.run()` function initializes a new CLS context scope. All functions called by this function will be able to access the context scope. This is denoted by the outlined box. Within this scope, values can be set and retrieved from the context object. More concretely, consider the following code from above (but now using CLS Context):

```js
// Add initial values to the request context
// In the diagram above, this would represent the context.run() function
app.use((req, _, next) => {
	context.run(() => {
		context.set('id', req.headers['x-cloud-trace-context']?.toString());
		next();
	});
});

export async function f1() {
	console.log({
		trace: context.get('id'),
		// ...
	});
	await f2();
}

export async function f2() {
	console.log({
		trace: context.get('id'),
		// ...
	});
	await f3();
}

export async function f3() {
	console.log({
		trace: context.get('id'),
		// ...
	});
	await f4();
}

export async function f4() {
	console.log({
		trace: context.get('id'),
		// ...
	});
}
```

Although this does not look significantly better at first-glance, we avoided needing to pass the Express `req` object along to each function call. The penalty paid for this convenience is performance.

# Performance Analysis

This server was deployed to Google App Engine in two configurations: one with the `cls-hooked` library enabled, and the other with it disabled. The key metric used for analysis is request response latency. This is a real-world metric that can be used to reason about user-perceived performance.

The exact App Engine configurations can be viewed in the `app_*.yaml` files. NodeJS v16 was used for this benchmark.

Each test was conducted using `100` batches of `100` concurrent requests to Google App Engine for a total of `10,000` data points. The following command was used to send the requests:

```bash
xargs -I % -P 100 curl -X GET $URL < <(printf '%s\n' {1..10000})
```

The average latency was then taken to approximate overall performance. This was done for various function call depths to demonstrate how the performance of `async_hooks` scales with call-stack size.

|             | Latency (Call Depth 8) | Latency (Call Depth 16) | Latency (Call Depth 32) | Latency (Call Depth 256) | Latency (Call Depth 1024) |
| ----------- | :--------------------: | :---------------------: | :---------------------: | :----------------------: | ------------------------- |
| Baseline    |         3.4 ms         |         7.4 ms          |         7.6 ms          |          8.3 ms          | 13.7 ms                   |
| Async Hooks |         6.5 ms         |         7.7 ms          |         7.9 ms          |         10.5 ms          | 17.1 ms                   |
| Impact (-)  |         91.2%          |          3.4%           |          3.9%           |          26.5%           | 24.8%                     |

# Conclusion

Within the context of a basic web server (call-depth per request <= 32), the performance impact of using NodeJS `async_hooks` is minimal (-4%). More consideration must be taken as the application grows, however. This is because response latency is correlated to the size of the HTTP request handler's function call depth. This agrees with the implementation of the `async_hooks` API as extra work must be done upon each subsequent function call ([ref](https://blog.appsignal.com/2020/09/30/exploring-nodejs-async-hooks.html)).
