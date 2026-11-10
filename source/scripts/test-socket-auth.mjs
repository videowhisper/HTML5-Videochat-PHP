import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const client = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(resolve(process.env.VW_H5_DEPENDENCIES || client, 'package.json'));
const parser = require('@babel/parser');
const babel = require('@babel/core');
const jsx = require('@babel/plugin-transform-react-jsx');
const helper = readFileSync(resolve(client, 'src/services/socketAuth.js'), 'utf8');
const socketAuth = await import('data:text/javascript;base64,' + Buffer.from(helper).toString('base64'));
const { requestSocketAuth } = socketAuth;
const originalFetch = global.fetch;
let checks = 0;
try {
  for (const name of ['Camera', 'Video']) {
    const source = readFileSync(resolve(client, `src/components/${name}.jsx`), 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx', 'classProperties'] });
    const methods = {};
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'ClassMethod' && ['vwsConnect', 'vwsConnectReady'].includes(node.key.name)) methods[node.key.name] = node;
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    }
    visit(ast);
    function compile(name, args) {
      const method = methods[name]; assert.ok(method);
      const body = source.slice(method.body.start + 1, method.body.end - 1);
      const code = babel.transformSync(`${method.async ? 'async ' : ''}function run(${args}) {${body}}`, { plugins: [jsx], babelrc: false, configFile: false }).code;
      return new Function('io', ...Object.keys(socketAuth), `${code}; return run;`)(Socket, ...Object.values(socketAuth));
    }
    let handshake, connects = 0, fetches = 0;
    function Socket(url, options) {
      handshake = options.auth; this.auth = options.auth;
      this.on = () => this;
      this.connect = () => { ++connects; this.connected = true; };
    }
    const config = { serverURL: 'http://localhost/wp-admin/admin-ajax.php?action=test', nonce: 'session-nonce', vwsSocket: 'wss://server.example', vwsAuth: { account: 'test-account', pin: 'expired-page-login-pin' } };
    Object.defineProperty(config, 'vwsToken', { get() { throw new Error('Read account token'); } });
    const context = {
      props: { config, user: { ID: 0, name: 'test-peer', sessionID: 17, sessionKey: 'session-key' }, appState: { username: 'test-peer' }, room: { ID: 8, streamBroadcastName: 'test-room', streamPlaybackName: 'test-room' } },
      _isMounted: true, state: {}, audioInterface: true, localStream: { getAudioTracks: () => [] }, streamInfo: {}, setState(value) { this.lastState = value; },
    };
    global.fetch = async (url, options) => {
      ++fetches;
      assert.equal(url, config.serverURL); assert.equal(options.credentials, 'same-origin');
      assert.equal(options.body.get('task'), 'socket_auth');
      assert.equal(options.body.get('VideoWhisper[sessionKey]'), 'session-key');
      assert.equal(options.body.get('VideoWhisper[roomID]'), '8');
      assert.equal(options.body.get('VideoWhisper[nonce]'), 'session-nonce');
      return { ok: true, json: async () => ({ vwsAuth: { account: 'test-account', pin: 'fresh-peer-pin-' + fetches } }) };
    };
    context.vwsConnectReady = compile('vwsConnectReady', 'auth');
    const connect = compile('vwsConnect', '');
    await connect.call(context);
    const peer = name === 'Camera' ? 'test-peer' : 'test-peer_play';
    assert.deepEqual(handshake, { account: 'test-account', user: peer, pin: 'fresh-peer-pin-1' }); ++checks;
    assert.equal(Object.hasOwn(handshake, 'token'), false); ++checks;
    await connect.call(context); assert.equal(fetches, 1); ++checks;
    context.vwsSocket.connected = false;
    await connect.call(context); assert.equal(context.vwsSocket.auth.pin, 'fresh-peer-pin-2'); assert.equal(connects, 2); ++checks;
    context.vwsSocket.connected = false;
    global.fetch = async () => ({ ok: false, json: async () => ({ error: 'Expired app session' }) });
    await connect.call(context); assert.equal(connects, 2); assert.match(context.lastState.statusInfo, /Reload/); ++checks;
    context.vwsSocket = null; context._isMounted = false;
    global.fetch = async () => ({ ok: true, json: async () => ({ vwsAuth: { account: 'test-account', pin: 'fresh-pin' } }) });
    await connect.call(context); assert.equal(context.vwsSocket, null); ++checks;
    console.log(`${name}: renewal before connect/reconnect, expired session denial, unmount cancellation and account-token isolation passed`);
  }
  console.log(`Client socket assertions passed: ${checks}`);
} finally { global.fetch = originalFetch; }
