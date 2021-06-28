const path = require("path")
const ts = require("typescript")
const transformImport = require("./transform-import.js")
const transformJson = require("./transform-json.js")
const transformRequire = require("./transform-require.js")

function getFileName(node) { return node?.parent?.originalFileName }

function isNodeExported(node) {
    return ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 || (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile))
}

const root = path.resolve('')

module.exports = function (config) {
    const { files, options } = config

    return new Promise((resolve) => {
        const filesCompiled = []
        const program = ts.createProgram(files, options)
        const transformers = {
            "after": [
                transformJson(program, options),
                transformImport(program),
                transformRequire(program),
            ]
        }

        const emitResult = program.emit(undefined, undefined, undefined, false, transformers)
        const getCompiledName = (f) => {
            const parts = f.split(root)
            return parts[1] ? parts[1].slice(1) : f
        }

        const visit = (node) => {
            const fileName = getFileName(node)
            if (!isNodeExported(node) || filesCompiled.indexOf(fileName) > -1) { return }
            filesCompiled.push(getCompiledName(fileName))
        }

        for (const sourceFile of program.getSourceFiles()) {
            if (!sourceFile.isDeclarationFile) {
                ts.forEachChild(sourceFile, visit)
            }
        }

        const messages = []
        const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

        diagnostics.forEach((diagnostic) => {
            if (diagnostic.file) {
                const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start)
                const message = `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
                if (messages.indexOf(message) === -1) {
                    messages.push(message)
                }
            } else {
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
                if (messages.indexOf(message) === -1) {
                    messages.push(message)
                }
            }
        })

        const result = { emitResult, filesCompiled, messages, diagnostics }

        return resolve(result)
    })
}