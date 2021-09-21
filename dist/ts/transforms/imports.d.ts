import ts from 'typescript';
export default function ImportsTransformer(_program: ts.Program): (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => ts.Node;
