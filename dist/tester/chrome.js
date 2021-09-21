import ChromeLauncher from 'chrome-launcher';
import CDP from 'chrome-remote-interface';
import config from '../config.js';
import mapCoverage from './profiler/map-coverage.js';
const initialURL = `https://localhost:${config.port}`;
function onLoaded(Page) {
    return new Promise((resolve => {
        Page.on('loadEventFired', resolve);
    }));
}
async function getClient(chrome) {
    return new Promise(async (resolve) => {
        try {
            const client = await CDP({ port: chrome.port });
            setTimeout(async () => {
                return resolve(client);
            }, 10);
            return resolve(client);
        }
        catch (error) {
            setTimeout(async () => resolve(getClient(chrome)), 10);
        }
    });
}
const Chrome = {
    instance: null,
    client: null,
    profiler: null,
    performance: null,
    page: null,
    fetch: null,
    dom: null,
    runtime: null,
    input: null,
    runningProfiler: null,
    lastProfiler: null,
    coverage: {},
    initialCoverage: {},
    requests: {},
    networkIntercepts: null,
    async launch() {
        const chrome = await ChromeLauncher.launch({
            chromeFlags: [
                '--allow-insecure-localhost',
                '--disable-translate',
                '--disable-extensions',
                '--disable-gpu'
            ],
            connectionPollInterval: 10,
            maxConnectionRetries: 5000000
        });
        const client = await getClient(chrome);
        const { Page, Performance, Profiler, Fetch, DOM, Runtime, Input } = client;
        await Promise.all([
            Page.enable(),
            Performance.enable({ timeDomain: 'timeTicks' }),
            Fetch.enable({
                patterns: [
                    { urlPattern: '*', requestStage: 'Response' },
                ]
            }),
            Profiler.enable(),
            Profiler.enableRuntimeCallStats(),
            Runtime.enable(),
            DOM.enable(),
        ]);
        Chrome.instance = chrome;
        Chrome.client = client;
        Chrome.profiler = Profiler;
        Chrome.performance = Performance;
        Chrome.page = Page;
        Chrome.fetch = Fetch;
        Chrome.dom = DOM;
        Chrome.runtime = Runtime;
        Chrome.input = Input;
        Fetch.on('requestPaused', async (evt) => {
            const reqUrl = evt.request.url.split(initialURL)[1];
            Chrome.requests[reqUrl] = {
                id: evt.requestId,
                frameId: evt.frameId,
                type: evt.resourceType,
                status: evt.responseStatusCode,
                body: (await Fetch.getResponseBody({ requestId: evt.requestId })),
            };
            if (Chrome.networkIntercepts && Object.keys(Chrome.networkIntercepts).indexOf(reqUrl) > -1) {
                let { responseHeaders, body, responseCode } = await Chrome.networkIntercepts[reqUrl](Chrome.requests[reqUrl]);
                responseCode = responseCode && typeof responseCode === 'number' ? responseCode : evt.responseStatusCode;
                responseHeaders = !!responseHeaders && typeof responseHeaders === 'object' ? responseHeaders : evt.responseHeaders;
                body = !!body && typeof body === 'string' ? Buffer.from(body).toString('base64') : Chrome.requests[reqUrl].body.body;
                await Fetch.fulfillRequest({
                    requestId: evt.requestId,
                    responseCode,
                    responseHeaders,
                    body
                });
            }
            else {
                await Fetch.continueRequest({ requestId: evt.requestId });
            }
        });
        return Chrome;
    },
    async navigate(url, takeInitialProfile = false) {
        if (!Chrome.page) {
            return Promise.reject();
        }
        if (takeInitialProfile) {
            await Chrome.startProfile();
        }
        await Chrome.page.navigate({ url });
        await onLoaded(Chrome.page);
        if (takeInitialProfile) {
            Chrome.initialCoverage = await Chrome.getProfile();
        }
        return Chrome;
    },
    async metrics() {
        if (!Chrome.performance) {
            return Promise.reject();
        }
        return await Chrome.performance.getMetrics();
    },
    async evaluate(expression) {
        if (!Chrome.runtime) {
            return Promise.reject();
        }
        return await Chrome.runtime.evaluate({ expression });
    },
    async startProfile() {
        if (!Chrome.profiler) {
            return Promise.reject();
        }
        await Chrome.profiler.start();
        Chrome.runningProfiler = (await Chrome.profiler.startPreciseCoverage({ detailed: true, callCount: true })).timestamp;
        return Chrome;
    },
    async getProfile() {
        if (!Chrome.profiler) {
            return Promise.reject();
        }
        const coverage = mapCoverage(await Chrome.profiler.takePreciseCoverage(), Chrome.requests, initialURL);
        if (Chrome.runningProfiler) {
            Chrome.coverage[Chrome.runningProfiler] = coverage;
        }
        await Chrome.profiler.stopPreciseCoverage();
        const currentProfiler = Chrome.runningProfiler;
        Chrome.lastProfiler = currentProfiler;
        Chrome.runningProfiler = null;
        return Chrome.coverage[Chrome.lastProfiler];
    },
    async clear() {
        Chrome.runningProfiler = null;
        Chrome.lastProfiler = null;
        Chrome.coverage = {};
        Chrome.initialCoverage = {};
        Chrome.requests = {};
        Chrome.networkIntercepts = null;
        return new Promise(resolve => {
            setTimeout(() => resolve(Chrome));
        });
    },
    async kill() {
        if (!Chrome.instance) {
            return;
        }
        await Chrome.instance.kill();
    },
    async destroy() {
        if (Chrome.instance) {
            await Chrome.instance.kill();
        }
        Chrome.instance = null;
        Chrome.client = null;
        Chrome.profiler = null;
        Chrome.performance = null;
        Chrome.page = null;
        Chrome.fetch = null;
        Chrome.dom = null;
        Chrome.runtime = null;
        Chrome.runningProfiler = null;
        Chrome.lastProfiler = null;
        Chrome.coverage = {};
        Chrome.initialCoverage = {};
        Chrome.requests = {};
        Chrome.networkIntercepts = null;
        return new Promise(resolve => {
            setTimeout(() => resolve(Chrome));
        });
    }
};
export default Chrome;
