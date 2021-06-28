const glob = require('glob')
const { resolve, join } = require('path')
const { readFileSync } = require('fs')

const rootDirectory = resolve('')
const configPath = glob.sync(join(rootDirectory, '**/codelessdev.json'), { ignore: join(rootDirectory, 'node_modules/**/codelessdev.json') })[0]
const config = {
    port: 8888,
    sourceDirectory: 'src',
    compileOutDirectory: 'dist',
    siteDirectory: '',
    defaultEntry: 'src/**/*.ts'
}

try { Object.assign(config, JSON.parse(readFileSync(configPath).toString())) } catch (error) { }

module.exports = config