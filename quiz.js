//  _____       _    ______       _
// |  _  |     (_)   | ___ \     | |
// | | | |_   _ _ ___| |_/ / ___ | |_
// | | | | | | | |_  / ___ \/ _ \| __|
// \ \/' / |_| | |/ /| |_/ / (_) | |_
//  \_/\_\\__,_|_/___\____/ \___/ \__|
//
var express = require('express'),
    app     = express(),
    https   = require('https'), //.Server(app),
    uuid    = require('uuid'),
    fs      = require('fs')
    objects = require('./objects');

var port       = process.env.PORT  || 80,
    portSecure = process.env.PORTS || 443;

var credentials = {
    key: fs.readFileSync('./keys/key.pem'),
    cert: fs.readFileSync('./keys/cert.pem')
};

var httpsServer = https.createServer(credentials, app),
    io = require('socket.io')(httpsServer);

var sContestant = io.of('/contestant'),
    sQuizMaster = io.of('/quizmaster'),
    sDashboard  = io.of('/dashboard');

var connections = {
    contestants: [],
    quizmasters: [],
    dashboards:  []
};

var teams      = [],
    totalTeams = 5,
    teamNames  =[
        'Turkeys',
        'Sprouts',
        'Spuds',
        'Puddings',
        'Roasters'
    ];
for (var t = 0; t < totalTeams; ++t)
    teams.push(new objects.team(t, teamNames[t]));

var questions      = [],
    activeTeam     = -1,
    activeQuestion = -1,
    roundNo        = 1;

console.log(" _____       _    ______       _");
console.log("|  _  |     (_)   | ___ \\     | |");
console.log("| | | |_   _ _ ___| |_/ / ___ | |_");
console.log("| | | | | | | |_  / ___ \\/ _ \\| __|");
console.log("\\ \\/' / |_| | |/ /| |_/ / (_) | |_");
console.log(" \\_/\\_\\\\__,_|_/___\\____/ \\___/ \\__|");

