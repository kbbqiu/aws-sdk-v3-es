const { NodeHttpHandler } = require('@aws-sdk/node-http-handler');
const { HttpRequest } = require('@aws-sdk/protocol-http');
const HttpConnector = require('elasticsearch/src/lib/connectors/http');
const Credentials = require('@aws-sdk/credential-provider-node');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { Sha256 } = require('@aws-crypto/sha256-js');
const { AbortController } = require('@aws-sdk/abort-controller');
const zlib = require('zlib');

const REGION = 'us-east-1';

class HttpAmazonESConnector extends HttpConnector {
    constructor(host, config) {
        super(host, config);

        this.endpoint = {
            protocol: host.protocol && host.protocol.replace(/:?$/, ':'),
            hostname: host.host,
            port: host.port,
            path: '',
            query: host.query,
        };
        this.httpClient = new HttpClient();
    }

    request(params, cb) {
        const reqParams = this.makeReqParams(params);

        const abortController = new AbortController();

        const cancel = () => abortController.abort();

        const done = (err, response, status, headers) => {
            this.log.trace(params.method, reqParams, params.body, response, status);
            cb(err, response, status, headers);
        };

        // load creds
        Credentials.defaultProvider()()
            .catch(e => {
                if (e && e.message) e.message = `AWS Credentials error: ${e.message}`;
                throw e;
            })
            .then(credentials => {
                console.log({credentials})
                if (abortController.signal.aborted) return;

                const request = this.createRequest(params, reqParams);
                const signer = new SignatureV4({
                    credentials,
                    service: 'es',
                    sha256: Sha256,
                    region: REGION,
                });
                return signer
                    .sign(request, { signingDate: new Date() })
                    .then(req => {
                        console.log(req)
                        return this.httpClient.handleRequest(req, { abortSignal: abortController.signal }, done)
                    });
            })
            .catch(done);

        return cancel;
    }

    createRequest(params, reqParams) {
        const request = new HttpRequest(this.endpoint);

        // copy across params
        Object.assign(request, reqParams);
        
        request.region = REGION;
        if (!request.headers) request.headers = {};
        let body = params.body;

        if (body) {
            // const contentLength = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
            // request.headers['Content-Length'] = `${contentLength}`;
            request.body = body;
        }
        request.headers['Host'] = this.endpoint.hostname;
        request.region = 'us-east-1' // new

        return request;
    }
}

module.exports = HttpAmazonESConnector;

class HttpClient {
    constructor() {
        this.client = new NodeHttpHandler({ connectionTimeout: 120000 });
    }

    handleRequest(request, httpOptions, cb) {
        let res, body, status, headers;

        // general clean-up procedure to run after the request
        // completes, has an error, or is aborted.
        const cleanUp = err => {
            res && res.removeAllListeners();

            if (err instanceof Error) return cb(err);

            cb(null, body, status, headers);
        };

        this.client
            .handle(request, httpOptions)
            .then(({ response }) => {
                let incomingMessage = response.body;

                status = response.statusCode;
                headers = response.headers;
                body = '';

                let encoding = (headers['content-encoding'] || '').toLowerCase();
                if (encoding === 'gzip' || encoding === 'deflate') {
                    incomingMessage = incomingMessage.pipe(zlib.createUnzip());
                }

                incomingMessage.setEncoding('utf8');
                incomingMessage.on('data', d => (body += d));

                incomingMessage.on('error', cleanUp);
                incomingMessage.on('end', cleanUp);
            })
            .catch(cleanUp);
    }
}
