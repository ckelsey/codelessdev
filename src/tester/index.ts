/**
 * TODO
 * - option to not navigate, instead replace body, i.e. beforeach
 * - global coverage as well as test coverage
 * - option in test for headless
 */


import { join, resolve, dirname } from 'path'
import { rmdirSync } from 'fs'
import { format } from 'util'
import { make } from '../dir.js'
import Chrome, { ChromeObject } from './chrome.js'
import Config from '../config.js'
import { MappedCoverage } from './profiler/map-coverage.js'

interface TestConfig {
    name: string
    id: string
    url?: string
    document?: string
}

interface Test {
    config: TestConfig
    fn: Function
}

interface TestCoverageItem {
    name: string
    error: any
    pass: any
    group: string
    coverage: MappedCoverage
}

let idIndex = 0
const doId = (indx: number) => doHash() + indx
const doHash = () => (performance.now() + 'xxxxxxxxxxxxxxxx').replace(/[x]|\./g, () => (Math.random() * 16 | 0).toString(16))
const Id = () => doId(idIndex++)

const root = resolve('')
const initialUrl = `https://localhost:${Config.port}`
const tests: { [key: string]: Test } = {}
let testIds: string[] = []
const testResults: any[] = []
const testResult: { [key: string]: TestCoverageItem[] } = {}
let runningTest: string
let currentGroup = ''

function printProgress(_messages: any) {
    // process.stdout.clearLine(1)
    // process.stdout.cursorTo(0)
    // @ts-ignore
    // process.stdout.write(...messages)
    process.stdout.write(format.apply(this, arguments) + '\n')
}

function getGroupFromFileName(filename: string) {
    return dirname((filename.split(root).pop() as string).split(Config.sourceDirectory).pop() as string)
}

async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }

export const test = function (name: string, fn: Function, options = {}) {
    const config: TestConfig = Object.assign({}, {
        name,
        url: undefined,
        scripts: [],
        css: [],
        head: undefined,
        body: undefined
    }, options, { id: Id() })

    const _test = { config, fn }
    const index = testIds.indexOf(runningTest)

    if (index > -1) {
        testIds.splice(index + 1, 0, config.id)
    } else {
        testIds.push(config.id)
    }

    tests[config.id] = _test
}

async function runTest(test: Test, chrome: ChromeObject) {
    printProgress(test.config.name)
    await chrome.clear()
    const start = new Date().getTime()
    const url = test.config.url || initialUrl
    // const chrome = await Chrome.launch()

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
        }
    } else {
        chrome.networkIntercepts = null
    }

    await chrome.navigate(url)
    await chrome.startProfile()

    await Promise
        .resolve(test.fn.call(null, chrome))
        .then(res => testResults.push({ pass: res || true, group: currentGroup }))
        .catch(error => testResults.push({ group: currentGroup, error: Object.assign({}, error, { stack: error.stack.toString() }) }))

    const results = {
        name: test.config.name,
        pass: testResults[testResults.length - 1].pass,
        error: testResults[testResults.length - 1].error,
        coverage: await chrome.getProfile(),
        group: currentGroup
    }

    if (!testResult[currentGroup]) {
        testResult[currentGroup] = []
    }

    testResult[currentGroup].push(results)

    // make(join(Config.testResultsDirectory, `${test.config.id}.json`), JSON.stringify(results))
    make(join(Config.testResultsDirectory, `results.json`), JSON.stringify(testResult))

    // await chrome.destroy()
    await sleep(1)

    // @ts-ignore
    printProgress(results.pass ? '\x1b[36m%s\x1b[0m' : '\x1b[31m%s\x1b[0m', `${results.pass ? 'passed' : 'errored'} in ${new Date().getTime() - start}ms`)
}

