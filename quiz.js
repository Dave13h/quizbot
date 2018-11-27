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
    uuid = require('uuid');

var port = process.env.PORT || 3000;

var sContestant = io.of('/contestant'),
    sQuizMaster = io.of('/quizmaster'),
    sDashboard  = io.of('/dashboard');

var connections = {
    contestants: [],
    quizmasters: [],
    dashboards:  []
};

// ----------------------------------------------------------------------------
// Client views
// ----------------------------------------------------------------------------
http.listen(port, function () {
    console.log('listening on *:' + port);
});
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/contestant.html');
})
.get('/quizmaster', function (req, res) {
    res.sendFile(__dirname + '/views/quizmaster.html');
});

// ----------------------------------------------------------------------------
// Handle connections
// ----------------------------------------------------------------------------
function ident (type, cid, socket) {
    var newConnection = false;
    if (cid == null) {
        cid = uuid.v4();
        socket.emit('id', cid);
        newConnection = true;
    } else {
        console.log('[IDENT] Existing cid: ' + cid);
    }

    switch (type) {
        case 'contestant':
            if (newConnection || connections.contestants[cid] == undefined)
                connections.contestants[cid] = new oContestant(cid, socket);
            else
                connections.contestants[cid].setSocket(socket);
            break;
        case 'quizmaster':
            if (newConnection || connections.quizmaster[cid] == undefined)
                connections.quizmasters[cid] = new oContestant(cid, socket);
            else
                connections.quizmasters[cid].setSocket(socket);
            break;
    }
    return cid;
}

sQuizMaster.on('connection', function (socket) {
    var cid = null;
    console.log('[SOCKET] QM connected on socket: ' + socket.id);

    socket.on('ident', function(id) {
        cid = ident('quizmaster', id, socket);
    });

    // io.emit('id', cid);

    socket.on('disconnect', function () {
        console.log('QM disconnected');
        // connections.quizmasters[cid] = null;
    });
});

sContestant.on('connection', function (socket) {
    var cid = null;
    console.log('[SOCKET] Contestant connected on socket: ' + socket.id);


    socket.on('ident', function (id){
        cid = ident('contestant', id, socket);
    });

    socket.on('chat message', function (msg) {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', function () {
        // console.log('contestant [' + cid + '] disconnected');
        // connections.contestants[cid] = null;
    });
});

// ----------------------------------------------------------------------------
// Objects
// ----------------------------------------------------------------------------
function oContestant (cid, socket) {
  this.id = cid;
  this.socket = socket;
  console.log('New Contestant[' + cid + ']');
}
oContestant.prototype.setSocket = function (socket) {
  this.socket = socket;
}

function oQuizMaster (cid, socket) {
  this.id = cid;
  this.socket = socket;
  console.log('New QuizMaster[' + cid + ']');
}
oQuizMaster.prototype.setSocket = function (socket) {
  this.socket = socket;
}
