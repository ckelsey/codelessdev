import { resolve, dirname, basename, extname, join } from "path"
import { isExpressionStatement, getCombinedModifierFlags, ModifierFlags, SyntaxKind, forEachChild, isExportDeclaration, sys, isImportDeclaration, isTypeAliasDeclaration, isClassDeclaration, TransformationContext, SourceFile, Program, CompilerOptions, TypeChecker, ParameterDeclaration } from "typescript"

interface ParameterSchema {
    name: string
    type: string
    optional: boolean
}

interface PropertySchema {
    name?: string
    type?: string
    optional?: boolean
    readonly?: boolean
}

interface MethodSchema {
    name: string
    parameters: ParameterSchema[]
}

interface ClassSchema {
    name: string
    methods: { [key: string]: MethodSchema }
    properties: { [key: string]: PropertySchema }
}

interface ImportSchema {
    from: string
    name?: string
    names?: string[]
}

const root = resolve('')

function isNodeExported(node: any) {
    return ((getCombinedModifierFlags(node) & ModifierFlags.Export) !== 0 || (!!node.parent && node.parent.kind === SyntaxKind.SourceFile))
}

function getDocs(el: any): any {
    if (!el) { return {} }

    if (!el.jsDoc && el.original) { return getDocs(el.original) }

    if (!el.jsDoc) { return {} }

    const docs = el.jsDoc.reduce((results: any, doc: any) => {
        if (doc.comment) { results.description = doc.comment }

        if (doc.tags) {
            return Object.assign(
                {},
                results,
                doc.tags.reduce((tagsResults: any, tag: any) => {
                    const name = tag.tagName.escapedText

                    if (name === 'param') {
                        if (!tagsResults[name]) { tagsResults[name] = {} }
                        tagsResults[name][tag.name.escapedText] = tag.comment
                    } else {
                        tagsResults[name] = tag.comment
                    }

                    return tagsResults
                }, {})
            )
        }

        return results
    }, {})

    return docs
}

function getNodeTypeFromSymbol(typeChecker: TypeChecker, node: any) {
    const _symbol = node.symbol || node.original.symbol
    const symbol = typeChecker.getTypeOfSymbolAtLocation(_symbol, _symbol.valueDeclaration)
    const string = typeChecker.typeToString(symbol)
    return string
}

function kindToText(kind: number) {
    if (kind === SyntaxKind.NullKeyword) { return 'null' }
    if (kind === SyntaxKind.BooleanKeyword) { return 'boolean' }
    if (kind === SyntaxKind.TrueKeyword) { return 'true' }
    if (kind === SyntaxKind.FalseKeyword) { return 'false' }
    if (kind === SyntaxKind.StringKeyword) { return 'string' }
    if (kind === SyntaxKind.VoidKeyword) { return 'void' }
    if (kind === SyntaxKind.UndefinedKeyword) { return 'undefined' }
    if (kind === SyntaxKind.FunctionKeyword) { return 'function' }
    if (kind === SyntaxKind.SymbolKeyword) { return 'symbol' }
    if (kind === SyntaxKind.ObjectKeyword) { return 'object' }
    if (kind === SyntaxKind.NumberKeyword) { return 'number' }
    if (kind === SyntaxKind.BigIntKeyword) { return 'bigint' }
}

function typeToString(typeChecker: TypeChecker, type: any): string {
    if (type.members) {
        const members = type.members.map((member: any) => `{[${member.parameters[0].name.escapedText}: ${typeToString(typeChecker, member.parameters[0].type)}]: ${typeToString(typeChecker, member.type)}}`)
        if (members.length === 1) { return members[0] }
        return members
    }

    if (type.literal) {
        if (type.literal.text) { return type.literal.text }
        if (type.typeName) { return type.typeName.escapedText }

        const kind = kindToText(type.literal.kind)

        if (kind) { return kind }
    }

    if (type.typeName) { return type.typeName.escapedText }

    if (type.types) { return type.types.map((val: any) => typeToString(typeChecker, val)).join(' | ') }

    const kind = kindToText(type.kind)

    if (kind) { return kind }

    if (type.objectType) { return `${type.objectType.typeName.escapedText}[${type.indexType.literal.text}]` }

    if (type.elementType && type.kind === SyntaxKind.ArrayType) { return `${typeToString(typeChecker, type.elementType)}[]` }

    return 'unknown'
}

function typeString(typeChecker: TypeChecker, node: any) {
    return node.type ? typeToString(typeChecker, node) : getNodeTypeFromSymbol(typeChecker, node)
}

