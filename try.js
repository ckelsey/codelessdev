import Chrome from './dist/tester/chrome.js'

(async function () {
    Chrome.networkIntercepts = {
        '': (request) => {
            let body = Buffer.from(request.body.body, 'base64').toString('utf-8')
            body = body.split('</head>')
            body.splice(1, 0, `<script type="module" src="/dist/components/field-text/index.js"></script>`)
            body = body.join('</head>')
            body = body.split('</body>')
            body.splice(1, 0, `<field-text></field-text>`)
            body = body.join('</body>')

            return Promise.resolve({
                body,
                responseCode: 200,
                responseHeaders: [{
                    name: 'content-type',
                    value: 'text/html; charset=utf-8'
                }]
            })
        }
    }

    Chrome.launch()
        .then(res => {
            Chrome.navigate('https://localhost:3000/test-field-input')
        })
})()