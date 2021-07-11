import { readFileSync } from "fs"
import path from "path"
import { visitEachChild, isVariableStatement, NodeFlags, TransformationContext, SourceFile, VariableStatement, Node, VariableDeclaration, Expression, Program } from "typescript"
import { minify } from 'html-minifier'
import { renderSync } from 'node-sass'

export default function RequiresTransformer(_program: Program) {
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

            function declarationReducer(result: boolean, declaration: VariableDeclaration) {
                if (result !== true) {
                    const initializer = declaration.initializer as any
                    if (!initializer) { return false }

                    const expression = initializer.expression as any
                    if (!expression) { return false }

                    if (typeof expression.getText !== 'function') { return false }

                    return expression.getText() === 'require'
                }
                return result
            }

            function isRequiredNode(node: Node) {
                if (!isVariableStatement(node as any)) {
                    return false
                }

                const n = node as VariableStatement
                return !!n.declarationList && !!n.declarationList.declarations && n.declarationList.declarations.reduce(declarationReducer, false) === true
            }

            function visitNode(node: Node): Node {
                return isRequiredNode(node) ? visitRequiredNode(node as any) : node
            }

            function getInitializer(node: VariableStatement) {
                if (!node.declarationList.declarations.length) { return }
                return node.declarationList.declarations[0].initializer
            }

            function getRequiredPath(initializer: Expression) {
                const i = initializer as any
                if (!i.arguments) { return }
                if (!i.arguments.length) { return }
                if (typeof i.arguments[0].getText !== 'function') { return }
                return i.arguments[0].getText().replace(/"|'/gm, '')
            }

            function getCode(importPath: string, ext: string) {
                if (ext === 'html') {
                    return minify(readFileSync(path.join(sourcePath, importPath)).toString(), {
                        continueOnParseError: true,
                        minifyCSS: true,
                        minifyJS: true,
                        collapseWhitespace: true,
                        collapseInlineTagWhitespace: true
                    })
                }

                if (['scss', 'css'].indexOf(ext) > -1) {
                    return renderSync({ file: path.join(sourcePath, importPath), outputStyle: 'compressed' }).css.toString().trim()
                }

                return ''
            }

            function createLiteral(node: Node, requiredPath: string, ext: string) {
                const name = (node as any).declarationList.declarations[0]?.name?.getText() || ''
                const code = getCode(requiredPath, ext)

                if (!name || !code) { return node }

                return context.factory.createVariableStatement(
                    undefined,
                    context.factory.createVariableDeclarationList(
                        [
                            context.factory.createVariableDeclaration(
                                context.factory.createIdentifier(name),
                                undefined, undefined,
                                context.factory.createStringLiteral(code)
                            ),
                        ],
                        NodeFlags.Const,
                    )
                )
            }

            function visitRequiredNode(node: VariableStatement) {
                const initializer = getInitializer(node)

                if (!initializer) { return node }

                const requiredPath = getRequiredPath(initializer)

                if (!requiredPath) { return node }

                const fileName = requiredPath.split('/').pop() || ''
                const ext = fileName.includes('.') ? fileName.split('.').pop() || '' : ''

                if (['scss', 'css', 'html'].indexOf(ext) > -1) { return createLiteral(node, requiredPath, ext) }
                return node
            }
        }

    }
}