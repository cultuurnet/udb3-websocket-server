var app = require('http').createServer(handler);
var redis = require('redis');
var redisAdapter = require('socket.io-redis');

var pub = redis.createClient();
var sub = redis.createClient(null, null, { detect_buffers: true });
var io = require('socket.io')(app, {
  adapter: redisAdapter({ pubClient: pub, subClient: sub })
});

var fs = require('fs');
app.listen(3000);

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
