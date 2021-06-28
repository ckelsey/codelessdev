#!/usr/bin/env node

const { resolve, extname, basename } = require('path')
const { watch } = require('fs')
const notifier = require('node-notifier')
const config = require('./lib/config')
const server = require('./lib/server')
const compileTypescript = require('./lib/compiler')
const tsConfig = require('./lib/ts-config')

const root = resolve('')
const sourceDirectory = resolve(root, config.sourceDirectory)
const shouldServer = process.argv.indexOf('--server') > -1
const shouldWatch = process.argv.indexOf('--watch') > -1
const shouldCompile = process.argv.indexOf('--compile') > -1
const queue = []
let running = []
let timer

const ignoredExtensions = ['.DS_Store']
const ignoredFiles = ['.DS_Store', '']

function timeString(start) {
    const result = new Date().getTime() - start
    if (result > 1000) { return `${result / 1000} seconds` }
    return `${result} milliseconds`
}

function compile(filename = config.defaultEntry) {
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

        compileTypescript(
            tsConfig(
                config.sourceDirectory,
                config.compileOutDirectory,
                config.defaultEntry,
                running
            )
        )
            .then((res) => {
                let message = `Finished compiling ${running.join(',')} in ${timeString(start)}\n`

                if (res.messages.length) { message = `Typescript error/warnings:\n${res.messages.join('\n')}` }

                notifier.notify(message)
                console.log(message)

                running.forEach(ranFilename => {
                    const index = queue.indexOf(ranFilename)
                    if (index > -1) { queue.splice(index, 1) }
                })

                running = []

                queue.forEach(compile)
            })
    }, 150)
}

function main() {
    if (shouldServer) { server(config.siteDirectory, config.port) }
    if (shouldCompile) { compile() }
    if (shouldWatch) { watch(sourceDirectory, { recursive: true }, (_kind, filename) => compile(resolve(sourceDirectory, filename))) }
}

main()