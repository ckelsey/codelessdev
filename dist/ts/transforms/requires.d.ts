import ts from 'typescript';
export default function RequiresTransformer(_program: ts.Program): (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => ts.Node;
