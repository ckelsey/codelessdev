import { resolve, join, extname, basename } from 'path'
import glob from 'glob'
import * as ts from 'typescript'
import { CompilerOptions } from 'typescript'

const { ModuleKind, ScriptTarget, ModuleResolutionKind } = ts
const root = resolve('')

export default function TsConfig(source: string, output: string, defaultEntry: string, testsGlob: string, pathToFiles: string[] = []) {
    const files = pathToFiles.filter(f => extname(f) === '.ts' && basename(f) !== '*.ts')

    const baseOptions: CompilerOptions = {
        module: ModuleKind.ESNext,
        target: ScriptTarget.ES2020,
        moduleResolution: ModuleResolutionKind.NodeJs,
        rootDir: join(root, source),
        outDir: join(root, output),
        strict: true,
        esModuleInterop: true,
        isolatedModules: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        allowJs: true,
        declaration: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitAny: true,
        removeComments: true,
        skipLibCheck: true
    }

    return {
        files: files.length ? files : glob.sync(defaultEntry || `${root}/**/*.ts`, testsGlob ? { ignore: testsGlob } : undefined),
        options: baseOptions
    }
}