const messages = require('../lib/consts/messages');
const delay = ms => new Promise(r => setTimeout(r, ms));

const start = async (args, { ws }) => {
    await delay(3000)
    ws.send({ command: messages.outgoing.startAlgorithmExecution, data: { execId: 1, algorithmName: 'green-alg', input: [] } })
    return new Promise((resolve, reject) => {
        ws.on(messages.incoming.execAlgorithmDone, (data) => {
            resolve(3)
        })
    })
}

module.exports = {
    start
}