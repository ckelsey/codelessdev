import ChromeLauncher from 'chrome-launcher';
import CDP from 'chrome-remote-interface';
import Protocol from 'devtools-protocol';
import ProtocolProxyApi from 'devtools-protocol/types/protocol-proxy-api';
import { MappedCoverage } from './profiler/map-coverage';
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
    initialUrl: string;
    instance: null | ChromeLauncher.LaunchedChrome;
    client: null | CDP.Client;
    profiler: null | ProtocolProxyApi.ProfilerApi;
    performance: null | ProtocolProxyApi.PerformanceApi;
    page: null | ProtocolProxyApi.PageApi;
    fetch: null | ProtocolProxyApi.FetchApi;
    runningProfiler: number | null;
    lastProfiler: number | null;
    coverage: {
        [key: number]: MappedCoverage;
    };
    requests: ChromeRequests;
    networkIntercepts: null;
    launch: (url: string, takeInitialProfile?: boolean) => Promise<ChromeObject>;
    navigate: (url: string, takeInitialProfile?: boolean) => Promise<ChromeObject>;
    metrics: () => Promise<Protocol.Performance.GetMetricsResponse>;
    startProfile: () => Promise<ChromeObject>;
    getProfile: () => Promise<MappedCoverage>;
    kill: () => void;
}
declare const Chrome: ChromeObject;
export default Chrome;
