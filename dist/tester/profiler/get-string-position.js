export default function getStringPosition(source, lines, startOffset, endOffset, totalBytes, snippet) {
    const startPercent = startOffset / totalBytes;
    const endPercent = endOffset / totalBytes;
    const chars = source.split('');
    let startLine = 0;
    let startColumn = 0;
    let startCharacter = 0;
    let startFound = false;
    let endLine = lines.length - 1;
    let endColumn = chars.length - 1;
    let endCharacter = 0;
    let endFound = false;
    let linesDetailed = [];
    if (startPercent === 0) {
        startFound = true;
    }
    if (endPercent === 1) {
        endFound = true;
    }
    if (!startFound || !endFound) {
        let charactersSearched = 0;
        const startCharacterIndex = Math.round(startPercent * chars.length);
        const endCharacterIndex = Math.round(endPercent * chars.length);
        let lineIndex = 0;
        while (lines[lineIndex]) {
            const lineCharacters = lines[lineIndex].split('');
            const totalSearched = charactersSearched + lineCharacters.length;
            if (!startFound && charactersSearched <= startCharacterIndex && totalSearched >= startCharacterIndex) {
                startLine = lineIndex;
                startColumn = startCharacterIndex - charactersSearched;
                startFound = true;
                startCharacter = charactersSearched + startColumn;
            }
            if (!endFound && charactersSearched <= endCharacterIndex && totalSearched >= endCharacterIndex) {
                endLine = lineIndex;
                endColumn = endCharacterIndex - charactersSearched;
                endFound = true;
                endCharacter = charactersSearched + endColumn;
            }
            if (startFound && endFound) {
                break;
            }
            charactersSearched = totalSearched;
            lineIndex = lineIndex + 1;
        }
    }
    if (startLine < endLine) {
        let lineCountIndex = startLine;
        while (lineCountIndex <= endLine) {
            if (lineCountIndex === startLine) {
                linesDetailed.push({
                    startLine,
                    startColumn,
                    endLine: startLine,
                    endColumn: lines[lineCountIndex].split('').length - 1,
                    snippet: lines[lineCountIndex].slice(startColumn, lines[lineCountIndex].length - 1)
                });
            }
            else if (lineCountIndex === endLine) {
                linesDetailed.push({
                    startLine: lineCountIndex,
                    startColumn: 0,
                    endLine,
                    endColumn,
                    snippet: lines[lineCountIndex].slice(0, endColumn)
                });
            }
            else {
                linesDetailed.push({
                    startLine: lineCountIndex,
                    startColumn: 0,
                    endLine: lineCountIndex,
                    endColumn: lines[lineCountIndex].split('').length - 1,
                    snippet: lines[lineCountIndex]
                });
            }
            lineCountIndex = lineCountIndex + 1;
        }
    }
    else {
        linesDetailed = [{ startLine, startColumn, endLine, endColumn, snippet }];
    }
    return {
        linesDetailed,
        startPercent, endPercent,
        startLine, startColumn, startCharacter,
        endLine, endColumn, endCharacter,
        snippet
    };
}
