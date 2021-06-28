const { resolve, join } = require('path')
const { readFileSync } = require('fs')
const glob = require('glob')
const { ModuleKind, ModuleResolutionKind } = require('typescript')

const root = resolve('')

function configData(source, assets, defaultEntry, pathToFiles = [], config = {}) {
    const files = pathToFiles.filter(f => f.split('.').pop() === 'ts')

    return {
        files: files.length ? files : glob.sync(defaultEntry || `${root}/**/*.ts`),
        options: Object.assign(
            {},
            config.compilerOptions,
            Object.assign(
                {},
                config.compilerOptions,
                {
                    module: ModuleKind[config.compilerOptions.module || 'ESNext'] || ModuleKind.ESNext,
                    target: ModuleKind[config.compilerOptions.module || 'ES2020'] || ModuleKind.ES2020,
                    moduleResolution: ModuleResolutionKind[config.compilerOptions.moduleResolution || 'NodeJs'] || ModuleResolutionKind.NodeJs,
                    rootDir: join(root, source),
                    outDir: join(root, assets)
                }
            )
        )
    }
}

function getBaseConfig() {
    return readFileSync(resolve(__dirname, 'tsconfig.json')).toString()
}

module.exports = function tsConfig(source, assets, defaultEntry, pathToFiles) {
    return configData(
        source, assets, defaultEntry, pathToFiles,
        JSON.parse(getBaseConfig())
    )
}