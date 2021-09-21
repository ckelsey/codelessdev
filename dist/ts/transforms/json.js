import { resolve, dirname, basename, extname, join } from "path";
import ts from 'typescript';
const root = resolve('');
function isNodeExported(node) {
    return ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 || (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile));
}
function getDocs(el) {
    if (!el) {
        return {};
    }
    if (!el.jsDoc && el.original) {
        return getDocs(el.original);
    }
    if (!el.jsDoc) {
        return {};
    }
    const docs = el.jsDoc.reduce((results, doc) => {
        if (doc.comment) {
            results.description = doc.comment;
        }
        if (doc.tags) {
            return Object.assign({}, results, doc.tags.reduce((tagsResults, tag) => {
                const name = tag.tagName.escapedText;
                if (name === 'param') {
                    if (!tagsResults[name]) {
                        tagsResults[name] = {};
                    }
                    tagsResults[name][tag.name.escapedText] = tag.comment;
                }
                else {
                    tagsResults[name] = tag.comment;
                }
                return tagsResults;
            }, {}));
        }
        return results;
    }, {});
    return docs;
}
function getNodeTypeFromSymbol(typeChecker, node) {
    const _symbol = node.symbol || node.original.symbol;
    const symbol = typeChecker.getTypeOfSymbolAtLocation(_symbol, _symbol.valueDeclaration);
    const string = typeChecker.typeToString(symbol);
    return string;
}
function kindToText(kind) {
    if (kind === ts.SyntaxKind.NullKeyword) {
        return 'null';
    }
    if (kind === ts.SyntaxKind.BooleanKeyword) {
        return 'boolean';
    }
    if (kind === ts.SyntaxKind.TrueKeyword) {
        return 'true';
    }
    if (kind === ts.SyntaxKind.FalseKeyword) {
        return 'false';
    }
    if (kind === ts.SyntaxKind.StringKeyword) {
        return 'string';
    }
    if (kind === ts.SyntaxKind.VoidKeyword) {
        return 'void';
    }
    if (kind === ts.SyntaxKind.UndefinedKeyword) {
        return 'undefined';
    }
    if (kind === ts.SyntaxKind.FunctionKeyword) {
        return 'function';
    }
    if (kind === ts.SyntaxKind.SymbolKeyword) {
        return 'symbol';
    }
    if (kind === ts.SyntaxKind.ObjectKeyword) {
        return 'object';
    }
    if (kind === ts.SyntaxKind.NumberKeyword) {
        return 'number';
    }
    if (kind === ts.SyntaxKind.BigIntKeyword) {
        return 'bigint';
    }
}
function typeToString(typeChecker, type) {
    if (type.members) {
        const members = type.members.map((member) => `{[${member.parameters[0].name.escapedText}: ${typeToString(typeChecker, member.parameters[0].type)}]: ${typeToString(typeChecker, member.type)}}`);
        if (members.length === 1) {
            return members[0];
        }
        return members;
    }
    if (type.literal) {
        if (type.literal.text) {
            return type.literal.text;
        }
        if (type.typeName) {
            return type.typeName.escapedText;
        }
        const kind = kindToText(type.literal.kind);
        if (kind) {
            return kind;
        }
    }
    if (type.typeName) {
        return type.typeName.escapedText;
    }
    if (type.types) {
        return type.types.map((val) => typeToString(typeChecker, val)).join(' | ');
    }
    const kind = kindToText(type.kind);
    if (kind) {
        return kind;
    }
    if (type.objectType) {
        return `${type.objectType.typeName.escapedText}[${type.indexType.literal.text}]`;
    }
    if (type.elementType && type.kind === ts.SyntaxKind.ArrayType) {
        return `${typeToString(typeChecker, type.elementType)}[]`;
    }
    return 'unknown';
}
function typeString(typeChecker, node) {
    return node.type ? typeToString(typeChecker, node) : getNodeTypeFromSymbol(typeChecker, node);
}
function classSchema(typeChecker, node) {
    const result = {
        methods: {},
        properties: {},
        name: node.name.escapedText
    };
    Object.assign(result, getDocs(node));
    if (node.members) {
        node.members.forEach((member) => {
            if (member.kind === ts.SyntaxKind.Constructor) {
                return;
            }
            if (member.kind === ts.SyntaxKind.MethodDeclaration) {
                return result.methods[member.name.escapedText] = Object.assign(getDocs(member), {
                    name: member.name.escapedText,
                    parameters: member.parameters.map((param) => parametersSchema(typeChecker, param)),
                    returns: typeString(typeChecker, member)
                });
            }
            if (member.kind === ts.SyntaxKind.PropertyDeclaration) {
                const propertyName = member.name.escapedText;
                if (!result.properties[propertyName]) {
                    result.properties[propertyName] = {};
                }
                result.properties[propertyName].name = propertyName;
                result.properties[propertyName].type = typeString(typeChecker, member);
                result.properties[propertyName].readonly = false;
                Object.assign(result.properties[propertyName], getDocs(member));
                return;
            }
            if (member.kind === ts.SyntaxKind.SetAccessor) {
                const propertyName = member.name.escapedText;
                if (!result.properties[propertyName]) {
                    result.properties[propertyName] = {};
                }
                result.properties[propertyName].name = propertyName;
                result.properties[propertyName].readonly = false;
                if (member.parameters) {
                    result.properties[propertyName].type = typeString(typeChecker, member.parameters[0]);
                }
                Object.assign(result.properties[propertyName], getDocs(member));
                return;
            }
            if (member.kind === ts.SyntaxKind.GetAccessor) {
                const propertyName = member.name.escapedText;
                if (!result.properties[propertyName]) {
                    result.properties[propertyName] = { readonly: true };
                }
                result.properties[propertyName].name = propertyName;
                result.properties[propertyName].type = typeString(typeChecker, member);
                Object.assign(result.properties[propertyName], getDocs(member));
                return;
            }
        });
    }
    return result;
}
function parametersSchema(typeChecker, param) {
    return Object.assign({}, getDocs(param), {
        name: param.name.escapedText,
        type: typeString(typeChecker, param),
        optional: !!param.questionToken
    });
}
function propertySchema(typeChecker, property) {
    return {
        name: property.name.escapedText,
        type: typeString(typeChecker, property)
    };
}
function typeAliasSchems(typeChecker, node) {
    return {
        name: node.name.escapedText,
        properties: node.type && node.type.members ? node.type.members.map((member) => propertySchema(typeChecker, member)) : []
    };
}
function importSchema(node) {
    const result = {
        from: node.moduleSpecifier.text
    };
    if (node.importClause) {
        if (node.importClause.name) {
            result.name = node.importClause.name.getText();
        }
        if (node.importClause.namedBindings) {
            result.names = node.importClause.namedBindings.elements.map((binding) => binding.name.escapedText);
        }
    }
    return result;
}
function srcToDist(config, src) {
    return (!src.includes(root) ? join(root, src) : src).split(config.rootDir).join(config.outDir);
}
function schemaFilename(src) {
    return `${basename(src, extname(src))}.json`;
}
export default function JSONTransformer(program, config) {
    return function (_context) {
        return function (sourceFile) {
            const typeChecker = program.getTypeChecker();
            const sourcePath = dirname(sourceFile.fileName);
            const outPath = srcToDist(config, `${join(sourcePath, schemaFilename(sourceFile.fileName))}`);
            const imports = [];
            const definitions = {};
            const errors = [];
            ts.forEachChild(sourceFile, node => {
                const n = node;
                const name = n.name ? n.name.getText() : undefined;
                if (!isNodeExported(node) || ts.SyntaxKind.EndOfFileToken === node.kind || ts.isExportDeclaration(node)) {
                    return;
                }
                if (ts.isImportDeclaration(node)) {
                    imports.push(importSchema(node));
                }
                else if (ts.isTypeAliasDeclaration(node)) {
                    const type = typeAliasSchems(typeChecker, node);
                    Object.assign(definitions, { [type.name]: type });
                }
                else if (ts.isClassDeclaration(node)) {
                    const result = classSchema(typeChecker, node);
                    Object.assign(definitions, { [result.name]: result });
                }
                else if (name) {
                    errors.push(name);
                }
                else if (ts.isExpressionStatement(node)) {
                    const args = n.arguments ? n.arguments : node.expression && n.expression.arguments ? n.expression.arguments : [{ text: '' }];
                    errors.push(args.text);
                }
                else if (ts.SyntaxKind.FirstStatement === node.kind) {
                    errors.push(n.declarationList.declarations[0].name.escapedText);
                }
                else if (ts.SyntaxKind.ExportAssignment === node.kind) {
                    errors.push(n.symbol.escapedName);
                }
                else {
                    errors.push(node.kind);
                }
            });
            const resultString = JSON.stringify({ imports, definitions, errors });
            ts.sys.writeFile(outPath, resultString);
            return sourceFile;
        };
    };
}
