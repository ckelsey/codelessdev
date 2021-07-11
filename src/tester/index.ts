/**
 * TODO
 * - modify html body
 * - asserts
 */

import Chrome from './chrome'
import Config from '../config'

interface TestConfig {
    name: string
    id: string
    url?: string
    scripts?: string[]
    css?: string[],
    head?: string,
    body?: string
}

interface Test {
    config: TestConfig
    fn: Function
}

const initialUrl = `https://localhost:${Config.port}`
const tests: { [key: string]: Test } = {}
const testIds: string[] = []
const testResults: any[] = []
const testsIdsRun: any[] = []
let runningTest: string

let idIndex = 0
const doId = (indx: number) => doHash() + indx
const doHash = () => (performance.now() + 'xxxxxxxxxxxxxxxx').replace(/[x]|\./g, () => (Math.random() * 16 | 0).toString(16))
const Id = () => doId(idIndex++)

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

async function runTest(chrome: typeof Chrome, test: Test) {
    const start = new Date().getTime()
    const url = test.config.url || initialUrl

    if ((test.config.scripts && test.config.scripts.length) || (test.config.css && test.config.css.length) || test.config.body || test.config.head) {
        console.log(test.config)
    }

    await chrome.navigate(url, true)
    testResults.push(await Promise.resolve(test.fn.call(null, [chrome])))
    console.log(test.config.name, test.config.id, 'finished in', new Date().getTime() - start)
}

export default async function runner(files: string[] = []) {
    // const start = new Date().getTime()
    const chrome = await Chrome.launch(initialUrl, false)

    for (const file of files) {
        try {
            await require(file)
        } catch (error) {
            await import(file)
        }

        for (const id of testIds) {
            if (testsIdsRun.indexOf(id) > -1) { continue }

            runningTest = id
            const test = tests[id]

            if (!test) { continue }

            await runTest(chrome, test)
        }
    }

    console.log(testResults)

    chrome.kill()
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