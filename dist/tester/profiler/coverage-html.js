import { readFileSync } from 'fs';
import { join, resolve } from 'path';
console.log(resolve(''));
const coverageHTMLTemplate = readFileSync(join(resolve(''), 'assets', 'coverage.html')).toString('utf-8');
export default function coverageHTML(coverage) {
    return coverageHTMLTemplate.split('{ coverage }').join(JSON.stringify(coverage));
}
