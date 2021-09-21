import { lstatSync } from "fs"
import { dirname, join } from "path"
import ts from 'typescript'

export default function ImportsTransformer(_program: ts.Program) {
    return function (context: ts.TransformationContext) {
        return function (sourceFile: ts.SourceFile) {
            const sourcePath = dirname(sourceFile.fileName)

            return visitNodeAndChildren(sourceFile)

            function visitNodeAndChildren(node: ts.Node): ts.Node {
                if (node == null) { return node }

                node = visitNode(node)

                return ts.visitEachChild(
                    node,
                    childNode => visitNodeAndChildren(childNode),
                    context
                )
            }

            function visitNode(node: ts.Node): ts.Node { return ts.isImportDeclaration(node) ? visitImportNode(node) : node }

            function isValidPath(importPath: string, addOn: string) {
                try {
                    lstatSync(join(sourcePath, `${importPath}${addOn}`))
                    return true
                } catch (error) {
                    return false
                }
            }

            function formatExtension(node: ts.ImportDeclaration, importPath: string): ts.ImportDeclaration {
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

            function visitImportNode(node: ts.Node) {
                if (!(node as any).moduleSpecifier) { return node }

                const n = node as ts.ImportDeclaration
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