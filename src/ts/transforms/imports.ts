import { lstatSync } from "fs"
import path from "path"
import { visitEachChild, isImportDeclaration, Node, ImportDeclaration, TransformationContext, SourceFile, Program } from "typescript"

export default function ImportsTransformer(_program: Program) {
    return function (context: TransformationContext) {
        return function (sourceFile: SourceFile) {
            const sourcePath = path.dirname(sourceFile.fileName)

            return visitNodeAndChildren(sourceFile)

            function visitNodeAndChildren(node: Node): Node {
                if (node == null) { return node }

                node = visitNode(node)

                return visitEachChild(
                    node,
                    childNode => visitNodeAndChildren(childNode),
                    context
                )
            }

            function visitNode(node: Node): Node { return isImportDeclaration(node) ? visitImportNode(node) : node }

            function isValidPath(importPath: string, addOn: string) {
                try {
                    lstatSync(path.join(sourcePath, `${importPath}${addOn}`))
                    return true
                } catch (error) {
                    return false
                }
            }

            function formatExtension(node: ImportDeclaration, importPath: string): ImportDeclaration {
                let newPath = ''

                if (isValidPath(importPath, '.ts')) {
                    newPath = `${importPath}.js`
                } else if (isValidPath(importPath, '/index.ts')) {
                    newPath = `${importPath}/index.js`
                }

                return context.factory.updateImportDeclaration(
                    node,
                    node.decorators,
                    node.modifiers,
                    node.importClause,
                    context.factory.createStringLiteral(newPath)
                )
            }

            function visitImportNode(node: Node) {
                if (!(node as any).moduleSpecifier) { return node }

                const n = node as ImportDeclaration
                const importPath = (node as any).moduleSpecifier.getText().replace(/"|'/gm, '')
                const fileName = importPath.split('/').pop() || ''
                const ext = fileName.includes('.') ? fileName.split('.').pop() || '' : ''

                // add the correct filename/extension
                if (ext === '') { return formatExtension(n, importPath) }

                return node
            }
        }
    }
}