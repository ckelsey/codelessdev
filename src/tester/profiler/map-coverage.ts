import Protocol from 'devtools-protocol'
import getLines from './get-lines.js'
import getStringPosition, { StringPosition } from './get-string-position.js'
import { ChromeRequests } from '../chrome.js'
interface MappedRanges extends StringPosition {
    startOffset: number
    endOffset: number
    count: number
    snippet: string
}

interface MappedNode {
    name: string
    ranges: MappedRanges[]
    isBlockCoverage: boolean
}

interface MappedCoverageElement {
    source: string
    characterCount: number
    percentage: number
    lines: string[]
    nodes: MappedNode[]
}

interface CharacterObject {
    [key: number]: {
        additive: { start: number, end: number }[]
        subtractive: { start: number, end: number }[]
    }
}

export interface MappedCoverage { [key: string]: MappedCoverageElement }

export default function mapCoverage(_coverage: Protocol.Profiler.TakePreciseCoverageResponse, requests: ChromeRequests, initialUrl: string) {
    const coverage = _coverage.result.reduce((result: MappedCoverage, current) => {
        const url = current.url.split(initialUrl).join('')

        if (!requests[url]) { return result }

        const rawBody = requests[url].body.body
        const bodyType = requests[url].body.base64Encoded ? 'base64' : undefined
        const source = Buffer.from(rawBody, bodyType).toString('utf-8')
        const lines = getLines(source)
        const totalBytes = Buffer.byteLength(rawBody, bodyType)
        const characters: CharacterObject = {}
        const characterCount = lines.reduce((total, line) => {
            let trimmed = line.trim()

            if (trimmed.slice(0, 7) === 'import ' && trimmed.includes(' from ')) {
                return total
            }

            if (trimmed.slice(0, 15) === 'export default ') {
                trimmed = trimmed.slice(15)
            }

            if (trimmed.slice(0, 7) === 'export ') {
                trimmed = trimmed.slice(7)
            }

            return trimmed.length + total
        }, 0)

        const nodes = current.functions.map(fn => {
            const node: MappedNode = {
                name: fn.functionName,
                isBlockCoverage: fn.isBlockCoverage,
                ranges: fn.ranges.map(range => {
                    const snippet = Buffer.from(rawBody, bodyType).toString('utf-8', range.startOffset, range.endOffset)
                    const positions = getStringPosition(source, lines, range.startOffset, range.endOffset, totalBytes, snippet)

                    positions.linesDetailed.forEach(line => {
                        if (!!line.snippet.trim()) {
                            if (!characters[line.startLine]) { characters[line.startLine] = { additive: [], subtractive: [] } }

                            const lineType = range.count ? 'additive' : 'subtractive'

                            characters[line.startLine][lineType].push({ start: line.startColumn, end: line.endColumn })
                        }
                    })

                    return Object.assign(
                        {
                            startOffset: range.startOffset,
                            endOffset: range.endOffset,
                            count: range.count,
                            snippet
                        },
                        positions
                    )
                }),
            }

            return node
        })

        const charactersUsed: number = Object.keys(characters).reduce((target: number, _index) => {
            const index = parseInt(_index)
            let firstCharacterIndex: any
            let endCharacterIndex = 0

            const line = lines[index].split('').map((character, characterIndex) => {
                const trimmedCharacter = character.trim()
                if (firstCharacterIndex === undefined && !!trimmedCharacter) { firstCharacterIndex = characterIndex }
                if (!!trimmedCharacter && characterIndex > endCharacterIndex) { endCharacterIndex = characterIndex }
                return 0
            })

            characters[index].additive.forEach((additive: { start: number, end: number }) => {
                let start = additive.start

                while (start <= additive.end) {
                    if (start >= firstCharacterIndex && start <= endCharacterIndex) {
                        line[start] = 1
                    }
                    start = start + 1
                }
            })

            characters[index].subtractive.forEach((subtractive: { start: number, end: number }) => {
                let start = subtractive.start

                while (start <= subtractive.end) {
                    if (start >= firstCharacterIndex && start <= endCharacterIndex) {
                        line[start] = 0
                    }
                    start = start + 1
                }
            })

            const reducedCount = line.reduce((totalCount: number, current: number) => current + totalCount, 0)

            return target + reducedCount
        }, 0)

        result[url] = {
            source,
            lines,
            characterCount,
            percentage: (charactersUsed / characterCount) * 100,
            nodes
        }

        return result
    }, {})

    return coverage
}