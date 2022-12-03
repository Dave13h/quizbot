//  _____       _    ______       _
// |  _  |     (_)   | ___ \     | |
// | | | |_   _ _ ___| |_/ / ___ | |_
// | | | | | | | |_  / ___ \/ _ \| __|
// \ \/' / |_| | |/ /| |_/ / (_) | |_
//  \_/\_\\__,_|_/___\____/ \___/ \__|
//
var express = require('express'),
    app     = express(),
    https   = require('https'),
    uuid    = require('uuid'),
    fs      = require('fs')
    objects = require('./objects');

var port       = process.env.PORT  || 80,
    portSecure = process.env.PORTS || 443;

var credentials = {
    key: fs.readFileSync('./keys/skey.pem'),
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
    teamNames  =[
        'Turkeys',
        'Sprouts',
        'Spuds',
        'Puddings',
        'Pies'
    ];
for (var t = 0; t < teamNames.length; ++t)
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

//  _   _ _____ ___________   _____
// | | | |_   _|_   _| ___ \ /  ___|
// | |_| | | |   | | | |_/ / \ `--.  ___ _ ____   _____ _ __
// |  _  | | |   | | |  __/   `--. \/ _ \ '__\ \ / / _ \ '__|
// | | | | | |   | | | |     /\__/ /  __/ |   \ V /  __/ |
// \_| |_/ \_/   \_/ \_|     \____/ \___|_|    \_/ \___|_|
//
httpsServer.listen(portSecure, function () {
    console.log('listening on *:' + portSecure);
});
app
.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/contestant.html');
})
.get('/quizmaster', function (req, res) {
    res.sendFile(__dirname + '/views/fools.html');
})
.get('/qm', function (req, res) {
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

//  _____                 _   _
// |  _  |               | | (_)
// | | | |_   _  ___  ___| |_ _  ___  _ __  ___
// | | | | | | |/ _ \/ __| __| |/ _ \| '_ \/ __|
// \ \/' / |_| |  __/\__ \ |_| | (_) | | | \__ \
//  \_/\_\\__,_|\___||___/\__|_|\___/|_| |_|___/
//
function notifyQuestions () {
    sQuizMaster.emit('questions list', questions);

    // @todo(dave13h): shouldn't really send everything to the dashboard :P
    sDashboard.emit('questions list', questions);
}

const questionsFile = 'data/questions.json';
function loadQuestions () {
    if (!fs.existsSync(questionsFile)) {
        console.error('[QUESTIONS] File not found => ' + questionsFile);
        process.exit(-1);
    }

    var content = fs.readFileSync(questionsFile);
    json = JSON.parse(content);
    for (let q in json.questions) {
        questions.push(new objects.question(q, json.questions[q]));
    }

    console.log('[QUESTIONS] Loaded');
    notifyQuestions();
}
loadQuestions();

//   ___        _        _____
//  / _ \      | |      /  ___|
// / /_\ \_   _| |_ ___ \ `--.  __ ___   _____
// |  _  | | | | __/ _ \ `--. \/ _` \ \ / / _ \
// | | | | |_| | || (_) /\__/ / (_| |\ V /  __/
// \_| |_/\__,_|\__\___/\____/ \__,_| \_/ \___|
//
const saveFile = 'data/savestate.json';
function saveState () {
    console.log('[SAVE] Saving state');
    var start = process.hrtime();
    var state = {
        questions: [],
        teams: []
    };
    for (let q in questions) {
        state.questions.push(questions[q].toJson());
    }
    for (let t in teams) {
        state.teams.push(teams[t].toJson());
    }
    fs.writeFileSync(saveFile, JSON.stringify(state));
    var end = process.hrtime(start);
    console.log('[SAVE] Complete (' + Math.round((end[0]*1000) + (end[1]/1000000)) + 'ms)');
}

function restoreState () {
    console.log('[SAVE] Restoring State');
    if (!fs.existsSync(saveFile)) {
        console.error('[SAVE] File not found => ' + saveFile);
        return;
    }

    var stateRaw = fs.readFileSync(saveFile);
    state = JSON.parse(stateRaw);
    for (var q in state.questions) {
        let rQ = state.questions[q];
        questions[rQ.id].setPlayed(rQ.played);
    }
    for (var t in state.teams) {
        let rT = state.teams[t];
        teams[rT.id]
            .setPoints(rT.points)
            .setBuzzer(rT.buzzer)
            .setLogo(rT.logo)
            .setAvatar(rT.avatar);
    }
    console.log('[SAVE] State Restored!');
}

var autoSave = null;
function enableAutoSave () {
    if (autoSave != null)
        disableAutoSave();

    autoSave = setInterval(saveState, 60000);
}
function disableAutoSave () {
    if (autoSave == null)
        return;

    clearInterval(autoSave);
    autoSave = null;
}
const cliArgs = process.argv.slice(1);
switch (cliArgs[1]) {
    case '--restore':
        restoreState();
        break;
}

//  _____                             _   _               _   _                 _ _ _
// /  __ \                           | | (_)             | | | |               | | (_)
// | /  \/ ___  _ __  _ __   ___  ___| |_ _  ___  _ __   | |_| | __ _ _ __   __| | |_ _ __   __ _
// | |    / _ \| '_ \| '_ \ / _ \/ __| __| |/ _ \| '_ \  |  _  |/ _` | '_ \ / _` | | | '_ \ / _` |
// | \__/\ (_) | | | | | | |  __/ (__| |_| | (_) | | | | | | | | (_| | | | | (_| | | | | | | (_| |
//  \____/\___/|_| |_|_| |_|\___|\___|\__|_|\___/|_| |_| \_| |_/\__,_|_| |_|\__,_|_|_|_| |_|\__, |
//                                                                                           __/ |
//                                                                                          |___/
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

function sendTeamState (cid, team) {
    connections
        .contestants[cid]
        .getSocket()
        .emit('team state', teams[team]);
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
function notifyAvatar (team, data) {
    sDashboard.emit('teams avatar', team, data);
}

// ______          _     _                         _
// |  _  \        | |   | |                       | |
// | | | |__ _ ___| |__ | |__   ___   __ _ _ __ __| |
// | | | / _` / __| '_ \| '_ \ / _ \ / _` | '__/ _` |
// | |/ / (_| \__ \ | | | |_) | (_) | (_| | | | (_| |
// |___/ \__,_|___/_| |_|_.__/ \___/ \__,_|_|  \__,_|
//
sDashboard
.on('connection', function (socket) {
    console.log('[SOCKET] Dashboard connected on socket: ' + socket.id);
    for (let t in teams) {
        let l = teams[t].getLogo();
        if (!l)
            continue;
        sDashboard.emit('teams logo', t, l);
    }
});

//  _____       _    ___  ___          _
// |  _  |     (_)   |  \/  |         | |
// | | | |_   _ _ ___| .  . | __ _ ___| |_ ___ _ __
// | | | | | | | |_  / |\/| |/ _` / __| __/ _ \ '__|
// \ \/' / |_| | |/ /| |  | | (_| \__ \ ||  __/ |
//  \_/\_\\__,_|_/___\_|  |_/\__,_|___/\__\___|_|
//
const QMPIN = 1388;
sQuizMaster.on('connection', function (socket) {
    var qmid = null;
    console.log('[SOCKET] QM connected on socket: ' + socket.id);

    // Connection Events
    socket
    .on('ident', function(pin, id) {
        if (!pin || pin.length != 4) {
            socket.emit('bad auth', {'result': 'bad len'});
            return;
        } else if (isNaN(pin)) {
            socket.emit('bad auth', {'result': 'bad encryption descriptor'});
            return;
        } else if (pin == "0000") {
            socket.emit('bad auth', {'result': Math.round((Math.random()*9999))});
            return;
        } else if (pin == "1234") {
            socket.emit('bad auth', {'result': 'Success... password is "password1"'});
            return;
        } else if (pin != QMPIN) {
            socket.emit('bad auth', {'result': 'hint: check under Paul\'s chair'});
            return;
        }
        qmid = ident('quizmaster', id, socket);

        let state = {
            question: activeQuestion > -1 ? questions[activeQuestion] : null,
            team: activeTeam > -1 ? teams[activeTeam] : null
        };
        socket.emit('game state', state);
    })
    .on('disconnect', function () {
        if (qmid == null) {
            console.log('[SOCKET] QM [Un-Authed] disconnected');
            return;
        }
        console.log('[SOCKET] QM [' + qmid + '] disconnected');
        connections.quizmasters[qmid].setState('disconnected');;
    })
    .on('client forcedisconnect', function (id) {
        console.log('[SOCKET] QM [' + qmid + '] forcing client [' + id + '] to disconnect');
        connections.contestants[id].kill();
        delete connections.contestants[id];
        notifyConnectionList();
    });

    // Question Events
    socket
    .on('question play', function (qid) {
        console.log('[SOCKET] QM [' + qmid + '] play question => ' + qid);

        activeQuestion = qid;
        questions[qid].setPlayed(true);

        if (questions[qid].getType() == 'pictionary') {
            activePictionaryQuestion = 0;
            pictionaryScore = 0;

            activeTeam = questions[qid].getTeam();

            for (var c in connections.contestants) {
                if (connections.contestants[c].getTeam() != activeTeam) {
                    connections.contestants[c].getSocket().emit('wait');
                    continue;
                }
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
    })
    .on('question audio play', function () {
        if (activeQuestion == -1)
            return;

        if (questions[activeQuestion].type != 'audio')
            return;

        sDashboard.emit('sound play', {sound: 'music_' + questions[activeQuestion].audio});
    })
    .on('question timer', function (msg) {
        if (activeQuestion == -1)
            return;

        if (questions[activeQuestion].type != 'timer' && questions[activeQuestion].type != 'catchphrase')
            return;

        console.log('[SOCKET] QM [' + qmid + '] timer => ' + msg.action);
        sDashboard.emit('question timer', { action: msg.action });
    })
    .on('question correct', function (qid) {
        if (activeTeam < 0)
            return;

        teams[activeTeam].points += parseInt(questions[activeQuestion].getPoints());

        activeTeam = -1;
        for (let t in teams)
            teams[t].answered = false;
        sDashboard.emit('question correct', {sound: 'cheer'});
        sQuizMaster.emit('teams list', teams);
        sDashboard.emit('teams scores', {teams: teams});
        activeQuestion = -1;
        notifyQuestions();
    })
    .on('question wrong', function (qid) {
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
    })
    .on('question skip', function () {
        sDashboard.emit('teams scores', {teams: teams});
        activeQuestion = -1;
        notifyQuestions();
        ++roundNo;
    });

    // Pictionary Events
    var activePictionaryQuestion = 0, pictionaryScore = 0;
    socket
    .on('pictionary start', function () {
        sDashboard.emit('pictionary start');
        for (var c in connections.contestants) {
            if (connections.contestants[c].getTeam() != activeTeam)
                continue;
            connections.contestants[c].getSocket().emit('pictionary start');
        }
    })
    .on('pictionary end', function () {
        sDashboard.emit('pictionary end', pictionaryScore, questions[activeQuestion].getQuestions().length);
        sDashboard.emit('teams scores', {teams: teams});

        sQuizMaster.emit('pictionary end');
        sQuizMaster.emit('teams list', teams);
        for (var c in connections.contestants) {
            if (connections.contestants[c].getTeam() != activeTeam)
                continue;
            connections.contestants[c].getSocket().emit('wait');
        }
    })
    .on('pictionary correct', function () {
        var worth = questions[activeQuestion].getPoints();

        teams[activeTeam].points += parseInt(worth);
        pictionaryScore += parseInt(worth);
        activePictionaryQuestion++;

        if (activePictionaryQuestion >= questions[activeQuestion].getQuestions().length) {
            sDashboard.emit('pictionary end', pictionaryScore, questions[activeQuestion].getQuestions().length);
            sDashboard.emit('teams scores', {teams: teams});

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
    })
    .on('pictionary skip', function () {
        activePictionaryQuestion++;

        if (activePictionaryQuestion >= questions[activeQuestion].getQuestions().length) {
            sDashboard.emit('pictionary end', pictionaryScore, questions[activeQuestion].getQuestions().length);
            sDashboard.emit('teams scores', {teams: teams});

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

    // Sound events
    socket
    .on('sound play', function (sound) {
        sDashboard.emit('sound play', {sound: sound});
    })
    .on('sound stop', function (sound) {
        sDashboard.emit('sound stop');
    });

    // Title events
    socket
    .on('title show', function (title) {
        // @todo(dave13h): ugh hackery...
        if (title.title == 'scores') {
            sDashboard.emit('teams scores', {teams: teams});
            return;
        }
        sDashboard.emit('title show', {title: title, teams: teams});
    });

    // Team Events
    socket
    .on('team name', function (team) {
        if (teams[team.id] == undefined) {
            return;
        }

        teams[team.id].setName(team.name);
        notifyConnectionList(); // @todo(dave13h): optimise
    })
    .on('team score', function (team) {
        var penalty = team.penalty || false;
        if (teams[team.id] == undefined) {
            return;
        }

        teams[team.id].setPoints(team.points);
        notifyConnectionList(); // @todo(dave13h): optimise
        if (penalty)
            sDashboard.emit('penalty', teams[team.id].getName());
    });

    // Debug / internal events
    socket
    .on('autosave', function (enabled) {
        console.log('[SOCKET] QM [AUTOSAVE] => ' + (enabled ? 'Enabled' : 'Disabled'));
        if (enabled && autoSave == null) {
            enableAutoSave();
        } else if (!enabled) {
            disableAutoSave();
        }
    })
    .on('debug teams', function () {
        var debugData = {
            teams: teams
        };
        sQuizMaster.emit('debug teams', debugData);
    });
});

//  _____             _            _              _
// /  __ \           | |          | |            | |
// | /  \/ ___  _ __ | |_ ___  ___| |_ __ _ _ __ | |_ ___
// | |    / _ \| '_ \| __/ _ \/ __| __/ _` | '_ \| __/ __|
// | \__/\ (_) | | | | ||  __/\__ \ || (_| | | | | |_\__ \
//  \____/\___/|_| |_|\__\___||___/\__\__,_|_| |_|\__|___/
//
sContestant
.on('connection', function (socket) {
    var cid = null;
    console.log('[SOCKET] Contestant connected on socket: ' + socket.id);

    // Connection Events
    socket.on('ident', function (id){
        cid = ident('contestant', id, socket);

        if (!connections.contestants[cid].hasTeam()) {
            socket.emit('teams list', teams);
        } else {
            socket.emit('team state', teams[connections.contestants[cid].getTeam()]);
            // socket.emit('team logo', teams[connections.contestants[cid].getTeam()].getLogo());
            // socket.emit('team buzzer', teams[connections.contestants[cid].getTeam()].getBuzzer());
            if (activeQuestion == -1 || questions[activeQuestion].type == 'pictionary')
                socket.emit('wait');
        }
    })
    .on('disconnect', function () {
        console.log('[SOCKET] Contestant [' + cid + '] disconnected');
        if (connections.contestants[cid])
            connections.contestants[cid].setState('disconnected');
        notifyConnectionList();
    });

    // Team Events
    socket
    .on('team join', function (team) {
        if (teams[team] == undefined) {
            socket.emit('teams invalid');
            socket.emit('teams list', teams);
            return;
        }
        connections.contestants[cid].setTeam(team);
        socket.emit('wait');
        sendTeamState(cid, team);
        sendClientState(cid);
        notifyConnectionList();
    })
    .on('team update', function (settings) {
        var c = connections.contestants[cid];
        if (!c.hasTeam())
            return;

        var team = teams[c.getTeam()];
        if (settings.name)
            team.setName(settings.name);

        notifyConnectionList();
    })
    .on('team buzzer', function (data) {
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
    })
    .on('team logo', function (data) {
        if (!data)
            return;

        var c = connections.contestants[cid];
        if (!c.hasTeam())
            return;

        var team = teams[c.getTeam()];
        team.setLogo(data);
        notifyLogo(c.getTeam(), data);
    })
    .on('team avatar', function (data) {
        if (!data)
            return;

        var c = connections.contestants[cid];
        if (!c.hasTeam())
            return;

        var team = teams[c.getTeam()];
        team.setAvatar(data);
        notifyAvatar(c.getTeam(), data);
    });

    // Buzzer Events
    socket
    .on('buzzer send', function (cid) {
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

    // Pictionary events
    socket
    .on('pictionary pen', function (data) {
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
});
