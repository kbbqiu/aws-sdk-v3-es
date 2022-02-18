const elasticsearch = require('elasticsearch');
const ConnectionClass = require('./aws-es-connector');

const ES_TIMEOUT = 5000;

module.exports = (() => {
    const config = { 
        connectionClass: ConnectionClass, 
        requestTimeout: ES_TIMEOUT,
        host: '<ELASTICACHE_HOST>'
    }
    return elasticsearch.Client(config);
})();
