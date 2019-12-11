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

function notifyConnectionList (skipDash) {
    skipDash = (skipDash == 1);
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
    if (!skipDash) { // @todo(dave13h): last minute fudge to stop rebuilding buzzer sound on "contestant buzz in"
        sDashboard.emit('teams list', teams);
    }
}

function notifyLogo (team, data) {
    sDashboard.emit('teams logo', team, data);
}

sDashboard.on('connection', function (socket) {
    console.log('[SOCKET] Dashboard connected on socket: ' + socket.id);
    for (let t in teams) {
        let l = teams[t].getLogo();
        if (!l)
            continue;
        sDashboard.emit('teams logo', t, l);
    }
});

const QMPIN = 4576;
sQuizMaster.on('connection', function (socket) {
    var qmid = null;
    console.log('[SOCKET] QM connected on socket: ' + socket.id);

    socket.on('ident', function(pin, id) {
        // Level 2 security!
        if (!pin || pin.length != 4) {
            socket.emit('bad auth', {'result': 'bad len'});
            return;
        } else if (isNaN(pin)) {
            socket.emit('bad auth', {'result': 'malformed'});
            return;
        } else if (pin != QMPIN) {
            socket.emit('bad auth', {'result': Math.abs(pin - QMPIN)});
            return;
        }
        qmid = ident('quizmaster', id, socket);

        let state = {
            question: activeQuestion > -1 ? questions[activeQuestion] : null,
            team: activeTeam > -1 ? teams[activeTeam] : null
        };
        socket.emit('game state', state);
    });

    socket.on('disconnect', function () {
        if (qmid == null) {
            console.log('[SOCKET] QM [Un-Authed] disconnected');
            return;
        }
        console.log('[SOCKET] QM [' + qmid + '] disconnected');
        connections.quizmasters[qmid].setState('disconnected');;
    });

    socket.on('client forcedisconnect', function (id) {
        console.log('[SOCKET] QM [' + qmid + '] forcing client [' + id + '] to disconnect');
        connections.contestants[id].kill();
        delete connections.contestants[id];
        notifyConnectionList();
    });

    var activePictionaryQuestion = 0, pictionaryScore = 0;
    socket.on('question play', function (qid) {
        console.log('[SOCKET] QM [' + qmid + '] play question => ' + qid);

        activeQuestion = qid;
        questions[qid].played = true;

        if (questions[qid].getType() == 'pictionary') {
            activePictionaryQuestion = 0;
            pictionaryScore = 0;

            activeTeam = questions[qid].getTeam();

            for (var c in connections.contestants) {
                if (connections.contestants[c].getTeam() != activeTeam)
                    continue;
                connections.contestants[c].getSocket().emit('pictionary init', questions[qid].getQuestions());
            }

            sQuizMaster.emit(
                'pictionary init',
                questions[qid].getQuestions()
            );
            sDashboard.emit(
                'pictionary init',
                teamNames[activeTeam],
                questions[qid].getQuestions().length,
                questions[qid].getTimer()
            );
            return;
        }

        activeTeam = -1;
        for (let t in teams) {
            teams[t].answered = false;
        }
        sQuizMaster.emit('teams list', teams);

        sDashboard.emit('question play', {
            round: "Round " + roundNo + "!",
            question: questions[qid]
        });

        sContestant.emit('question play');
    });

    socket.on('pictionary start', function () {
        sDashboard.emit('pictionary start');
        for (var c in connections.contestants) {
            if (connections.contestants[c].getTeam() != activeTeam)
                continue;
            connections.contestants[c].getSocket().emit('pictionary start');
        }
    });

    socket.on('pictionary end', function () {
        sDashboard.emit('pictionary end', pictionaryScore, questions[activeQuestion].getQuestions().length);
        sQuizMaster.emit('pictionary end');
        sQuizMaster.emit('teams list', teams);
        for (var c in connections.contestants) {
            if (connections.contestants[c].getTeam() != activeTeam)
                continue;
            connections.contestants[c].getSocket().emit('wait');
        }
    });

    socket.on('pictionary correct', function () {
        teams[activeTeam].points++;
        pictionaryScore++;
        activePictionaryQuestion++;

        console.log("[Pictionary] Correct Answer");

        if (activePictionaryQuestion >= questions[activeQuestion].getQuestions().length) {
            sDashboard.emit('pictionary end', pictionaryScore, questions[activeQuestion].getQuestions().length);
            sQuizMaster.emit('pictionary end');
            sQuizMaster.emit('teams list', teams);

            for (var c in connections.contestants) {
                if (connections.contestants[c].getTeam() != activeTeam)
                    continue;
                connections.contestants[c].getSocket().emit('wait');
            }
            return;
        }

        sQuizMaster.emit('pictionary active', activePictionaryQuestion);
        sDashboard.emit('pictionary active', activePictionaryQuestion, pictionaryScore);

        for (var c in connections.contestants) {
            if (connections.contestants[c].getTeam() != activeTeam)
                continue;
            connections.contestants[c].getSocket().emit('pictionary active', activePictionaryQuestion);
        }
    });

    socket.on('pictionary skip', function () {
        activePictionaryQuestion++;

        console.log("[Pictionary] Skip Answer");

        if (activePictionaryQuestion >= questions[activeQuestion].getQuestions().length) {
            sDashboard.emit('pictionary end', pictionaryScore, questions[activeQuestion].getQuestions().length);
            sQuizMaster.emit('pictionary end');
            sQuizMaster.emit('teams list', teams);

            for (var c in connections.contestants) {
                if (connections.contestants[c].getTeam() != activeTeam)
                    continue;
                connections.contestants[c].getSocket().emit('wait');
            }
            return;
        }

        sQuizMaster.emit('pictionary active', activePictionaryQuestion);
        sDashboard.emit('pictionary active', activePictionaryQuestion, pictionaryScore);

        for (var c in connections.contestants) {
            if (connections.contestants[c].getTeam() != activeTeam)
                continue;
            connections.contestants[c].getSocket().emit('pictionary active', activePictionaryQuestion);
        }
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

        if (questions[activeQuestion].type != 'timer' && questions[activeQuestion].type != 'catchphrase')
            return;

        console.log('[SOCKET] QM [' + qmid + '] timer => ' + msg.action);
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

            if (!team) {
                console.error("Invalid team connection:", con.getTeam());
                continue;
            }

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
            socket.emit('team logo', teams[connections.contestants[cid].getTeam()].getLogo());
            socket.emit('team buzzer', teams[connections.contestants[cid].getTeam()].getBuzzer());
            if (activeQuestion == -1 || questions[activeQuestion].type == 'pictionary')
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

    socket.on('team logo', function (data) {
        if (!data)
            return;

        var c = connections.contestants[cid];
        if (!c.hasTeam())
            return;

        var team = teams[c.getTeam()];
        team.setLogo(data);
        notifyLogo(c.getTeam(), data);
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
            notifyConnectionList(1);
        } else {
            console.log('[BUZZER] Team[' + team.getName() + '] is already active');
        }
    });

    socket.on('pictionary pen', function (data) {
        if (!data)
            return;

        sDashboard.emit('pictionary update', data);
    })
    .on('pictionary clear', function () {
        sDashboard.emit('pictionary clear');
    })
    .on('pictionary fill', function (data) {
        if (!data)
            return;
        sDashboard.emit('pictionary fill', data);
    });

    socket.on('disconnect', function () {
        console.log('[SOCKET] Contestant [' + cid + '] disconnected');
        if (connections.contestants[cid])
            connections.contestants[cid].setState('disconnected');
        notifyConnectionList();
    });
});

