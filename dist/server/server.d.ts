/// <reference types="node" />
export default function Server(staticDir: string, port: string | number, testUiPath: string, keyPath: string, certPath: string): import("http2").Http2SecureServer;
