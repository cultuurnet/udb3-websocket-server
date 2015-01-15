var app = require('http').createServer(handler);
var redis = require('redis');
var redisAdapter = require('socket.io-redis');
var fs = require('fs');

var config = {};

var environment = process.env['ENV'];

if (environment) {
  config = require('./config.' + environment + '.json');
}
else {
  if (fs.existsSync('./config.json')) {
    config = require('./config.json');
    console.log('using configuration from config.json');
  }
  else {
    console.log('no config.json file found, using defaults');
  }
}

var pub = redis.createClient();
var sub = redis.createClient(null, null, { detect_buffers: true });
var io = require('socket.io')(app, {
  adapter: redisAdapter(config.redis || {})
});

var fs = require('fs');
app.listen(config.port || 3000);

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
