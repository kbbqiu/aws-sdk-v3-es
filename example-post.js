// Working example of a POST, basic HTTP Request w/o using elasticsearch client

const { SignatureV4 } = require("@aws-sdk/signature-v4");
const { HttpRequest } = require("@aws-sdk/protocol-http");
const { Sha256 } = require("@aws-crypto/sha256-js");
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const { NodeHttpHandler } = require("@aws-sdk/node-http-handler");

(async () => {
  const body = JSON.stringify({
    size: 100,
    min_score: 0.05,
    query: {
      bool: {
        should: [
          {
            multi_match: {
              query: "test",
              fields: ['title^3', 'description', 'caption'],
            },
          },
        ],
        filter: {
          bool: {
            must: [],
          },
        },
      },
    },
  });
  const hostname = "<ELASTICACHE_HOST>";

  const http_config = {
    body,
    hostname,
    headers: {
      "Content-Type": "application/json",
      host: hostname,
    },
    method: "POST",
    path: "/<EPISODE_INDEX>%2C<EPISODE_AUDIO_INDEX>/_search",
    port: 443,
    protocol: "https:",
    query: {}
  }

  const httpRequest = new HttpRequest(http_config);

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: 'us-east-1',
    service: "es",
    sha256: Sha256,
  });

  const signedHttpRequest = await signer.sign(httpRequest)
  console.log(signedHttpRequest);

  try {
    const httpHandler = new NodeHttpHandler();
    const res = await httpHandler.handle(signedHttpRequest);
    const body = await new Promise((resolve, reject) => {
      const message = res.response.body;
      let body = "";
      message.on("data", (chunk) => {
        body += chunk;
      });
      message.on("end", () => {
        resolve(body);
      });
      message.on("error", (err) => {
        reject(err);
      });
    });
    console.log(body)
  } catch (err) {
    console.error("Error:");
    console.error(err);
  }
})();
