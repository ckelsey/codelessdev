import * as ts from 'typescript';
import { TransformationContext, SourceFile, Program, CompilerOptions } from 'typescript';
export default function JSONTransformer(program: Program, config: CompilerOptions): (_context: TransformationContext) => (sourceFile: SourceFile) => ts.SourceFile;
