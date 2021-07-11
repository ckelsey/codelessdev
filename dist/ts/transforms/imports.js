import { lstatSync } from "fs";
import { dirname, join } from "path";
import * as ts from 'typescript';
const { visitEachChild, isImportDeclaration } = ts;
export default function ImportsTransformer(_program) {
    return function (context) {
        return function (sourceFile) {
            const sourcePath = dirname(sourceFile.fileName);
            return visitNodeAndChildren(sourceFile);
            function visitNodeAndChildren(node) {
                if (node == null) {
                    return node;
                }
                node = visitNode(node);
                return visitEachChild(node, childNode => visitNodeAndChildren(childNode), context);
            }
            function visitNode(node) { return isImportDeclaration(node) ? visitImportNode(node) : node; }
            function isValidPath(importPath, addOn) {
                try {
                    lstatSync(join(sourcePath, `${importPath}${addOn}`));
                    return true;
                }
                catch (error) {
                    return false;
                }
            }
            function formatExtension(node, importPath) {
                let newPath = '';
                if (isValidPath(importPath, '.ts')) {
                    newPath = `${importPath}.js`;
                }
                else if (isValidPath(importPath, '/index.ts')) {
                    newPath = `${importPath}/index.js`;
                }
                return context.factory.updateImportDeclaration(node, node.decorators, node.modifiers, node.importClause, context.factory.createStringLiteral(newPath));
            }
            function visitImportNode(node) {
                if (!node.moduleSpecifier) {
                    return node;
                }
                const n = node;
                const importPath = node.moduleSpecifier.getText().replace(/"|'/gm, '');
                const fileName = importPath.split('/').pop() || '';
                const ext = fileName.includes('.') ? fileName.split('.').pop() || '' : '';
                if (ext === '') {
                    return formatExtension(n, importPath);
                }
                return node;
            }
        };
    };
}
