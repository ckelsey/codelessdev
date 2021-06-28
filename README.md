# Codelessdev
Compiler and testing for development with codeless components

# Install
`npm i -D codelessdev`
`yarn add --dev codelessdev`

In the root directory add the file `codelessdev.json`

#Configuration Options
`port`: The port the static dev site will run on. `default: 8888`
`siteDirectory`: The root folder for the static dev site. `default: ''`
`sourceDirectory`: The directory that contains the source .ts files to compile. `default: 'src'`
`compileOutDirectory`: The directory that the javascript output will go. `default: 'dist'`
`defaultEntry`: The glob pattern or file path to run the initial compile on. `default: 'src/**/*.ts'`

#Run options
`--server`: Starts a server at `https://localhost:[port specified in config options]`.
`--watch`: Enables file watching in the directory specified in the config property `sourceDirectory`.
`--compile`: Compiles typescript files

#Compiling
- Compiles typescript files using `ESNext` module and `ES2020` target.
- Replaces `const file = require('file.html|css|scss')` with `const file = '{minified html|css|scss}'`.
- Ensures `import` resolves to a valid file on output. i.e. `import mod from 'dir/file'` is properly output to `import mod from 'dir/file.js'`.
