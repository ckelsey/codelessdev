interface DetailedLine {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    snippet: string;
}
export interface StringPosition {
    linesDetailed: DetailedLine[];
    startPercent: number;
    endPercent: number;
    startLine: number;
    startColumn: number;
    startCharacter: number;
    endLine: number;
    endColumn: number;
    endCharacter: number;
    snippet: string;
}
export default function getStringPosition(source: string, lines: string[], startOffset: number, endOffset: number, totalBytes: number, snippet: string): StringPosition;
export {};
