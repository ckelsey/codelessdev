import ts from 'typescript';
export default function JSONTransformer(program: ts.Program, config: ts.CompilerOptions): (_context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => ts.SourceFile;
