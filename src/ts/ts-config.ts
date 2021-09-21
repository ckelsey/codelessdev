import { resolve, join, extname, basename } from 'path'
import glob from 'glob'
import ts from 'typescript'
const root = resolve('')

export default function TsConfig(source: string, output: string, defaultEntry: string, testsGlob: string, pathToFiles: string[] = []) {
    const files = pathToFiles.filter(f => extname(f) === '.ts' && basename(f) !== '*.ts')

    const baseOptions: ts.CompilerOptions = {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
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