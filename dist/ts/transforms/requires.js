import { readFileSync } from "fs";
import { dirname, join } from "path";
import { minify } from 'html-minifier';
import { renderSync } from 'node-sass';
import ts from 'typescript';
export default function RequiresTransformer(_program) {
    return function (context) {
        return function (sourceFile) {
            const sourcePath = dirname(sourceFile.fileName);
            return visitNodeAndChildren(sourceFile);
            function visitNodeAndChildren(node) {
                if (node == null) {
                    return node;
                }
                node = visitNode(node);
                return ts.visitEachChild(node, childNode => visitNodeAndChildren(childNode), context);
            }
            function declarationReducer(result, declaration) {
                if (result !== true) {
                    const initializer = declaration.initializer;
                    if (!initializer) {
                        return false;
                    }
                    const expression = initializer.expression;
                    if (!expression) {
                        return false;
                    }
                    if (typeof expression.getText !== 'function') {
                        return false;
                    }
                    try {
                        return expression.getText() === 'require';
                    }
                    catch (error) {
                        return false;
                    }
                }
                return result;
            }
            function isRequiredNode(node) {
                if (!ts.isVariableStatement(node)) {
                    return false;
                }
                const n = node;
                return !!n.declarationList && !!n.declarationList.declarations && n.declarationList.declarations.reduce(declarationReducer, false) === true;
            }
            function visitNode(node) {
                return isRequiredNode(node) ? visitRequiredNode(node) : node;
            }
            function getInitializer(node) {
                if (!node.declarationList.declarations.length) {
                    return;
                }
                return node.declarationList.declarations[0].initializer;
            }
            function getRequiredPath(initializer) {
                const i = initializer;
                if (!i.arguments) {
                    return;
                }
                if (!i.arguments.length) {
                    return;
                }
                if (typeof i.arguments[0].getText !== 'function') {
                    return;
                }
                return i.arguments[0].getText().replace(/"|'/gm, '');
            }
            function getCode(importPath, ext) {
                if (ext === 'html') {
                    return minify(readFileSync(join(sourcePath, importPath)).toString(), {
                        continueOnParseError: true,
                        minifyCSS: true,
                        minifyJS: true,
                        collapseWhitespace: true,
                        collapseInlineTagWhitespace: true
                    });
                }
                if (['scss', 'css'].indexOf(ext) > -1) {
                    return renderSync({ file: join(sourcePath, importPath), outputStyle: 'compressed' }).css.toString().trim();
                }
                return '';
            }
            function createLiteral(node, requiredPath, ext) {
                const name = node.declarationList.declarations[0]?.name?.getText() || '';
                const code = getCode(requiredPath, ext);
                if (!name || !code) {
                    return node;
                }
                return context.factory.createVariableStatement(undefined, context.factory.createVariableDeclarationList([
                    context.factory.createVariableDeclaration(context.factory.createIdentifier(name), undefined, undefined, context.factory.createStringLiteral(code)),
                ], ts.NodeFlags.Const));
            }
            function visitRequiredNode(node) {
                const initializer = getInitializer(node);
                if (!initializer) {
                    return node;
                }
                const requiredPath = getRequiredPath(initializer);
                if (!requiredPath) {
                    return node;
                }
                const fileName = requiredPath.split('/').pop() || '';
                const ext = fileName.includes('.') ? fileName.split('.').pop() || '' : '';
                if (['scss', 'css', 'html'].indexOf(ext) > -1) {
                    return createLiteral(node, requiredPath, ext);
                }
                return node;
            }
        };
    };
}
