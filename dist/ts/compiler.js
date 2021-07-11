import path from "path";
import ts from "typescript";
import ImportsTransformer from "./transforms/imports";
import RequiresTransformer from "./transforms/requires";
import JSONTransformer from "./transforms/json";
function getFileName(node) { return node?.parent?.originalFileName; }
function isNodeExported(node) {
    return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 || (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
}
const root = path.resolve('');
export default function Compiler(files, options) {
    return new Promise((resolve) => {
        const filesCompiled = [];
        const program = ts.createProgram(files, options);
        const transformers = {
            "after": [
                JSONTransformer(program, options),
                ImportsTransformer(program),
                RequiresTransformer(program),
            ]
        };
        const emitResult = program.emit(undefined, undefined, undefined, false, transformers);
        const getCompiledName = (f) => {
            const parts = f.split(root);
            return parts[1] ? parts[1].slice(1) : f;
        };
        const visit = (node) => {
            const fileName = getCompiledName(getFileName(node));
            if (!isNodeExported(node) || filesCompiled.indexOf(fileName) > -1) {
                return;
            }
            filesCompiled.push(fileName);
        };
        for (const sourceFile of program.getSourceFiles()) {
            if (!sourceFile.isDeclarationFile) {
                ts.forEachChild(sourceFile, visit);
            }
        }
        const messages = [];
        const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
        diagnostics.forEach((diagnostic) => {
            if (diagnostic.file) {
                const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start || 0);
                const message = `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
                if (messages.indexOf(message) === -1) {
                    messages.push(message);
                }
            }
            else {
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                if (messages.indexOf(message) === -1) {
                    messages.push(message);
                }
            }
        });
        const result = { emitResult, filesCompiled, messages, diagnostics, files };
        return resolve(result);
    });
}
