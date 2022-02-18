// Example from AWS documentation, this is a PUT request

const { HttpRequest} = require("@aws-sdk/protocol-http");
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const { SignatureV4 } = require("@aws-sdk/signature-v4");
const { NodeHttpHandler } = require("@aws-sdk/node-http-handler");
const { Sha256 } = require("@aws-crypto/sha256-browser");

var region = 'us-east-1'; // e.g. us-west-1
var domain = ''; // e.g. search-domain.region.es.amazonaws.com
var index = 'node-test';
var type = '_doc';
var id = '1';
var json = {
    "title": "Moneyball",
    "director": "Bennett Miller",
    "year": "2011"
};

indexDocument(json).then(() => process.exit())

async function indexDocument(document) {

    // Create the HTTP request
    var request = new HttpRequest({
        body: JSON.stringify(document),
        headers: {
            'Content-Type': 'application/json',
            'host': domain
        },
        hostname: domain,
        method: 'PUT',
        path: index + '/' + type + '/' + id
    });
    console.log(request)    
    
    // Sign the request
    var signer = new SignatureV4({
        credentials: defaultProvider(),
        region: region,
        service: 'es',
        sha256: Sha256
    });
    
    var signedRequest = await signer.sign(request);
    console.log(signedRequest)
    // Send the request
    var client = new NodeHttpHandler();
    var { response } =  await client.handle(signedRequest)
    console.log(response.statusCode + ' ' + response.body.statusMessage);
    var responseBody = '';
    await new Promise(() => {
      response.body.on('data', (chunk) => {
        responseBody += chunk;
      });
      response.body.on('end', () => {
        console.log('Response body: ' + responseBody);
      });
    }).catch((error) => {
        console.log('Error: ' + error);
    });
};