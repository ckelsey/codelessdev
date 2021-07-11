import ChromeLauncher from 'chrome-launcher'
import CDP from 'chrome-remote-interface'
import Protocol from 'devtools-protocol'
import ProtocolProxyApi from 'devtools-protocol/types/protocol-proxy-api'
import config from '../config'
import mapCoverage, { MappedCoverage } from './profiler/map-coverage'

function onLoaded(Page: ProtocolProxyApi.PageApi) {
    return new Promise((resolve => {
        Page.on('domContentEventFired', resolve)
    }))
}

export interface ChromeRequest {
    id: string,
    frameId: string,
    type: Protocol.Network.ResourceType,
    status: number | undefined,
    body: Protocol.Fetch.GetResponseBodyResponse
}

export type ChromeRequests = { [key: string]: ChromeRequest }

export interface ChromeObject {
    initialUrl: string
    instance: null | ChromeLauncher.LaunchedChrome
    client: null | CDP.Client
    profiler: null | ProtocolProxyApi.ProfilerApi
    performance: null | ProtocolProxyApi.PerformanceApi
    page: null | ProtocolProxyApi.PageApi
    fetch: null | ProtocolProxyApi.FetchApi
    runningProfiler: number | null
    lastProfiler: number | null
    coverage: { [key: number]: MappedCoverage }
    requests: ChromeRequests
    networkIntercepts: null
    launch: (url: string, takeInitialProfile?: boolean) => Promise<ChromeObject>
    navigate: (url: string, takeInitialProfile?: boolean) => Promise<ChromeObject>
    metrics: () => Promise<Protocol.Performance.GetMetricsResponse>
    startProfile: () => Promise<ChromeObject>
    getProfile: () => Promise<MappedCoverage>
    kill: () => void
}

const Chrome: ChromeObject = {
    initialUrl: '',
    instance: null,
    client: null,
    profiler: null,
    performance: null,
    page: null,
    fetch: null,
    runningProfiler: null,
    lastProfiler: null,
    coverage: {},
    requests: {},
    networkIntercepts: null,
    async launch(url = `https://localhost:${config.port}`, _takeInitialProfile = false) {
        Chrome.initialUrl = url

        const chrome = await ChromeLauncher.launch({ chromeFlags: ['--allow-insecure-localhost'] })
        const client = await CDP({ port: chrome.port })

        const {
            Page,
            Performance,
            Profiler,
            Fetch
        } = client

        await Promise.all([
            Performance.enable({ timeDomain: 'timeTicks' }),
            Fetch.enable({
                patterns: [
                    { urlPattern: '*', requestStage: 'Response' },
                ]
            }),
            Page.enable(),
            Profiler.enable(),
            Profiler.enableRuntimeCallStats()
        ])

        Chrome.instance = chrome
        Chrome.client = client
        Chrome.profiler = Profiler
        Chrome.performance = Performance
        Chrome.page = Page
        Chrome.fetch = Fetch

        Fetch.on('requestPaused', async evt => {
            const reqUrl = evt.request.url.split(Chrome.initialUrl)[1]
            console.log(reqUrl)
            Chrome.requests[reqUrl] = {
                id: evt.requestId,
                frameId: evt.frameId,
                type: evt.resourceType,
                status: evt.responseStatusCode,
                body: (await Fetch.getResponseBody({ requestId: evt.requestId })),
            }

            if (Chrome.networkIntercepts) {

            } else {
                Fetch.continueRequest({ requestId: evt.requestId })
            }
        })

        // if (takeInitialProfile) { Chrome.startProfile() }

        // await onLoaded(Page)

        // if (takeInitialProfile) { await Chrome.getProfile() }

        return Chrome
    },
    async navigate(url: string, _takeInitialProfile = false) {
        if (!Chrome.page) { return Promise.reject() }
        await Chrome.page.navigate({ url })
        await onLoaded(Chrome.page)
        return Chrome
    },
    async metrics() {
        if (!Chrome.performance) { return Promise.reject() }
        return await Chrome.performance.getMetrics()
    },
    async startProfile() {
        if (!Chrome.profiler) { return Promise.reject() }
        await Chrome.profiler.start()
        Chrome.runningProfiler = (await Chrome.profiler.startPreciseCoverage({ detailed: true, callCount: true })).timestamp
        return Chrome
    },
    async getProfile() {
        if (!Chrome.profiler) { return Promise.reject() }

        const coverage = mapCoverage(await Chrome.profiler.takePreciseCoverage(), Chrome.requests, Chrome.initialUrl)

        if (Chrome.runningProfiler) { Chrome.coverage[Chrome.runningProfiler] = coverage }

        await Chrome.profiler.stopPreciseCoverage()
        const currentProfiler = Chrome.runningProfiler as number
        Chrome.lastProfiler = currentProfiler
        Chrome.runningProfiler = null
        return Chrome.coverage[Chrome.lastProfiler]
    },
    kill() {
        if (!Chrome.instance) { return }
        Chrome.instance.kill()
    }
}

export default Chrome