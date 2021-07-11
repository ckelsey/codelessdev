import { Node, TransformationContext, SourceFile, Program } from "typescript";
export default function ImportsTransformer(_program: Program): (context: TransformationContext) => (sourceFile: SourceFile) => Node;
