var fs = require('fs');
var redis = require('redis');
var redisAdapter = require('socket.io-redis');

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

var pub = redis.createClient();
var sub = redis.createClient(null, null, { detect_buffers: true });
var io = require('socket.io')(app, {
  adapter: redisAdapter(config.redis || {})
});

app.listen(PORT, HOST);

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  io.emit('new client connected', 'server says: client connected');
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

io.on('time', function (data) {
  console.log(data);
});
