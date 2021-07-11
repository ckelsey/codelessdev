import { TransformationContext, SourceFile, Node, Program } from "typescript";
export default function RequiresTransformer(_program: Program): (context: TransformationContext) => (sourceFile: SourceFile) => Node;
