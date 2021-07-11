import { CompilerOptions } from 'typescript';
export interface CompilerResult {
    emitResult: any;
    filesCompiled: any[];
    messages: any[];
    diagnostics: any;
    files: any;
}
export default function Compiler(files: string[], options: CompilerOptions): Promise<CompilerResult>;