// ------------------------------------------------------------------------------------------------
// HTTP Server
// ------------------------------------------------------------------------------------------------
httpsServer.listen(portSecure, function () {
    console.log('listening on *:' + portSecure);
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

// Redirect to secure
var httpServer = require('http');
httpServer.createServer(function (req, res) {
    res.writeHead(301, { 'Location': 'https://' + req.headers['host'] + req.url });
    res.end();
}).listen(port);

// ------------------------------------------------------------------------------------------------
// Questions
// ------------------------------------------------------------------------------------------------
function notifyQuestions () {
    sQuizMaster.emit('questions list', questions);

    // @todo(dave13h): shouldn't really send everything to the dashboard :P
    sDashboard.emit('questions list', questions);
}

function loadQuestions () {
    var content = fs.readFileSync('data/questions.json');
    json = JSON.parse(content);
    for (let q in json.questions) {
        questions.push(new objects.question(json.questions[q]));
    }
    notifyQuestions();
}
loadQuestions();

// ------------------------------------------------------------------------------------------------
// Handle connections
// ------------------------------------------------------------------------------------------------
function sendClientState (cid) {
    var c = connections.contestants[cid];

    var state = {
        team: null,
        question: false,
        answered: false
    }
    if (c.hasTeam()) {
        state.team = teams[c.getTeam()];
    }

    if (activeQuestion > -1) {
        state.question = true;
        state.answered = (state.team && state.team.getAnswered());
    }

    c.getSocket().emit('game state', state);
}

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
            sendClientState(cid);
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
    sDashboard.emit('teams list', teams);
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

        activeTeam = -1;
        for (let t in teams) {
            teams[t].answered = false;
        }
        sQuizMaster.emit('teams list', teams);

        sDashboard.emit('question play', {
            round: "Round " + roundNo + "!", // @note(dave13h): not in use at the moment
            question: questions[qid]
        });

        activeQuestion = qid;
        questions[qid].played = true;

        sContestant.emit('question play');
    });

    socket.on('question audio play', function () {
        if (activeQuestion == -1)
            return;

        if (questions[activeQuestion].type != 'audio')
            return;

        sDashboard.emit('sound play', {sound: 'music_' + questions[activeQuestion].audio});
    });

    socket.on('question timer', function (msg) {
        if (activeQuestion == -1)
            return;

        if (questions[activeQuestion].type != 'timer')
            return;

        sDashboard.emit('question timer', { action: msg.action });
    });

    socket.on('question correct', function (qid) {
        teams[activeTeam].points++;

        activeTeam = -1;
        for (let t in teams)
            teams[t].answered = false;
        sDashboard.emit('question correct', {sound: 'cheer'});
        sQuizMaster.emit('teams list', teams);
        sDashboard.emit('teams scores', {teams: teams});
        activeQuestion = -1;
        notifyQuestions();
    });

    socket.on('question wrong', function (qid) {
        activeTeam = -1;

        var hasChance = false;
        for (let c in connections.contestants) {
            let con = connections.contestants[c],
                team = teams[con.getTeam()];

            if (team.getAnswered())
                continue;

            con.socket.emit('question chance');
            hasChance = true;
        }

        if (hasChance) {
            sDashboard.emit('question wrong', {sound: 'buzzer_wrong'});
        } else {
            sDashboard.emit('question losers', {sound: 'laugh'});
            sDashboard.emit('teams scores', {teams: teams});
            activeQuestion = -1;
            notifyQuestions();
            ++roundNo;
        }
    });

    socket.on('question skip', function () {
        sDashboard.emit('teams scores', {teams: teams});
        activeQuestion = -1;
        notifyQuestions();
        ++roundNo;
    });

    socket.on('sound play', function (sound) {
        sDashboard.emit('sound play', {sound: sound});
    });

    socket.on('sound stop', function (sound) {
        sDashboard.emit('sound stop');
    });

    socket.on('title show', function (title) {
        // @todo(dave13h): ugh hackery...
        if (title.title == 'scores') {
            sDashboard.emit('teams scores', {teams: teams});
            return;
        }
        sDashboard.emit('title show', {title: title, teams: teams});
    });

    socket.on('team name', function (team) {
        if (teams[team.id] == undefined) {
            return;
        }

        teams[team.id].setName(team.name);
        notifyConnectionList(); // @todo(dave13h): optimise
    });

    socket.on('team score', function (team) {
        if (teams[team.id] == undefined) {
            return;
        }

        teams[team.id].setPoints(team.points);
        notifyConnectionList(); // @todo(dave13h): optimise
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
            if (activeQuestion == -1)
                socket.emit('wait');
        }
    });

    socket.on('team join', function (team) {
        if (teams[team] == undefined) {
            socket.emit('teams invalid');
            socket.emit('teams list', teams);
            return;
        }
        connections.contestants[cid].setTeam(team);
        socket.emit('wait');
        sendClientState(cid);
        notifyConnectionList();
    });

    socket.on('team update', function (settings) {
        var c = connections.contestants[cid];
        if (!c.hasTeam())
            return;

        var team = teams[c.getTeam()];
        if (settings.name)
            team.setName(settings.name);

        notifyConnectionList();
    });

    socket.on('team buzzer', function (data) {
        if (!data)
            return;

        var buffer = Buffer.from(data),
            arraybuffer = Uint8Array.from(buffer).buffer;

        var c = connections.contestants[cid];
        if (!c.hasTeam())
            return;

        var team = teams[c.getTeam()];
        team.setBuzzer(arraybuffer);
        notifyConnectionList();
    });

    socket.on('buzzer send', function (cid) {
        if (!connections.contestants[cid].hasTeam()) {
            console.log('[BUZZER] ' + cid + ' is not on a team');
            return;
        }
        console.log('[BUZZER] ' + cid + ' => team: ' + connections.contestants[cid].team);

        var teamid = connections.contestants[cid].getTeam(),
            team   = teams[teamid];

        if (team.getAnswered()) {
            console.log('[BUZZER] Team[' + team.name + '] already answered!');
            return;
        }

        if (activeTeam < 0) {
            activeTeam = teamid;
            team.setAnswered(true);
            sDashboard.emit('question buzzed', { 'team': team, 'sound': 'buzzer_default' });
            sQuizMaster.emit('question buzzed', { 'team': team });
            sContestant.emit('question disable');
            notifyConnectionList();
        } else {
            console.log('[BUZZER] Team[' + team.getName() + '] is already active');
        }
    });

    socket.on('disconnect', function () {
        console.log('[SOCKET] contestant [' + cid + '] disconnected');
        if (connections.contestants[cid])
            connections.contestants[cid].setState('disconnected');
        notifyConnectionList();
    });
});

