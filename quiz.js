//  _____       _    ______       _
// |  _  |     (_)   | ___ \     | |
// | | | |_   _ _ ___| |_/ / ___ | |_
// | | | | | | | |_  / ___ \/ _ \| __|
// \ \/' / |_| | |/ /| |_/ / (_) | |_
//  \_/\_\\__,_|_/___\____/ \___/ \__|
//
var app  = require('express')(),
    http = require('http').Server(app),
    io   = require('socket.io')(http),
    port = process.env.PORT || 3000;

app.get('/', function(req, res){
    res.sendFile(__dirname + '/views/join.html');
});

io.on('connection', function(socket){
  console.log('a user connected');

  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});
