var fs = require('fs');
var redis = require('redis');
var redisAdapter = require('socket.io-redis');

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


var server_options = config.server_options || {};

var http;

if (server_options.key) {
  server_options.key = fs.readFileSync(server_options.key);

  http = require('https');
  console.log('Using SSL');
}
else {
  http = require('http');
}

if (server_options.cert) {
  server_options.cert = fs.readFileSync(server_options.cert);
}

if (server_options.ca) {
  server_options.ca = fs.readFileSync(server_options.ca);
}

var app = http.createServer(server_options, handler);

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
