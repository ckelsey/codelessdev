import Chrome from './chrome';
import Config from '../config';
const initialUrl = `https://localhost:${Config.port}`;
const tests = {};
const testIds = [];
const testResults = [];
const testsIdsRun = [];
let runningTest;
let idIndex = 0;
const doId = (indx) => doHash() + indx;
const doHash = () => (performance.now() + 'xxxxxxxxxxxxxxxx').replace(/[x]|\./g, () => (Math.random() * 16 | 0).toString(16));
const Id = () => doId(idIndex++);
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
async function runTest(chrome, test) {
    const start = new Date().getTime();
    const url = test.config.url || initialUrl;
    if ((test.config.scripts && test.config.scripts.length) || (test.config.css && test.config.css.length) || test.config.body || test.config.head) {
        console.log(test.config);
    }
    await chrome.navigate(url, true);
    testResults.push(await Promise.resolve(test.fn.call(null, [chrome])));
    console.log(test.config.name, test.config.id, 'finished in', new Date().getTime() - start);
}
export default async function runner(files = []) {
    const chrome = await Chrome.launch(initialUrl, false);
    for (const file of files) {
        try {
            await require(file);
        }
        catch (error) {
            await import(file);
        }
        for (const id of testIds) {
            if (testsIdsRun.indexOf(id) > -1) {
                continue;
            }
            runningTest = id;
            const test = tests[id];
            if (!test) {
                continue;
            }
            await runTest(chrome, test);
        }
    }
    console.log(testResults);
    chrome.kill();
}
