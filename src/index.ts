import { resolve, extname, basename, join, dirname } from 'path'
import { watch } from 'fs'
import glob from 'glob'
import notifier from 'node-notifier'

import Config from './config.js'
import Server from './server/server.js'
import Compiler from './ts/compiler.js'
import TsConfig from './ts/ts-config.js'
import runner, { test } from './tester/index.js'

const notify = notifier.notify
const root = resolve('')
const sourceDirectory = resolve(root, Config.sourceDirectory)
const shouldServer = process.argv.indexOf('--server') > -1
const shouldWatch = process.argv.indexOf('--watch') > -1
const shouldCompile = process.argv.indexOf('--compile') > -1
const shouldTest = process.argv.indexOf('--test') > -1
const ignoredExtensions = ['.DS_Store']
const ignoredFiles = ['.DS_Store', '']
const queue: string[] = []
let running: string[] = []
let timer: any


function isTestFile(filename: string) {
    return !Config.testsPattern ? false : glob.sync(Config.testsPattern).map(f => join(root, f)).indexOf(filename) > -1
}

function timeString(start: number) {
    const result = new Date().getTime() - start
    if (result > 1000) { return `${result / 1000} seconds` }
    return `${result} milliseconds`
}

async function runTests(files: string[]) {
    const globbed: string[] = glob.sync(Config.testsPattern)
        .filter(testFilename => files
            .slice()
            .map(f => `${dirname(f)}/`)
            .filter(directoryName => testFilename.indexOf(directoryName) > -1).length)
        .map(f => join(root, f))

    await runner(globbed)
    if (!shouldWatch) { process.exit(1) }
}

function compile(filename = Config.defaultEntry) {

    if (isTestFile(filename)) { return }

    // going to run and will be picked up but has not yet, ignore
    if ((timer && queue.indexOf(filename) > -1) || ignoredExtensions.indexOf(extname(filename)) > -1 || ignoredFiles.indexOf(basename(filename)) > -1) { return }

    clearTimeout(timer)

    queue.push(filename)

    if (running.length) { return }

    const start = new Date().getTime()

    timer = setTimeout(() => {
        timer = null
        running = queue.slice()

        console.log(`Starting compiler for ${running.join(',')}`)

        const { files, options } = TsConfig(
            Config.sourceDirectory,
            Config.compileOutDirectory,
            Config.defaultEntry,
            Config.testsPattern,
            running
        )

        Compiler(files, options)
            .then((res) => {
                let message = `Finished compiling ${running.join(',')} in ${timeString(start)}\n`

                if (res.messages.length) { message = `Typescript error/warnings:\n${res.messages.join('\n')}` }

                notify(message)
                console.log(message)

                running.forEach(ranFilename => {
                    const index = queue.indexOf(ranFilename)
                    if (index > -1) { queue.splice(index, 1) }
                })

                if (!queue.length) {
                    if (!shouldWatch && !shouldTest) { return process.exit(1) }

                    if (shouldTest) {
                        setTimeout(() => runTests(res.files), 10)
                    }
                }

                running = []
                queue.forEach(compile)
            })
    }, 150)
}

function main() {
    if (shouldServer) { Server(Config.siteDirectory, Config.port, Config.testUiPath, Config.serverKey, Config.serverCert) }
    if (shouldCompile) { compile() }
    if (shouldWatch) { watch(sourceDirectory, { recursive: true }, (_kind, filename) => compile(resolve(sourceDirectory, filename))) }
    if (!shouldCompile && shouldTest) { runTests(glob.sync(Config.testsPattern)) }
}

export { test, main }