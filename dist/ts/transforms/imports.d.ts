import * as ts from 'typescript';
import { TransformationContext, SourceFile, Program } from 'typescript';
export default function ImportsTransformer(_program: Program): (context: TransformationContext) => (sourceFile: SourceFile) => ts.Node;
