import { writeFileSync, lstatSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import getLines from './get-lines.js';
import getStringPosition from './get-string-position.js';
import coverageHTML from './coverage-html.js';
export default function mapCoverage(_coverage, requests, initialUrl) {
    const coverage = _coverage.result.reduce((result, current) => {
        const url = current.url.split(initialUrl).join('');
        if (!requests[url]) {
            return result;
        }
        const rawBody = requests[url].body.body;
        const bodyType = requests[url].body.base64Encoded ? 'base64' : undefined;
        const source = Buffer.from(rawBody, bodyType).toString('utf-8');
        const lines = getLines(source);
        const totalBytes = Buffer.byteLength(rawBody, bodyType);
        result[url] = {
            source,
            lines,
            nodes: current.functions.map(fn => {
                const node = {
                    name: fn.functionName,
                    ranges: fn.ranges.map(range => {
                        const snippet = Buffer.from(rawBody, bodyType).toString('utf-8', range.startOffset, range.endOffset);
                        return Object.assign({
                            startOffset: range.startOffset,
                            endOffset: range.endOffset,
                            count: range.count,
                            snippet
                        }, getStringPosition(source, lines, range.startOffset, range.endOffset, totalBytes, snippet));
                    }),
                    isBlockCoverage: fn.isBlockCoverage
                };
                return node;
            })
        };
        return result;
    }, {});
    try {
        lstatSync(join(resolve(''), 'tmp'));
    }
    catch (error) {
        mkdirSync(join(resolve(''), 'tmp'));
    }
    writeFileSync(join(resolve(''), 'tmp', 'coverage.html'), coverageHTML(coverage));
    return coverage;
}