export default async function runner(files: string[] = []) {
    const start = new Date().getTime()
    try { rmdirSync(Config.testResultsDirectory, { recursive: true }) } catch (error) { }

    const chrome = await Chrome.launch()

    for (const file of files) {
        currentGroup = getGroupFromFileName(file)

        try {
            await require(file)
        } catch (error) {
            await import(file)
        }

        for (const id of testIds) {
            runningTest = id
            const test = tests[id]

            if (!test) { continue }

            await runTest(test, chrome)
        }

        testIds = []
    }

    await chrome.destroy()

    printProgress(`Tests completed in ${new Date().getTime() - start}ms`)
}



















/*
const test = ({
    defaultBrowserType: ['chromium', { scope: 'worker' }],
    browserName: [({ defaultBrowserType }, use) => use(defaultBrowserType), { scope: 'worker' }],
    playwright: [require('../inprocess'), { scope: 'worker' }],
    headless: [undefined, { scope: 'worker' }],
    channel: [undefined, { scope: 'worker' }],
    launchOptions: [{}, { scope: 'worker' }],
    browser: [async ({ playwright, browserName, headless, channel, launchOptions }, use) => {
        if (!['chromium', 'firefox', 'webkit'].includes(browserName))
            throw new Error(`Unexpected browserName "${browserName}", must be one of "chromium", "firefox" or "webkit"`);
        const options = {
            handleSIGINT: false,
            timeout: 0,
            ...launchOptions,
        };
        if (headless !== undefined)
            options.headless = headless;
        if (channel !== undefined)
            options.channel = channel;
        const browser = await playwright[browserName].launch(options);
        await use(browser);
        await browser.close();
        await removeFolders([artifactsFolder]);
    }, { scope: 'worker' }],
    screenshot: 'off',
    video: 'off',
    trace: 'off',
    acceptDownloads: undefined,
    bypassCSP: undefined,
    colorScheme: undefined,
    deviceScaleFactor: undefined,
    extraHTTPHeaders: undefined,
    geolocation: undefined,
    hasTouch: undefined,
    httpCredentials: undefined,
    ignoreHTTPSErrors: undefined,
    isMobile: undefined,
    javaScriptEnabled: undefined,
    locale: undefined,
    offline: undefined,
    permissions: undefined,
    proxy: undefined,
    storageState: undefined,
    timezoneId: undefined,
    userAgent: undefined,
    viewport: undefined,
    contextOptions: {},
    context: async ({ browser, screenshot, trace, video, acceptDownloads, bypassCSP, colorScheme, deviceScaleFactor, extraHTTPHeaders, hasTouch, geolocation, httpCredentials, ignoreHTTPSErrors, isMobile, javaScriptEnabled, locale, offline, permissions, proxy, storageState, viewport, timezoneId, userAgent, contextOptions }, use, testInfo) => {
        testInfo.snapshotSuffix = process.platform;
        if (process.env.PWDEBUG) {
            testInfo.setTimeout(0);
        }

        let videoMode = typeof video === 'string' ? video : video.mode;
        if (videoMode === 'retry-with-video') {
            videoMode = 'on-first-retry';
        }
        if (trace === 'retry-with-trace') {
            trace = 'on-first-retry';
        }

        const captureVideo = (videoMode === 'on' || videoMode === 'retain-on-failure' || (videoMode === 'on-first-retry' && testInfo.retry === 1));
        const captureTrace = (trace === 'on' || trace === 'retain-on-failure' || (trace === 'on-first-retry' && testInfo.retry === 1));

        let recordVideoDir = null;
        const recordVideoSize = typeof video === 'string' ? undefined : video.size;
        if (captureVideo) {
            await fs.promises.mkdir(artifactsFolder, { recursive: true });
            recordVideoDir = artifactsFolder;
        }

        const options = {
            recordVideo: recordVideoDir ? { dir: recordVideoDir, size: recordVideoSize } : undefined,
            ...contextOptions,
        };
        if (acceptDownloads !== undefined) {
            options.acceptDownloads = acceptDownloads;
        }
        if (bypassCSP !== undefined) {
            options.bypassCSP = bypassCSP;
        }
        if (colorScheme !== undefined) {
            options.colorScheme = colorScheme;
        }
        if (deviceScaleFactor !== undefined) {
            options.deviceScaleFactor = deviceScaleFactor;
        }
        if (extraHTTPHeaders !== undefined) {
            options.extraHTTPHeaders = extraHTTPHeaders;
        }
        if (geolocation !== undefined) {
            options.geolocation = geolocation;
        }
        if (hasTouch !== undefined) {
            options.hasTouch = hasTouch;
        }
        if (httpCredentials !== undefined) {
            options.httpCredentials = httpCredentials;
        }
        if (ignoreHTTPSErrors !== undefined) {
            options.ignoreHTTPSErrors = ignoreHTTPSErrors;
        }
        if (isMobile !== undefined) {
            options.isMobile = isMobile;
        }
        if (javaScriptEnabled !== undefined) {
            options.javaScriptEnabled = javaScriptEnabled;
        }
        if (locale !== undefined) {
            options.locale = locale;
        }
        if (offline !== undefined) {
            options.offline = offline;
        }
        if (permissions !== undefined) {
            options.permissions = permissions;
        }
        if (proxy !== undefined) {
            options.proxy = proxy;
        }
        if (storageState !== undefined) {
            options.storageState = storageState;
        }
        if (timezoneId !== undefined) {
            options.timezoneId = timezoneId;
        }
        if (userAgent !== undefined) {
            options.userAgent = userAgent;
        }
        if (viewport !== undefined) {
            options.viewport = viewport;
        }

        const context = await browser.newContext(options);
        context.setDefaultTimeout(0);
        const allPages = [];
        context.on('page', page => allPages.push(page));

        if (captureTrace) {
            const name = path.relative(testInfo.project.outputDir, testInfo.outputDir).replace(/[\/\\]/g, '-');
            await context.tracing.start({ name, screenshots: true, snapshots: true });
        }

        await use(context);

        const testFailed = testInfo.status !== testInfo.expectedStatus;

        const preserveTrace = captureTrace && (trace === 'on' || (testFailed && trace === 'retain-on-failure') || (trace === 'on-first-retry' && testInfo.retry === 1));
        if (preserveTrace) {
            const tracePath = testInfo.outputPath(`trace.zip`);
            await context.tracing.stop({ path: tracePath });
        } else if (captureTrace) {
            await context.tracing.stop();
        }

        const captureScreenshots = (screenshot === 'on' || (screenshot === 'only-on-failure' && testFailed));
        if (captureScreenshots) {
            await Promise.all(allPages.map((page, index) => {
                const screenshotPath = testInfo.outputPath(`test-${testFailed ? 'failed' : 'finished'}-${++index}.png`);
                return page.screenshot({ timeout: 5000, path: screenshotPath }).catch(e => { });
            }));
        }

        const prependToError = testInfo.status === 'timedOut' ? formatPendingCalls(context._connection.pendingProtocolCalls(), testInfo) : '';
        await context.close();
        if (prependToError) {
            if (!testInfo.error) {
                testInfo.error = { value: prependToError };
            } else if (testInfo.error.message) {
                testInfo.error.message = prependToError + testInfo.error.message;
                if (testInfo.error.stack) {
                    testInfo.error.stack = prependToError + testInfo.error.stack;
                }
            }
        }

        const preserveVideo = captureVideo && (videoMode === 'on' || (testFailed && videoMode === 'retain-on-failure') || (videoMode === 'on-first-retry' && testInfo.retry === 1));
        if (preserveVideo) {
            await Promise.all(allPages.map(async page => {
                const v = page.video();
                if (!v) {
                    return;
                }
                try {
                    const videoPath = await v.path();
                    const fileName = path.basename(videoPath);
                    await v.saveAs(testInfo.outputPath(fileName));
                } catch (e) {
                    // Silent catch empty videos.
                }
            }));
        }
    },

    page: async ({ context }, use) => {
        await use(await context.newPage());
    },
})
*/