import { readFileSync } from 'fs'
import { join } from 'path'
import { MappedCoverage } from './map-coverage.js'

const root = import.meta.url.split('file:').pop() || ''
const coverageHtmlPath = join(root, '../../../..', 'assets', 'coverage.html')
const coverageHTMLTemplate = readFileSync(coverageHtmlPath).toString('utf-8')

export default function coverageHTML(coverage: MappedCoverage) {
    return coverageHTMLTemplate.split('{ coverage }').join(JSON.stringify(coverage))
}