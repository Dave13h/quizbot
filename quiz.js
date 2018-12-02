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
    uuid    = require('uuid'),
    fs      = require("fs")
    objects = require('./objects');

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
    {name: 'Team 1', answered: false, points: 0},
    {name: 'Team 2', answered: false, points: 0},
    {name: 'Team 3', answered: false, points: 0},
    {name: 'Team 4', answered: false, points: 0},
    {name: 'Team 5', answered: false, points: 0}
];

var questions = null;
var activeTeam = -1,
    activeQuestion = -1;

// ------------------------------------------------------------------------------------------------
// Client views
// ------------------------------------------------------------------------------------------------
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

// ------------------------------------------------------------------------------------------------
// Questions
// ------------------------------------------------------------------------------------------------
function notifyQuestions () {
    sQuizMaster.emit('questions list', questions);

    // @todo(dave13h): shouldn't really send everything to the dashboard :P
    sDashboard.emit('questions list', questions);
}

function loadQuestions () {
    var content = fs.readFileSync("data/questions.json");
    json = JSON.parse(content);
    questions = json.questions;
    notifyQuestions();
}
loadQuestions();

// ------------------------------------------------------------------------------------------------
// Handle connections
// ------------------------------------------------------------------------------------------------
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
                connections.contestants[cid] = new objects.contestant(cid, socket);
            else
                connections.contestants[cid].setSocket(socket).setState('connected');
            break;

        case 'quizmaster':
            if (newConnection || connections.quizmasters[cid] == undefined)
                connections.quizmasters[cid] = new objects.quizMaster(cid, socket);
            else
                connections.quizmasters[cid].setSocket(socket).setState('connected');
            notifyQuestions();
            break;
    }

    notifyConnectionList();
    return cid;
}

function notifyConnectionList () {
    var connectionList = [],
        i = 1;

    for (let c in connections.contestants) {
        let con = connections.contestants[c],
            teamName = con.hasTeam() ? teams[con.getTeam()].name : 'unassigned';
        connectionList.push({
            str: 'Contestant ' + (i++) + ' => ' + teamName + ' [' + con.getState() + ']',
            cid: con.getId()
        });
    }
    sQuizMaster.emit('connections list', connectionList);
    sQuizMaster.emit('teams list', teams);
}

sDashboard.on('connection', function (socket) {
    console.log('[SOCKET] Dashboard connected on socket: ' + socket.id);
});

sQuizMaster.on('connection', function (socket) {
    var qmid = null;
    console.log('[SOCKET] QM connected on socket: ' + socket.id);

    socket.on('ident', function(id) {
        qmid = ident('quizmaster', id, socket);

        let state = {
            question: activeQuestion > -1 ? questions[activeQuestion] : null,
            team: activeTeam > -1 ? teams[activeTeam] : null
        };
        socket.emit('game state', state);
    });

    socket.on('disconnect', function () {
        console.log('[SOCKET] QM [' + qmid + '] disconnected');
        connections.quizmasters[qmid].setState('disconnected');;
    });

    socket.on('client forcedisconnect', function (id) {
        console.log('[SOCKET] QM [' + qmid + '] forcing client [' + id + '] to disconnect');
        connections.contestants[id].kill();
        delete connections.contestants[id];
        notifyConnectionList();
    });

    socket.on('question play', function (qid) {
        console.log('[SOCKET] QM [' + qmid + '] play question => ' + qid);
        sDashboard.emit('question play', {
            round: "Round " + 1 + "!",
            question: questions[qid]
        });

        sContestant.emit('question play');
    });

    socket.on('question correct', function (qid) {
        teams[activeTeam].points++;

        activeTeam = -1;
        for (let t in teams)
            teams[t].answered = false;
        sDashboard.emit('question correct', {sound: 'cheer'});
        sQuizMaster.emit('teams list', teams);
    });

    socket.on('question wrong', function (qid) {
        activeTeam = -1;

        for (let c in connections.contestants) {
            let con = connections.contestants[c],
                team = teams[con.getTeam()];

            if (team.answered)
                continue;

            con.socket.emit('question chance');
        }
        sDashboard.emit('question wrong', {sound: 'buzzer_wrong'});
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
        notifyConnectionList();
    });

    socket.on('buzzer send', function (cid) {
        if (!connections.contestants[cid].hasTeam()) {
            return;
        }

        var teamid = connections.contestants[cid].getTeam(),
            team   = teams[teamid];

        if (team.answered) {
            console.log('Team[' + team.name + '] already answered!');
            return;
        }

        if (activeTeam < 0) {
            activeTeam = teamid;
            team.answered = true;
            sDashboard.emit('question buzzed', {'team': team, 'sound': 'buzzer_default'});
            sQuizMaster.emit('question buzzed', {'team': team});
            sContestant.emit('question disable');
        }
    });

    socket.on('disconnect', function () {
        console.log('[SOCKET] contestant [' + cid + '] disconnected');
        if (connections.contestants[cid])
            connections.contestants[cid].setState('disconnected');
        notifyConnectionList();
    });
});

