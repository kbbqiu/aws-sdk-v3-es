// This is our current implementation. For this one, I went into the node_modules and added a console at
// http-aws-es/src/node.js so that I could see what the signed http request look like

const AWS = require('aws-sdk')
AWS.config.update({ region: "us-east-1" });

const elastic = require('elasticsearch').Client({
  hosts: [ '<ELASTICACHE_HOST>' ],
  connectionClass: require('http-aws-es')
});

(async () => {
  const result = await elastic.search({
    index:  `<EPISODE_INDEX>,<EPISODE_AUDIO_INDEX>`,
    size: 100,
    body: {
      // size: 100,
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
    },
  });
  
  console.log({ result })  
})();
