export default function getLines(string: string) {
    const parts = string.split(/(\r?\n)/)
    const lines = []

    for (let index = 0; index < parts.length; index += 2) {
        lines.push(parts[index] + (parts[index + 1] || ''))
    }

    return lines
}