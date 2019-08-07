const fs = require('fs');
const pathLib = require('path');
const Websocket = require('./websocket/ws');
const messages = require('./consts/messages');
const methods = require('./consts/methods');

class Algorunner {
    constructor() {
        this._url = null;
        this._input = null;
        this._loadAlgorithmError = null;
        this._algorithm = Object.create(null);
    }

    connectToWorker(options) {
        try {
            const config = options || {};
            const { url, protocol, host, port } = config;
            this._url = url || `${protocol}://${host}:${port}`;
            console.debug(`connecting to ${this._url}`);
            this._wsc = new Websocket({ url: this._url });
            this._registerToCommunicationEvents();
        }
        catch (e) {
            console.error(e.message);
        }
    }

    loadAlgorithm(options) {
        try {
            if (!options || !options.path) {
                throw new Error('missing path');
            }
            const { path, entryPoint } = options;
            const entry = entryPoint || '';
            const cwd = pathLib.join(process.cwd(), path);
            if (!fs.existsSync(cwd)) {
                throw new Error(`invalid path ${path}`);
            }
            const fullPath = pathLib.join(cwd, entry);
            process.chdir(cwd);
            console.log(`loading ${fullPath}`);
            const algorithm = require(fullPath); // eslint-disable-line
            console.log('algorithm code loaded');

            Object.entries(methods).forEach(([k, v]) => {
                const method = algorithm[k];
                if (method && typeof method === 'function') {
                    console.log(`found method ${k}`);
                    this._algorithm[k] = method;
                }
                else {
                    const error = `unable to find ${v.type} method ${k}`;
                    if (v.type === 'mandatory') {
                        throw new Error(error);
                    }
                    console.log(error);
                }
            });
        }
        catch (e) {
            this._loadAlgorithmError = e.message;
            console.error(e.message);
        }
    }

    _registerToCommunicationEvents() {
        this._wsc.on('connection', () => {
            console.debug(`connected to ${this._url}`);
        });
        this._wsc.on('disconnect', () => {
            console.debug(`disconnected from ${this._url}`);
        });
        this._wsc.on(messages.incoming.initialize, options => this._init(options));
        this._wsc.on(messages.incoming.start, options => this._start(options));
        this._wsc.on(messages.incoming.stop, options => this._stop(options));
        this._wsc.on(messages.incoming.exit, options => this._exit(options));
    }

    async _init(options) {
        try {
            if (this._loadAlgorithmError) {
                this._sendError(this._loadAlgorithmError);
            }
            else {
                this._input = options;
                if (this._algorithm.init) {
                    await this._algorithm.init(options);
                }
                this._sendCommand({ command: messages.outgoing.initialized });
            }
        }
        catch (error) {
            this._sendError(error);
        }
    }

    async _start() {
        try {
            this._sendCommand({ command: messages.outgoing.started });
            const output = await this._algorithm.start(this._input, {ws: this._wsc});
            this._sendCommand({ command: messages.outgoing.done, data: output });
        }
        catch (error) {
            this._sendError(error);
        }
    }

    async _stop() {
        try {
            if (this._algorithm.stop) {
                await this._algorithm.stop();
            }
            this._sendCommand({ command: messages.outgoing.stopped });
        }
        catch (error) {
            this._sendError(error);
        }
    }

    async _exit(options) {
        try {
            if (this._algorithm.exit) {
                await this._algorithm.exit(options);
            }
            const code = (options && options.exitCode) || 0;
            console.debug(`got exit command. Exiting with code ${code}`);
            process.exit(code);
        }
        catch (error) {
            this._sendError(error);
        }
    }

    _sendCommand({ command, data }) {
        this._wsc.send({ command, data });
    }

    _sendError(error) {
        const message = `Error: ${error.message || error}`;
        console.error(message);
        this._wsc.send({
            command: messages.outgoing.error,
            error: {
                code: 'Failed',
                message,
                details: error.stackTrace
            }
        });
    }
}

module.exports = Algorunner;
