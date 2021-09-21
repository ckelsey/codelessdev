import { lstatSync, mkdirSync, writeFileSync } from 'fs'
import { sep, isAbsolute, join } from 'path'

export function make(path: string, contents: string) {

    if (typeof path !== 'string') {
        throw new Error('missing path')
    }

    const parts = path.split(sep).map(p => p.trim()).filter(p => !!p)

    if (isAbsolute(path)) { parts.shift() }
    if (!parts.length) { throw new Error('missing path') }

    const endPath = parts.join(sep)
    let currentPath = ''

    while (parts.length) {
        const currentPart = parts.shift()
        if (!currentPart) { continue }

        currentPath = join(currentPath, currentPart)

        if (currentPath === endPath && contents !== undefined) {
            writeFileSync(currentPath, contents)
        }

        try {
            lstatSync(currentPath)
        } catch (error) {
            mkdirSync(currentPath)
        }
    }
}