import glob from 'glob';
import { resolve, join } from 'path';
import { readFileSync } from 'fs';
const rootDirectory = resolve('');
const configPath = glob.sync(join(rootDirectory, '**/codelessdev.json'), { ignore: join(rootDirectory, 'node_modules/**/codelessdev.json') })[0];
const Config = {
    port: 8888,
    sourceDirectory: 'src',
    compileOutDirectory: 'dist',
    testsPattern: 'src/**/*.spec.js',
    testResultsDirectory: 'test-results',
    testUiPath: 'tests',
    siteDirectory: '',
    defaultEntry: 'src/**/*.ts',
    serverKey: './server.key',
    serverCert: './server.crt'
};
try {
    Object.assign(Config, JSON.parse(readFileSync(configPath).toString()));
}
catch (error) { }
export default Config;
