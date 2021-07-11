import { StringPosition } from './get-string-position';
import Protocol from 'devtools-protocol';
import { ChromeRequests } from '../chrome';
interface MappedRanges extends StringPosition {
    startOffset: number;
    endOffset: number;
    count: number;
    snippet: string;
}
interface MappedNode {
    name: string;
    ranges: MappedRanges[];
    isBlockCoverage: boolean;
}
interface MappedCoverageElement {
    source: string;
    lines: string[];
    nodes: MappedNode[];
}
export interface MappedCoverage {
    [key: string]: MappedCoverageElement;
}
export default function mapCoverage(_coverage: Protocol.Profiler.TakePreciseCoverageResponse, requests: ChromeRequests, initialUrl: string): MappedCoverage;
export {};
