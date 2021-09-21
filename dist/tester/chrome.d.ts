import ChromeLauncher from 'chrome-launcher';
import CDP from 'chrome-remote-interface';
import Protocol from 'devtools-protocol';
import ProtocolProxyApi from 'devtools-protocol/types/protocol-proxy-api';
import { MappedCoverage } from './profiler/map-coverage.js';
interface HeaderEntry {
    name: string;
    value: string;
}
export declare type ChromeNetworkIntercepts = {
    [key: string]: (requestData: ChromeRequest) => Promise<{
        responseHeaders: HeaderEntry[] | undefined;
        body: string | undefined;
        responseCode: number | undefined;
    }>;
};
export interface ChromeRequest {
    id: string;
    frameId: string;
    type: Protocol.Network.ResourceType;
    status: number | undefined;
    body: Protocol.Fetch.GetResponseBodyResponse;
}
export declare type ChromeRequests = {
    [key: string]: ChromeRequest;
};
export interface ChromeObject {
    instance: null | ChromeLauncher.LaunchedChrome;
    client: null | CDP.Client;
    profiler: null | ProtocolProxyApi.ProfilerApi;
    performance: null | ProtocolProxyApi.PerformanceApi;
    page: null | ProtocolProxyApi.PageApi;
    fetch: null | ProtocolProxyApi.FetchApi;
    dom: null | ProtocolProxyApi.DOMApi;
    runtime: null | ProtocolProxyApi.RuntimeApi;
    input: null | ProtocolProxyApi.InputApi;
    runningProfiler: number | null;
    lastProfiler: number | null;
    coverage: {
        [key: number]: MappedCoverage;
    };
    initialCoverage: MappedCoverage;
    requests: ChromeRequests;
    networkIntercepts: null | ChromeNetworkIntercepts;
    launch: () => Promise<ChromeObject>;
    navigate: (url: string, takeInitialProfile?: boolean) => Promise<ChromeObject>;
    evaluate: (expression: string) => Promise<any>;
    metrics: () => Promise<Protocol.Performance.GetMetricsResponse>;
    startProfile: () => Promise<ChromeObject>;
    getProfile: () => Promise<MappedCoverage>;
    clear: () => Promise<ChromeObject>;
    kill: () => void;
    destroy: () => Promise<ChromeObject>;
}
declare const Chrome: ChromeObject;
export default Chrome;
