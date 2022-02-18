//  This is working example following aws-sdk v3 and our implementation

const elastic = require('./search/elastic');

(async () => {
  const result = await elastic.search({
    index: `<EPISODE_INDEX>,<EPISODE_AUDIO_INDEX>`,
    body: {
      size: 100, // note this is the changed value, historicall we set this at the top level
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
