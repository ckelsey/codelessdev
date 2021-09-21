import { createSecureServer } from 'http2';
import { readFileSync } from 'fs';
import { basename, join, dirname, extname } from 'path';
import TestUi from './test-ui.js';
export default function Server(staticDir, port, testUiPath, keyPath, certPath) {
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };
    function getKeys() {
        return {
            key: readFileSync(keyPath),
            cert: readFileSync(certPath)
        };
    }
    const server = createSecureServer(Object.assign({}, getKeys()));
    server.on('error', (err) => console.error(err));
    server.on('stream', (stream, headers) => {
        const requestPath = headers[':path'] || '';
        if (requestPath.slice(0, testUiPath.length + 1) === `/${testUiPath}`) {
            return TestUi(requestPath.split(testUiPath).pop(), stream);
        }
        const base = dirname(requestPath) || '/';
        const name = basename(requestPath) || 'index.html';
        const ext = extname(name);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const filePath = join(staticDir, base, name);
        let fileData;
        try {
            fileData = readFileSync(filePath).toString();
        }
        catch (error) { }
        if (!fileData) {
            stream.respond({ ':status': 404 });
            return stream.end('');
        }
        stream.respond({ 'content-type': `${contentType}; charset=utf-8`, ':status': 200 });
        stream.end(fileData);
    });
    server.listen(port);
    console.log(' ');
    console.log(`Server created at https://localhost:${port}`);
    console.log(' ');
    process.on('SIGINT', function () {
        server.close();
        process.exit();
    });
    return server;
}
