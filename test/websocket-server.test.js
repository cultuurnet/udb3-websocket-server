// Black-box tests: they start app.js against a real Redis and only use what
// udb3-backend (Redis) and the frontends (socket.io clients) can observe.
//
// Requires Redis on 127.0.0.1:6379, e.g.
//   docker run -d --rm --name websocket-test-redis -p 6379:6379 redis:7-alpine

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createClient } = require('@redis/client');
const io = require('socket.io-client');

const HOST = '127.0.0.1';
const PORT = 3999;
const URL = 'http://' + HOST + ':' + PORT;
const CHANNEL = 'socket.io#emitter';
const FIXTURES = path.join(__dirname, 'fixtures');

let server;
let serverOutput = '';
const clients = [];

// Plays udb3-backend: publishes the fixtures, which Redis delivers byte for byte to the app's own redis package
const redis = createClient({ socket: { host: HOST, port: 6379, reconnectStrategy: false } });
redis.on('error', () => {});

// Counts both channel and pattern subscriptions, as either can receive the emitter messages
async function emitterSubscribers() {
  return (await redis.pubSubNumSub(CHANNEL))[CHANNEL] + (await redis.pubSubNumPat());
}

function publish(payload) {
  return redis.publish(CHANNEL, payload);
}

async function waitFor(condition, description, timeout = 10000) {
  const start = Date.now();
  while (!(await condition())) {
    if (Date.now() - start > timeout) {
      throw new Error('Timed out waiting for ' + description + '\n' + serverOutput);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function connect() {
  const client = io(URL, { forceNew: true, reconnection: false });
  clients.push(client);
  return new Promise((resolve, reject) => {
    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });
}

function nextEvent(client, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No ' + event + ' event received')), timeout);
    client.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function get(requestPath, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(URL + requestPath, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

function fixture(name) {
  return {
    payload: fs.readFileSync(path.join(FIXTURES, name + '.bin')),
    expected: JSON.parse(fs.readFileSync(path.join(FIXTURES, name + '.json'), 'utf8')),
  };
}

before(async () => {
  await redis.connect().catch((err) => {
    throw new Error('Redis is not reachable on ' + HOST + ':6379: ' + err.message);
  });
  const subscribersBefore = await emitterSubscribers();

  // Run from an empty directory, so a local config.json is not picked up
  server = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], {
    cwd: fs.mkdtempSync(path.join(os.tmpdir(), 'websocket-server-')),
    env: { ...process.env, HOST, PORT: String(PORT) },
  });
  server.stdout.on('data', (data) => (serverOutput += data));
  server.stderr.on('data', (data) => (serverOutput += data));

  await waitFor(async () => (await emitterSubscribers()) > subscribersBefore, 'the server to subscribe to ' + CHANNEL);
  await waitFor(() => get('/').then(() => true, () => false), 'the server to listen on ' + URL);
});

after(async () => {
  clients.forEach((client) => client.close());
  if (server) {
    server.kill();
  }
  if (redis.isOpen) {
    await redis.quit();
  }
});

test('serves index.html', async () => {
  const response = await get('/');

  assert.strictEqual(response.status, 200);
  assert.match(response.body, /\/socket\.io\/socket\.io\.js/);
});

test('allows cross-origin polling with credentials', async () => {
  const response = await get('/socket.io/?EIO=3&transport=polling', { Origin: 'https://www.uitdatabank.be' });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.headers['access-control-allow-origin'], 'https://www.uitdatabank.be');
  assert.strictEqual(response.headers['access-control-allow-credentials'], 'true');
});

test('sends news to a client when it connects', async () => {
  const client = io(URL, { forceNew: true, reconnection: false });
  clients.push(client);

  assert.deepStrictEqual(await nextEvent(client, 'news'), { hello: 'world' });
});

const fixtureNames = fs.readdirSync(FIXTURES)
  .filter((file) => file.endsWith('.bin'))
  .map((file) => path.basename(file, '.bin'));

for (const name of fixtureNames) {
  test('broadcasts the ' + name + ' message published by udb3-backend', async () => {
    const { payload, expected } = fixture(name);
    const client = await connect();
    const received = nextEvent(client, expected.event);

    await publish(payload);

    assert.deepStrictEqual(await received, expected.data);
  });
}

