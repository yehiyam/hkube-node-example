const NodejsWrapper = require('./lib/algorunner');

const main = async () => {
    const config = {
        algorithm: {
            path: 'algorithm',
            entryPoint: process.env.ALGORITHM_ENTRY_POINT || 'index.js'
        },
        socket: {
            port: process.env.WORKER_SOCKET_PORT || 3000,
            host: process.env.WORKER_SOCKET_HOST || 'localhost',
            protocol: process.env.WORKER_SOCKET_PROTOCOL || 'ws',
            url:'http://10.32.10.4/hkube/debug/foo'// process.env.WORKER_SOCKET_URL || null
        }
    }
    nodejsWrapper = new NodejsWrapper();
    nodejsWrapper.loadAlgorithm(config.algorithm);
    nodejsWrapper.connectToWorker(config.socket);
}

main()