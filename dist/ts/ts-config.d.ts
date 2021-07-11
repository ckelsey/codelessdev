import { CompilerOptions } from 'typescript';
export default function TsConfig(source: string, output: string, defaultEntry: string, testsGlob: string, pathToFiles?: string[]): {
    files: string[];
    options: CompilerOptions;
};