function classSchema(typeChecker: TypeChecker, node: any) {
    const result: ClassSchema = {
        methods: {},
        properties: {},
        name: node.name.escapedText
    }

    Object.assign(result, getDocs(node))

    /** TDOD */
    // if (node.heritageClauses) {}

    if (node.members) {
        node.members.forEach((member: any) => {
            if (member.kind === SyntaxKind.Constructor) { return }

            if (member.kind === SyntaxKind.MethodDeclaration) {
                return result.methods[member.name.escapedText] = Object.assign(getDocs(member), {
                    name: member.name.escapedText,
                    parameters: member.parameters.map((param: ParameterDeclaration) => parametersSchema(typeChecker, param)),
                    returns: typeString(typeChecker, member)
                })
            }

            if (member.kind === SyntaxKind.PropertyDeclaration) {
                const propertyName = member.name.escapedText
                if (!result.properties[propertyName]) { result.properties[propertyName] = {} }
                result.properties[propertyName].name = propertyName
                result.properties[propertyName].type = typeString(typeChecker, member)
                result.properties[propertyName].readonly = false
                Object.assign(result.properties[propertyName], getDocs(member))
                return
            }

            if (member.kind === SyntaxKind.SetAccessor) {
                const propertyName = member.name.escapedText
                if (!result.properties[propertyName]) { result.properties[propertyName] = {} }
                result.properties[propertyName].name = propertyName
                result.properties[propertyName].readonly = false
                if (member.parameters) {
                    result.properties[propertyName].type = typeString(typeChecker, member.parameters[0])
                }
                Object.assign(result.properties[propertyName], getDocs(member))
                return
            }

            if (member.kind === SyntaxKind.GetAccessor) {
                const propertyName = member.name.escapedText
                if (!result.properties[propertyName]) { result.properties[propertyName] = { readonly: true } }
                result.properties[propertyName].name = propertyName
                result.properties[propertyName].type = typeString(typeChecker, member)
                Object.assign(result.properties[propertyName], getDocs(member))
                return
            }
        })
    }

    return result
}

function parametersSchema(typeChecker: TypeChecker, param: any) {
    return Object.assign({}, getDocs(param), {
        name: param.name.escapedText,
        type: typeString(typeChecker, param),
        optional: !!param.questionToken
    })
}

function propertySchema(typeChecker: TypeChecker, property: any) {
    return {
        name: property.name.escapedText,
        type: typeString(typeChecker, property)
    }
}

function typeAliasSchems(typeChecker: TypeChecker, node: any) {
    return {
        name: node.name.escapedText,
        properties: node.type && node.type.members ? node.type.members.map((member: any) => propertySchema(typeChecker, member)) : []
    }
}

function importSchema(node: any) {
    const result: ImportSchema = {
        from: node.moduleSpecifier.text
    }

    if (node.importClause) {
        if (node.importClause.name) { result.name = node.importClause.name.getText() }

        if (node.importClause.namedBindings) { result.names = node.importClause.namedBindings.elements.map((binding: any) => binding.name.escapedText) }
    }

    return result
}

function srcToDist(config: CompilerOptions, src: string) {
    return (!src.includes(root) ? join(root, src) : src).split(config.rootDir as string).join(config.outDir)
}

function schemaFilename(src: string) {
    return `${basename(src, extname(src))}.json`
}

export default function JSONTransformer(program: Program, config: CompilerOptions) {
    return function (_context: TransformationContext) {
        return function (sourceFile: SourceFile) {
            const typeChecker = program.getTypeChecker()
            const sourcePath = dirname(sourceFile.fileName)
            const outPath = srcToDist(config, `${join(sourcePath, schemaFilename(sourceFile.fileName))}`)
            const imports: ImportSchema[] = []
            const definitions = {}
            const errors: any[] = []

            forEachChild(sourceFile, node => {
                const n = node as any
                const name = n.name ? n.name.getText() : undefined

                if (!isNodeExported(node) || SyntaxKind.EndOfFileToken === node.kind || isExportDeclaration(node)) { return }

                if (isImportDeclaration(node)) {
                    imports.push(importSchema(node))
                } else if (isTypeAliasDeclaration(node)) {
                    const type = typeAliasSchems(typeChecker, node)
                    Object.assign(definitions, { [type.name]: type })
                } else if (isClassDeclaration(node)) {
                    const result = classSchema(typeChecker, node)
                    Object.assign(definitions, { [result.name]: result })
                }
                // LOG AS ERRORS FOR NOW
                else if (name) {
                    errors.push(name)
                } else if (isExpressionStatement(node)) {
                    const args = n.arguments ? n.arguments : node.expression && n.expression.arguments ? n.expression.arguments : [{ text: '' }]
                    errors.push(args.text)
                } else if (SyntaxKind.FirstStatement === node.kind) {
                    errors.push(n.declarationList.declarations[0].name.escapedText)
                } else if (SyntaxKind.ExportAssignment === node.kind) {
                    errors.push(n.symbol.escapedName)
                } else {
                    errors.push(node.kind)
                }

            })

            const resultString = JSON.stringify({ imports, definitions, errors })

            sys.writeFile(outPath, resultString)

            return sourceFile
        }

    }
}