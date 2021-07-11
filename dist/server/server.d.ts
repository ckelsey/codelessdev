/// <reference types="node" />
import http2 from 'http2';
export default function Server(staticDir: string, port: string | number): http2.Http2SecureServer;
