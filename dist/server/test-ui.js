import { join } from 'path';
import { readFileSync } from 'fs';
import Config from '../config.js';
const root = import.meta.url.split('file:').pop().split('dist').shift();
export default function TestUi(path, stream) {
    const html = readFileSync(join(root, './assets', 'test-ui.html')).toString('utf-8').replace('{{testUiPath}}', Config.testUiPath);
    while (path[0] === '/') {
        path = path.slice(1);
    }
    if (!path) {
        stream.respond({ 'content-type': `text/html; charset=utf-8`, ':status': 200 });
        return stream.end(html);
    }
    if (path === 'data') {
        let fileData;
        try {
            fileData = readFileSync(join(Config.testResultsDirectory, 'results.json')).toString();
        }
        catch (error) { }
        if (!fileData) {
            stream.respond({ ':status': 404 });
            return stream.end('');
        }
        stream.respond({ 'content-type': `application/json`, ':status': 200 });
        return stream.end(fileData);
    }
}
