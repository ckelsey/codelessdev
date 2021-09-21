import { join, resolve, dirname } from 'path';
import { rmdirSync } from 'fs';
import { format } from 'util';
import { make } from '../dir.js';
import Chrome from './chrome.js';
import Config from '../config.js';
let idIndex = 0;
const doId = (indx) => doHash() + indx;
const doHash = () => (performance.now() + 'xxxxxxxxxxxxxxxx').replace(/[x]|\./g, () => (Math.random() * 16 | 0).toString(16));
const Id = () => doId(idIndex++);
const root = resolve('');
const initialUrl = `https://localhost:${Config.port}`;
const tests = {};
let testIds = [];
const testResults = [];
const testResult = {};
let runningTest;
let currentGroup = '';
function printProgress(_messages) {
    process.stdout.write(format.apply(this, arguments) + '\n');
}
function getGroupFromFileName(filename) {
    return dirname(filename.split(root).pop().split(Config.sourceDirectory).pop());
}
async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
export const test = function (name, fn, options = {}) {
    const config = Object.assign({}, {
        name,
        url: undefined,
        scripts: [],
        css: [],
        head: undefined,
        body: undefined
    }, options, { id: Id() });
    const _test = { config, fn };
    const index = testIds.indexOf(runningTest);
    if (index > -1) {
        testIds.splice(index + 1, 0, config.id);
    }
    else {
        testIds.push(config.id);
    }
    tests[config.id] = _test;
};
async function runTest(test, chrome) {
    printProgress(test.config.name);
    await chrome.clear();
    const start = new Date().getTime();
    const url = test.config.url || initialUrl;
    if (test.config.document) {
        chrome.networkIntercepts = {
            '/': () => Promise.resolve({
                body: test.config.document,
                responseCode: 200,
                responseHeaders: [{
                        name: 'content-type',
                        value: 'text/html; charset=utf-8'
                    }]
            })
        };
    }
    else {
        chrome.networkIntercepts = null;
    }
    await chrome.navigate(url);
    await chrome.startProfile();
    await Promise
        .resolve(test.fn.call(null, chrome))
        .then(res => testResults.push({ pass: res || true, group: currentGroup }))
        .catch(error => testResults.push({ group: currentGroup, error: Object.assign({}, error, { stack: error.stack.toString() }) }));
    const results = {
        name: test.config.name,
        pass: testResults[testResults.length - 1].pass,
        error: testResults[testResults.length - 1].error,
        coverage: await chrome.getProfile(),
        group: currentGroup
    };
    if (!testResult[currentGroup]) {
        testResult[currentGroup] = [];
    }
    testResult[currentGroup].push(results);
    make(join(Config.testResultsDirectory, `results.json`), JSON.stringify(testResult));
    await sleep(1);
    printProgress(results.pass ? '\x1b[36m%s\x1b[0m' : '\x1b[31m%s\x1b[0m', `${results.pass ? 'passed' : 'errored'} in ${new Date().getTime() - start}ms`);
}
export default async function runner(files = []) {
    const start = new Date().getTime();
    try {
        rmdirSync(Config.testResultsDirectory, { recursive: true });
    }
    catch (error) { }
    const chrome = await Chrome.launch();
    for (const file of files) {
        currentGroup = getGroupFromFileName(file);
        try {
            await require(file);
        }
        catch (error) {
            await import(file);
        }
        for (const id of testIds) {
            runningTest = id;
            const test = tests[id];
            if (!test) {
                continue;
            }
            await runTest(test, chrome);
        }
        testIds = [];
    }
    await chrome.destroy();
    printProgress(`Tests completed in ${new Date().getTime() - start}ms`);
}
