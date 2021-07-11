/// <reference types="node" />
export default function Server(staticDir: string, port: string | number): import("http2").Http2SecureServer;
