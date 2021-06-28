const { readFileSync } = require("fs")
const path = require("path")
const { visitEachChild, isVariableStatement, NodeFlags } = require("typescript")
const { minify } = require('html-minifier')
const { renderSync } = require('node-sass')

const transformRequire = () => transformerFactory

function visitSourceFile(sourceFile, context) {
    const sourcePath = path.dirname(sourceFile.fileName)
    return visitNodeAndChildren(sourceFile)

    function visitNodeAndChildren(node) {
        if (node == null) { return node }

        node = visitNode(node)

        return visitEachChild(
            node,
            childNode => visitNodeAndChildren(childNode),
            context
        )
    }

    function declarationReducer(result, declaration) {
        if (result !== true) {
            try { result = declaration.initializer.expression.getText() === 'require' } catch (error) { }
        }
        return result
    }

    function isRequiredNode(node) {
        return isVariableStatement(node) &&
            !!node.declarationList &&
            !!node.declarationList.declarations &&
            node.declarationList.declarations.reduce(declarationReducer, false) === true
    }

    function visitNode(node) {
        return isRequiredNode(node) ? visitRequiredNode(node) : node
    }

    function getInitializer(node) {
        return node.declarationList.declarations[0]?.initializer
    }

    function getRequiredPath(initializer) {
        return initializer.arguments[0].getText().replace(/"|'/gm, '')
    }

    function getCode(importPath, ext) {
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

    function createLiteral(node, requiredPath, ext) {
        const name = node.declarationList.declarations[0]?.name?.getText() || ''
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

    function visitRequiredNode(node) {
        const initializer = getInitializer(node)
        const requiredPath = getRequiredPath(initializer)
        const fileName = requiredPath.split('/').pop() || ''
        const ext = fileName.includes('.') ? fileName.split('.').pop() || '' : ''

        if (['scss', 'css', 'html'].indexOf(ext) > -1) { return createLiteral(node, requiredPath, ext) }
        return node
    }
}

const transformerFactory = context => file => visitSourceFile(file, context)

module.exports = transformRequire