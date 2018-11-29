//  _____       _    ______       _
// |  _  |     (_)   | ___ \     | |
// | | | |_   _ _ ___| |_/ / ___ | |_
// | | | | | | | |_  / ___ \/ _ \| __|
// \ \/' / |_| | |/ /| |_/ / (_) | |_
//  \_/\_\\__,_|_/___\____/ \___/ \__|
//
var express = require('express'),
    app     = express(),
    http    = require('http').Server(app),
    io      = require('socket.io')(http),
    uuid    = require('uuid');

var port = process.env.PORT || 3000;

var sContestant = io.of('/contestant'),
    sQuizMaster = io.of('/quizmaster'),
    sDashboard  = io.of('/dashboard');

var connections = {
    contestants: [],
    quizmasters: [],
    dashboards:  []
};

var teams = [
    'Team 1',
    'Team 2',
    'Team 3',
    'Team 4',
    'Team 5'
];

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
})
.get('/dashboard', function (req, res) {
    res.sendFile(__dirname + '/views/dashboard.html');
})
.use(express.static('public'));

// ----------------------------------------------------------------------------
// Handle connections
// ----------------------------------------------------------------------------
function ident (type, cid, socket) {
    var newConnection = false;
    if (cid == null) {
        cid = uuid.v4();
        socket.emit('id', cid);
        newConnection = true;
    }

    switch (type) {
        case 'contestant':
            if (newConnection || connections.contestants[cid] == undefined)
                connections.contestants[cid] = new oContestant(cid, socket);
            else
                connections.contestants[cid].setSocket(socket).setState('connected');
            break;
        case 'quizmaster':
            if (newConnection || connections.quizmasters[cid] == undefined)
                connections.quizmasters[cid] = new oQuizMaster(cid, socket);
            else
                connections.quizmasters[cid].setSocket(socket).setState('connected');
            break;
    }

    updateConnectionList();
    return cid;
}

function updateConnectionList () {
    var connectionList = [],
        i = 1;

    for (let c in connections.contestants) {
        let con = connections.contestants[c];
        var teamName = con.hasTeam() ? teams[con.getTeam()] : 'unassigned';
        connectionList.push((i++) + ' => ' + teamName + ' [' + con.getState() + ']');
    }
    sQuizMaster.emit('connections list', connectionList);
}

sQuizMaster.on('connection', function (socket) {
    var qmid = null;
    console.log('[SOCKET] QM connected on socket: ' + socket.id);

    socket.on('ident', function(id) {
        qmid = ident('quizmaster', id, socket);
    });

    socket.on('disconnect', function () {
        console.log('[SOCKET] QM [' + qmid + '] disconnected');
        connections.quizmasters[qmid].setState('disconnected');;
    });
});

sContestant.on('connection', function (socket) {
    var cid = null;
    console.log('[SOCKET] Contestant connected on socket: ' + socket.id);

    socket.on('ident', function (id){
        cid = ident('contestant', id, socket);

        if (!connections.contestants[cid].hasTeam()) {
            socket.emit('teams list', teams);
        } else {
            socket.emit('wait');
        }
    });

    socket.on('team join', function (team) {
        console.log("Join team:", team);
        if (teams[team] == undefined) {
            socket.emit('teams invalid');
            socket.emit('teams list', teams);
            return;
        }
        connections.contestants[cid].setTeam(team);
        socket.emit('wait');
    });

    socket.on('disconnect', function () {
        console.log('[SOCKET] contestant [' + cid + '] disconnected');
        connections.contestants[cid].setState('disconnected');
        updateConnectionList();
    });
});

// ----------------------------------------------------------------------------
// Objects
// ----------------------------------------------------------------------------
class oConnection {
    constructor (cid, socket) {
        this.id     = cid;
        this.socket = socket;
        this.state  = 'connected';
    }

    setSocket (socket) {
        this.socket = socket;
        return this;
    }

    getSocket (socket) {
        return this.socket;
    }

    setState (state) {
        this.state = state;
        return this;
    }

    getState () {
        return this.state;
    }
}

class oContestant extends oConnection {
    constructor (cid, socket) {
        super(cid, socket);
        this.team = -1;
        console.log('[OBJECT] New Contestant[' + cid + ']');
    }

    hasTeam () {
        return this.team > -1;
    }

    getTeam () {
        return this.team;
    }

    setTeam (team) {
        this.team = team;
        console.log('[OBJECT] Contestant[' + this.id + '] Joined Team => ' + this.team);
        return this;
    }
}

class oQuizMaster extends oConnection {
    constructor (cid, socket) {
        super(cid, socket);
        console.log('[OBJECT] New QuizMaster[' + cid + ']');
    }
}
