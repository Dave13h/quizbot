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
    teamNames  = [
        'Turkeys',
        'Sprouts',
        'Spuds',
        'Puddings',
        'Pies'
    ];
for (var t = 0; t < teamNames.length; ++t)
    teams.push(new objects.team(t, teamNames[t]));

var questions       = [],
    questionsPlayed = 0,
    activeTeam      = -1,
    activeQuestion  = -1,
    roundNo         = 1;

var ssrAnswers  = [],
    ssrAnswered = [],
    mcAnswers   = [],
    mcAnswered  = [],
    cdAnswers   = [],
    cdAnswered  = [];

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
.get('/qmaster', function (req, res) {
    res.sendFile(__dirname + '/views/fools2.html');
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

//
// ______
// | ___ \
// | |_/ /____      _____ _ __ _   _ _ __  ___
// |  __/ _ \ \ /\ / / _ \ '__| | | | '_ \/ __|
// | | | (_) \ V  V /  __/ |  | |_| | |_) \__ \
// \_|  \___/ \_/\_/ \___|_|   \__,_| .__/|___/
//                                  | |
//                                  |_|
var powerupLocked         = false,
    powerupSelected       = null,
    powerupApplied        = false,
    powerupActive         = {
        powerup: null,
        target: null
    },
    powerupActiveWildcard = null,
    powerupWildcards      = [
        'points',
        'punish',
        'swap'
    ];

function powerupApply() {
    sDashboard.emit('powerup hide');

    if (!powerupActive.powerup) {
        console.log("[PUP] No powerup in play");
        return;
    }

    switch (powerupActive.powerup) {
        case 'silence':
            console.log("[PUP] Applying Silence!");
            if (powerupActive.target) {
                console.log("[PUP] Looking for target: " + powerupActive.target);
                for (var t in teams) {
                    if (teams[t].getName() == powerupActive.target) {
                        console.log("[PUP] Found for target! Silencing!");
                        teams[t].setAnswered(true);
                    }
                }
            }
            powerupApplied = true;
            powerupActive.powerup = null;
            powerupActive.target  = null;
            break;

        case 'boost':
            console.log("[PUP] Applying Boost!");
            if (powerupActive.target != null) {
                console.log("[PUP] Looking for non-target: " + powerupActive.target);
                for (var t in teams) {
                    if (t != powerupActive.target) {
                        console.log("[PUP] Found non-target: " + powerupActive.target + ' Silencing');
                        teams[t].setAnswered(true);
                    }
                }
            }
            break;

        default:
            console.log('[PUP] Unhandled powerup');
            break;
    }
}

function powerupsEnable() {
    for (var c in connections.contestants) {
        var team = connections.contestants[c].getTeam();
        connections.contestants[c].getSocket().emit('powerup enable', teams[team].powerups);
    }
}
function powerupsDisable() {
    for (var c in connections.contestants) {
        var team = connections.contestants[c].getTeam();
        connections.contestants[c].getSocket().emit('powerup disable');
    }
}

function powerupPlay(cid, team, pup) {
    if (powerupLocked) {
        return;
    }

    powerupsDisable();

    for (var c in connections.contestants) {
        if (c == cid) {
            connections.contestants[c].getSocket().emit('powerup used');
            continue;
        }
        connections.contestants[c].getSocket().emit('wait');
    }

    powerupLocked = true;
    var c = connections.contestants[cid],
        team = teams[c.getTeam()];

    sDashboard.emit('powerup played', team, pup.toUpperCase());

    powerupSelected = pup;
    switch (pup) {
        case 'silence':
            sDashboard.emit('sound play', {sound: 'silence'});
            var targets = [];

            for (var t in teams) {
                if (teams[t].getName() == team.getName()) {
                    continue;
                }
                targets.push(teams[t].getName());
            }
            connections.contestants[cid].getSocket().emit('powerup selecttarget', targets);
            break;

        case 'boost':
            sDashboard.emit('sound play', {sound: 'boost'});
            team.powerups[pup] = false;
            powerupActive.powerup = pup;
            powerupActive.target = c.getTeam();
            powerupLocked = false;
            break;

        case 'wildcard':
            sDashboard.emit('sound play', {sound: 'wildcard'});
            powerupWildcards.sort(() => Math.random() - 0.5);
            console.log("[PUP] Shuffled wildcards", powerupWildcards);
            var wildcard = powerupWildcards[0];
            sDashboard.emit('powerup wildcard', wildcard);

            console.log("[PUP] Randomed wildcard: " + wildcard);

            switch (wildcard) {
                case 'points':
                    team.powerups[pup] = false;
                    team.addPoints(5);
                    powerupLocked = false;
                    sQuizMaster.emit('teams list', teams);
                    break;

                case 'punish':
                case 'swap':
                    var myTeam = teams[c.getTeam()],
                        targets = [];

                    for (var t in teams) {
                        if (teams[t].getName() == myTeam.getName()) {
                            continue;
                        }
                        targets.push(teams[t].getName());
                    }

                    powerupActiveWildcard = wildcard;
                    connections.contestants[cid].getSocket().emit('powerup selecttarget', targets, wildcard);
                    break;
            }
            break;
    }
}

function powerupTarget(cid, team, target) {
    var c = connections.contestants[cid],
        team = teams[c.getTeam()];

    var msg = '';

    if (powerupActiveWildcard) {
        switch (powerupActiveWildcard) {
            case 'punish':
                sDashboard.emit('sound play', {sound: 'punish'});
                msg = ', you\'ve lost 5 points!';
                team.powerups['wildcard'] = false;
                powerupLocked = false;
                var targetTeam;
                for (var tt in teams) {
                    if (teams[tt].getName() == target) {
                        teams[tt].decPoints(5);
                        break;
                    }
                }
                sQuizMaster.emit('teams list', teams);
                break;

            case 'swap':
                sDashboard.emit('sound play', {sound: 'swap'});
                msg = ', you\'ve swapped places in the scoreboard!';
                team.powerups['wildcard'] = false;
                powerupLocked = false;

                for (var tt in teams) {
                    if (teams[tt].getName() == target) {
                        var myPoints = team.getPoints();
                        team.setPoints(teams[tt].getPoints());
                        teams[tt].setPoints(myPoints);
                    }
                }
                sQuizMaster.emit('teams list', teams);
                break;

            default:
                console.log("[PUP] unknown wildcard: " + powerupActiveWildcard);
                break;
        }
    } else {
        msg = ', you miss the next question!';
        powerupActive = {
            powerup: powerupSelected,
            target: target
        };
    }

    sDashboard.emit('powerup selecttarget', target, msg);
    powerupSelected = null;
    powerupLocked = false;
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
const QMPIN = 1995;
sQuizMaster.on('connection', function (socket) {
    var qmid = null;
    console.log('[SOCKET] QM connected on socket: ' + socket.id);

    //
    // Connection Events
    //
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

    //
    // Question Events
    //
    socket
    .on('question play', function (qid) {
        console.log('[SOCKET] QM [' + qmid + '] play question => ' + qid);

        if (powerupLocked) {
            console.log('Powerup locked');
            return;
        }

        for (var c in connections.contestants) {
            connections.contestants[c].getSocket().emit('powerup disable');
        }

        activeQuestion = qid;
        questions[qid].setPlayed(true);

        ++questionsPlayed;
        if (questionsPlayed == 10) {
            console.log('[PUP] Wildcard enabled next question!!');
            // Enable the wildcards!!
            for (var t in teams) {
                teams[t].powerups.wildcard = true;
            }
        }

        switch (questions[qid].getType()) {
            case 'pictionary':
                pictionaryActiveQuestion = 0;
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

            case 'santassleighride':
                sQuizMaster.emit(
                    'santassleighride init',
                    questions[qid].getQuestions()
                );

                ssrInit();

                for (var c in connections.contestants) {
                    connections.contestants[c].getSocket().emit('santassleighride init');
                }
                return;

            case 'multichoice':
                mcAnswers = [];
                mcAnswered = [];
                mcCountdown = 0;
                mcRoundTimer = null;
                mcWaitingForClients = null;

                sDashboard.emit('question play', {
                    round: "Round " + roundNo + "!",
                    question: questions[qid]
                });

                for (var c in connections.contestants) {
                    connections.contestants[c].getSocket().emit(
                        'multichoice play',
                        questions[qid]
                    );
                }

                sQuizMaster.emit('teams list', teams);

                mcTick();
                return;

            case 'countdown':
                cdAnswers = [];
                cdAnswered = [];
                cdCountdown = 0;
                cdRoundTimer = null;
                cdWaitingForClients = null;

                sDashboard.emit('question play', {
                    round: "Round " + roundNo + "!",
                    question: questions[qid]
                });

                sDashboard.emit('sound play', {sound: 'countdown'});

                for (var c in connections.contestants) {
                    connections.contestants[c].getSocket().emit(
                        'countdown play',
                        questions[qid]
                    );
                }

                cdTick();
                return;
        }

        activeTeam = -1;
        for (let t in teams) {
            teams[t].answered = false;
        }

        powerupApply();

        sQuizMaster.emit('teams list', teams);

        sDashboard.emit('question play', {
            round: "Round " + roundNo + "!",
            question: questions[qid]
        });

        for (var c in connections.contestants) {
            var team = connections.contestants[c].getTeam();
            if (teams[team].getAnswered()) {
                connections.contestants[c].getSocket().emit('wait');
            } else {
                connections.contestants[c].getSocket().emit('question play');
            }
        }
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

        if (powerupActive.powerup && powerupActive.powerup == 'boost') {
            var givePoints = parseInt(questions[activeQuestion].getPoints()) + 2;
            console.log('[PUP] Add ' + givePoints + ' points for boost win');
            teams[activeTeam].addPoints(givePoints);
            powerupActive.powerup = null;
            powerupActive.target  = null;
        } else {
            teams[activeTeam].points += parseInt(questions[activeQuestion].getPoints());
        }

        activeTeam = -1;
        for (let t in teams)
            teams[t].answered = false;
        sDashboard.emit('question correct', {sound: 'cheer'});
        sQuizMaster.emit('teams list', teams);
        sDashboard.emit('teams scores', {teams: teams});
        activeQuestion = -1;
        notifyQuestions();
        powerupsEnable();
    })
    .on('question wrong', function (qid) {
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

        if (powerupActive.powerup && powerupActive.powerup == 'boost') {
            var losePoints = parseInt(questions[activeQuestion].getPoints()) + 2;
            console.log('[PUP] Dec ' + losePoints + ' points for boost fail');
            teams[activeTeam].decPoints(losePoints);
            powerupActive.powerup = null;
            powerupActive.target  = null;
        }

        if (hasChance) {
            sDashboard.emit('question wrong', {sound: 'buzzer_wrong'});
        } else {
            sDashboard.emit('question losers', {sound: 'laugh'});
            sDashboard.emit('teams scores', {teams: teams});
            activeQuestion = -1;
            notifyQuestions();
            powerupsEnable();
            ++roundNo;
        }

        sQuizMaster.emit('teams list', teams);

        activeTeam = -1;
    })
    .on('question skip', function () {
        if (powerupActive.powerup && powerupActive.powerup == 'boost') {
            var losePoints = parseInt(questions[activeQuestion].getPoints()) + 2;
            console.log('[PUP] Dec ' + losePoints + ' points for boost up fail');
            teams[powerupActive.target].decPoints(losePoints);
            powerupActive.powerup = null;
            powerupActive.target  = null;
            sQuizMaster.emit('teams list', teams);
        }

        sDashboard.emit('teams scores', {teams: teams});
        activeQuestion = -1;
        notifyQuestions();

        for (var c in connections.contestants) {
            connections.contestants[c].getSocket().emit('wait');
        }

        powerupsEnable();

        if (mcRoundTimer) {
            clearInterval(mcRoundTimer);
            mcRoundTimer = null;
        }
        if (cdRoundTimer) {
            clearInterval(cdRoundTimer);
            cdRoundTimer = null;
        }

        ++roundNo;
    })
    .on('powerup_release', function () {
        powerupLocked = false;
        console.log('Poweruplock released');
    })
    .on('powerup_disable', function () {
        powerupActive.powerup = null;
        powerupActive.target  = null;
        powerupLocked = false;
        powerupsDisable();
        console.log('[PUP] Powerups disabled');
    })
    .on('powerup_enable', function () {
        powerupsEnable();
        console.log('[PUP] Powerups enabled');
    })
    .on('powerup_refresh', function () {
        for (var t in teams) {
            teams[t].refreshPowerups();
        }
        powerupsEnable();
        console.log('[PUP] Powerups refreshed');
    });

    //
    // Pictionary Events
    //
    var pictionaryActiveQuestion = 0,
        pictionaryScore = 0;
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
        pictionaryActiveQuestion++;

        if (pictionaryActiveQuestion >= questions[activeQuestion].getQuestions().length) {
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

        sQuizMaster.emit('pictionary active', pictionaryActiveQuestion);
        sDashboard.emit('pictionary active', pictionaryActiveQuestion, pictionaryScore);

        for (var c in connections.contestants) {
            if (connections.contestants[c].getTeam() != activeTeam)
                continue;
            connections.contestants[c].getSocket().emit('pictionary active', pictionaryActiveQuestion);
        }
    })
    .on('pictionary skip', function () {
        pictionaryActiveQuestion++;

        if (pictionaryActiveQuestion >= questions[activeQuestion].getQuestions().length) {
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

        sQuizMaster.emit('pictionary active', pictionaryActiveQuestion);
        sDashboard.emit('pictionary active', pictionaryActiveQuestion, pictionaryScore);

        for (var c in connections.contestants) {
            if (connections.contestants[c].getTeam() != activeTeam)
                continue;
            connections.contestants[c].getSocket().emit('pictionary active', pictionaryActiveQuestion);
        }
    });

    //
    // Multichoice Events
    //
    var mcCountdown         = 0,
        mcRoundTimer        = null,
        mcWaitingForClients = null;

    function mcTick () {
        if (!mcRoundTimer) {
            mcCountdown = questions[activeQuestion].timer;
            mcRoundTimer = setInterval(mcTick, 1000);
            return;
        }

        if (mcCountdown-- < 1) {
            clearInterval(mcRoundTimer);
            mcFetchAnswers();
            sDashboard.emit(
                'multichoice roundend',
                questions[activeQuestion].question,
                []
            );
            return;
        }
    }

    var mcCheckResultsTimeout = 0;
    function mcFetchAnswers () {
        console.log("[mc] Asking for answers");
        mcCheckResultsTimeout = 0;
        for (var t = 0; t < teams.length; ++t) {
            mcAnswered[t] = false;
            mcAnswers[t]  = [false, false, false, false];
        }
        for (var c in connections.contestants) {
            connections.contestants[c].getSocket().emit('multichoice getanswers');
        }
        mcWaitingForClients = setInterval(mcCheckResults, 100);
    }

    function mcCheckResults () {
        ++mcCheckResultsTimeout;
        if (mcCheckResultsTimeout < 20) {
            var aCount = 0;
            for (var t = 0; t < teams.length; ++t) {
                if (mcAnswered[t]) {
                    ++aCount;
                    continue;
                }
                console.log("[mc] Waiting for ", teams[t].getName());
            }
            if (aCount != teams.length) {
                return false;
            }
        } else {
            console.log("[mc] Checking results timeout");
        }

        clearInterval(mcWaitingForClients);
        mcWaitingForClients = null;

        var results = [],
            answers = questions[activeQuestion].question.answers,
            aVals   = [],
            aid     = 0;
        for (var a in answers) { // Unroll, thanks JS for not supporting index access to key'd arrays :F
            aVals[aid++] = answers[a];
        }

        for (var t = 0; t < teams.length; ++t) {
            results[t] = [];

            var tPoints = 0;

            if (aVals[0] && mcAnswers[t][0]) {
                ++tPoints;
            }
            if (aVals[1] && mcAnswers[t][1]) {
                ++tPoints;
            }
            if (aVals[2] && mcAnswers[t][2]) {
                ++tPoints;
            }
            if (aVals[3] && mcAnswers[t][3]) {
                ++tPoints;
            }

            teams[t].addPoints(tPoints);
        }

        sDashboard.emit('teams scores', {teams: teams});
        for (var c in connections.contestants) {
            connections.contestants[c].getSocket().emit('wait');
        }

        activeQuestion = -1;
        notifyQuestions();
        powerupsEnable();
        ++roundNo;

        activeTeam = -1;

        sQuizMaster.emit('teams list', teams);
    }

    //
    // Countdown Events
    //
    var cdCountdown         = 0,
        cdRoundTimer        = null,
        cdWaitingForClients = null;

    function cdTick () {
        if (!cdRoundTimer) {
            cdCountdown = questions[activeQuestion].timer;
            cdRoundTimer = setInterval(cdTick, 1000);
            return;
        }

        if (cdCountdown-- < 1) {
            clearInterval(cdRoundTimer);
            cdFetchAnswers();
            return;
        }
    }

    var cdCheckResultsTimeout = 0;
    function cdFetchAnswers () {
        console.log("[cd] Asking for answers");
        cdCheckResultsTimeout = 0;
        for (var t = 0; t < teams.length; ++t) {
            cdAnswered[t] = false;
            cdAnswers[t]  = '';
        }
        for (var c in connections.contestants) {
            connections.contestants[c].getSocket().emit('countdown getanswer');
        }
        cdWaitingForClients = setInterval(cdCheckResults, 100);
    }

    function cdCheckResults () {
        ++cdCheckResultsTimeout;
        if (cdCheckResultsTimeout < 20) {
            var aCount = 0;
            for (var t = 0; t < teams.length; ++t) {
                if (cdAnswered[t]) {
                    ++aCount;
                    continue;
                }
                console.log("[cd] Waiting for ", teams[t].getName());
            }
            if (aCount != teams.length) {
                return false;
            }
        } else {
            console.log("[cd] Checking results timeout");
        }

        clearInterval(cdWaitingForClients);
        cdWaitingForClients = null;

        // Quizmaster dishes out the points

        sQuizMaster.emit('countdown results', {teams: teams, answers: cdAnswers});
        sDashboard.emit('countdown results', {teams: teams, answers: cdAnswers});
        for (var c in connections.contestants) {
            connections.contestants[c].getSocket().emit('wait');
        }
    }

    //
    // Santa's Sleigh Ride Events
    //
    var ssrActiveQuestion    = 0,
        ssrCountdown         = 0,
        ssrRoundTimer        = null,
        ssrWaitingForClients = null,
        ssrMaxPoints         = 20,
        ssrPoints            = [0, 0, 0, 0, 0],
        ssrLeaders           = [false, false, false, false, false];

    socket
    .on('santassleighride start', function () {
        var ssrQuestion = questions[activeQuestion].questions[ssrActiveQuestion];
        for (var c in connections.contestants) {
            var c = connections.contestants[c];
            c.getSocket().emit(
                'santassleighride active',
                ssrQuestion,
                ssrLeaders[teams[c.getTeam()].getId()]
            );
        }

        ssrCountdown = 10;
        if (ssrRoundTimer) {
            clearInterval(ssrRoundTimer);
            ssrRoundTimer = null;
        }
        ssrTick();
    })
    .on('santassleighride reset', function () {
        ssrActiveQuestion = 0;
        if (ssrRoundTimer) {
            clearInterval(ssrRoundTimer);
            ssrRoundTimer = null;
        }
        ssrInit();
    })
    .on('santassleighride pause', function () {
        sDashboard.emit('santassleighride pause');
    });

    function ssrInit() {
        var avatars = [],
            scores = [],
            positions = [],
            minScore = 100000,
            maxScore = 0;
        for (var t in teams) {
            avatars.push(teams[t].getAvatar());
            var tScore = teams[t].getPoints();
            scores[t] = { t: t, s: tScore};

            maxScore = Math.max(maxScore, tScore);
        }

        // Add some points on to the max score,
        // so at least we get a bit of a game
        ssrMaxPoints = 50 + maxScore;

        scores.sort(function (a, b){ return parseInt(a.s) - parseInt(b.s); });

        // Seed positions
        ssrPoints = [0,0,0,0,0];
        for (var s in scores) {
            var isLeader = (scores[s].s == maxScore);
            ssrLeaders[scores[s].t] = isLeader;
            ssrPoints[scores[s].t] = (isLeader ? 5 : s) * 2;
        }

        console.log('[SSR] Max Points', ssrMaxPoints);
        console.log('[SSR] Seed Positions', ssrPoints);

        sDashboard.emit(
            'santassleighride init',
            teamNames,
            avatars,
            ssrPoints,
            ssrLeaders,
            ssrMaxPoints
        );
    }

    function ssrTick () {
        if (!ssrRoundTimer) {
            sDashboard.emit(
                'santassleighride active',
                questions[activeQuestion].questions[ssrActiveQuestion]
            );
            ssrCountdown = 10;
            ssrRoundTimer = setInterval(ssrTick, 1000);
            return;
        }

        if (ssrCountdown-- < 1) {
            clearInterval(ssrRoundTimer);
            ssrRoundEnd();
            return;
        }

        sDashboard.emit(
            'santassleighride tick',
            ssrCountdown
        );
    }

    function ssrRoundEnd () {
        sDashboard.emit('sound play', {sound: 'bells'});
        sDashboard.emit(
            'santassleighride roundend',
            questions[activeQuestion].questions[ssrActiveQuestion],
            []
        );

        ssrFetchAnswers();
    }

    var ssrCheckResultsTimeout = 0;
    function ssrFetchAnswers () {
        ssrCheckResultsTimeout = 0;
        for (var t = 0; t < teams.length; ++t) {
            ssrAnswered[t] = false;
            ssrAnswers[t] = [false, false, false];
        }
        for (var c in connections.contestants) {
            connections.contestants[c].getSocket().emit('santassleighride getanswers');
        }
        ssrWaitingForClients = setInterval(ssrCheckResults, 100);
    }

    function ssrCheckResults () {
        ++ssrCheckResultsTimeout;
        if (ssrCheckResultsTimeout < 20) {
            var aCount = 0;
            for (var t = 0; t < teams.length; ++t) {
                if (ssrAnswered[t]) {
                    ++aCount;
                    continue;
                }
                console.log("[SSR] Waiting for ", teams[t].getName());
            }
            if (aCount != teams.length) {
                return false;
            }
        } else {
            console.log("[SSR] Checking results timeout");
        }

        clearInterval(ssrWaitingForClients);
        ssrWaitingForClients = null;

        var results = [],
            answers = questions[activeQuestion].questions[ssrActiveQuestion].answers,
            aVals   = [],
            aid     = 0,
            lPoints = 0;
        for (var a in answers) { // Unroll, thanks JS for not supporting index access to key'd arrays :F
            aVals[aid++] = answers[a];
        }
        for (var t = 0; t < teams.length; ++t) {
            results[t] = [];

            var tPoints = 0,
                tLeader = ssrLeaders[t];

            results[t][0] = false;
            if (ssrAnswers[t][0] == aVals[0]) {
                results[t][0] = true;
                ++tPoints;
            }

            results[t][1] = false;
            if (ssrAnswers[t][1] == aVals[1]) {
                results[t][1] = true;
                ++tPoints;
            }

            if (!tLeader) {
                results[t][2] = false;
                if (ssrAnswers[t][2] == aVals[2]) {
                    results[t][2] = true;
                    ++tPoints;
                }
            }

            teams[t].addPoints(tPoints);
            ssrPoints[t] += tPoints;

            console.log('[SSR] ' + teams[t].getName() + ' has ' + parseInt(teams[t].getPoints()));

            lPoints = Math.max(lPoints, ssrPoints[t]);
        }

        console.log("[SSR] Leader has ", lPoints);

        for (var t in ssrPoints) {
            ssrLeaders[t] = (ssrPoints[t] == lPoints);
        }

        ++ssrActiveQuestion;

        // if we reach the score limit or we run out of questions...A winner is you!
        var winners = [],
            outOfQuestions = ssrActiveQuestion >= questions[activeQuestion].questions.length;

        if (lPoints >= ssrMaxPoints || outOfQuestions) {
            for (var t in ssrLeaders) {
                if (!ssrLeaders[t]) {
                    continue;
                }
                winners.push(parseInt(t));
            }

            sQuizMaster.emit('santassleighride gameover', winners);

            for (var c in connections.contestants) {
                var con = connections.contestants[c];
                con.getSocket().emit(
                    'santassleighride gameover',
                    winners.indexOf(teams[con.getTeam()].getId()) !== -1
                );
            }
        }

        sDashboard.emit(
            'santassleighride answers',
            results,
            ssrPoints,
            ssrLeaders,
            winners,
            outOfQuestions
        );

        if (winners.length == 0) {
            sQuizMaster.emit('santassleighride nextround');
        }
    }

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

        if (team.addpoints) {
            teams[team.id].addPoints(parseInt(team.addpoints));
        } else {
            teams[team.id].setPoints(parseInt(team.points));
        }

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

    //
    // Connection Events
    //
    socket.on('ident', function (id){
        cid = ident('contestant', id, socket);

        if (!connections.contestants[cid].hasTeam()) {
            socket.emit('teams list', teams);
        } else {
            socket.emit('team state', teams[connections.contestants[cid].getTeam()]);
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

    //
    // Team Events
    //
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

    //
    // Buzzer Events
    //
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

    //
    // Pictionary events
    //
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

    //
    // Multichoice answers
    //
    socket
    .on('multichoice answers', function (answers) {
        var c = connections.contestants[cid],
            team = teams[c.getTeam()];

        console.log('[MC] ' + cid + ' => team: ' + team.getName(), answers);
        mcAnswers[team.getId()] = answers;
        mcAnswered[team.getId()] = true;
    });

    //
    // Countdown answer
    //
    socket
    .on('countdown answer', function (answer) {
        var c = connections.contestants[cid],
            team = teams[c.getTeam()];

        console.log('[CD] ' + cid + ' => team: ' + team.getName() + ' => Answer: ' + answer);
        cdAnswers[team.getId()] = answer.trim();
        cdAnswered[team.getId()] = true;
    });

    //
    // Santa's Sleigh Ride events
    //
    socket
    .on('santassleighride answers', function (answers) {
        var c = connections.contestants[cid],
            team = teams[c.getTeam()];

        console.log('[MC] ' + cid + ' => team: ' + team.getName(), answers);
        ssrAnswers[team.getId()] = answers;
        ssrAnswered[team.getId()] = true;
    });

    //
    // Powerup events
    //
    socket
    .on('powerup', function (pup) {
        if (powerupLocked) {
            return;
        }

        var c = connections.contestants[cid],
            team = teams[c.getTeam()];

        console.log('[PUP] ' + cid + ' => wants to play powerup: ' + pup);
        if (!team.powerups.hasOwnProperty(pup)) {
            console.log('[PUP] ' + cid + ' => powerup doesnt exist: ' + pup);
            return;
        }
        if (team.powerups[pup]) {
            powerupPlay(cid, team, pup);
        }
    })
    .on('powerup target', function (target) {
        var c = connections.contestants[cid],
            team = teams[c.getTeam()];

        console.log('[PUP] ' + cid + ' => wants to play powerup: ' + powerupSelected + ' against: ' + target);
        if (!team.powerups.hasOwnProperty(powerupSelected)) {
            console.log('[PUP] ' + cid + ' => powerup doesnt exist: ' + powerupSelected);
            return;
        }

        if (team.powerups[powerupSelected]) {
            team.powerups[powerupSelected] = false;
            powerupTarget(cid, team, target);
        }
    });

    //
    // Bonus round...
    //
    var bodQuestions = [
        'WHAT is your name?',
        'WHAT is your quest?',
        'WHAT is the average air speed of an unladen swallow?'
    ], bodAnswers = [
        null,
        ['seek', 'grail'],
        ['african', 'european']
    ], bodQidx = 0;
    socket
    .on('oldmanfromscene24', function (response) {
        if (response == null) {
            bodQidx = 0;
            socket.emit('bod', "STOP!");
            socket.emit('bod', "Who would cross the bridge of death must answer me these questions 3! eer the other see he see...");
            socket.emit('bod', bodQuestions[0]);
            return;
        }

        if (bodAnswers[bodQidx] == null) {
            ++bodQidx;
        } else {
            var answords = response.toLowerCase();
            for (var a in bodAnswers[bodQidx]) {
                if (answords.indexOf(bodAnswers[bodQidx][a]) == -1) {
                    bodQidx = 0;
                    socket.emit('bod', "*death noises* ARARRRGGHHHH!");
                    socket.emit('bod', "You have died.");
                    return;
                }
            }
            ++bodQidx;
        }

        if (bodQidx < 3) {
            socket.emit('bod', bodQuestions[bodQidx]);
            return;
        }

        socket.emit('bod', "Right... off you go... *Tsetse fly*");
        bodQidx = 0;
    });
});
