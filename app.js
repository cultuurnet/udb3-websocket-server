var fs = require('fs');
var redis = require('redis');
var msgpack = require('@msgpack/msgpack');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;

var config = {};

if (fs.existsSync('./config.json')) {
  config = require('./config.json');
  console.log('using configuration from config.json');
}
else {
  console.log('no config.json file found, using defaults');
}

var app;
function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
      function (err, data) {
        if (err) {
          res.writeHead(500);
          return res.end('Error loading index.html');
        }

        res.writeHead(200);
        res.end(data);
      });
}

app = require('http').createServer(handler);

var io = require('socket.io')(app, {
  // Keep accepting the socket.io v1/v2 clients of udb3-angular-app and udb3-frontend
  allowEIO3: true,
  cors: { origin: true, credentials: true }
});

var redisConfig = config.redis || {};
var sub = redis.createClient({
  socket: { host: redisConfig.host || '127.0.0.1', port: redisConfig.port || 6379 }
});

sub.on('error', function (err) {
  console.error('redis error', err);
});

// udb3-backend publishes msgpack encoded [packet, { rooms, flags }] messages
// with the socket.io-emitter format, which are broadcast to all clients.
sub.connect().then(function () {
  return sub.subscribe((redisConfig.key || 'socket.io') + '#emitter', function (message) {
    try {
      var packet = msgpack.decode(message)[0];
      io.emit.apply(io, packet.data);
    } catch (err) {
      console.error('unable to handle emitter message', err);
    }
  }, true);
});

app.listen(PORT, HOST);

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  io.emit('new client connected', 'server says: client connected');
  socket.on('my other event', function (data) {
    console.log(data);
  });
});
