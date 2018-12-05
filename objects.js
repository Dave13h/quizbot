//  _____ _     _           _
// |  _  | |   (_)         | |
// | | | | |__  _  ___  ___| |_ ___
// | | | | '_ \| |/ _ \/ __| __/ __|
// \ \_/ / |_) | |  __/ (__| |_\__ \
//  \___/|_.__/| |\___|\___|\__|___/
//            _/ |
//           |__/
//
/**
 * @brief Connection base class
 */
class oConnection {
    constructor (cid, socket) {
        this.id     = cid;
        this.socket = socket;
        this.state  = 'connected';
    }

    getId () {
        return this.id;
    }

    setSocket (socket) {
        this.socket = socket;
        return this;
    }

    getSocket () {
        return this.socket;
    }

    setState (state) {
        this.state = state;
        return this;
    }

    getState () {
        return this.state;
    }

    kill () {
        this.socket.emit('order 66');
    }
}

/**
 * @brief Contestant Object
 */
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

/**
 * @brief Quiz Master Object
 */
class oQuizMaster extends oConnection {
    constructor (cid, socket) {
        super(cid, socket);
        console.log('[OBJECT] New QuizMaster[' + cid + ']');
    }
}

class oTeam {
    constructor (id, name) {
        this.id       = id;
        this.name     = name;
        this.answered = false;
        this.points   = 0;
        this.buzzer   = null;
    }

    getId () {
        return this.id;
    }

    getBuzzer () {
        return this.buzzer;
    }

    setBuzzer (blob) {
        this.buzzer = blob;
    }

    getName () {
        return this.name;
    }

    setName (name) {
        this.name = name;
    }

    getAnswered () {
        return this.answered;
    }

    setAnswered (answered) {
        this.answered = answered;
    }

    getPoints () {
        return this.points;
    }

    addPoints (incr) {
        this.points += incr;
    }

    decPoints (decr) {
        this.points -= decr;
    }

    setPoints (points) {
        this.points = points;
    }
}

class oQuestion {
    constructor (data) {
        this.played = false;

        this.type   = data.type;
        this.title  = data.title;
        this.text   = data.text;
        this.audio  = data.audio;
    }

    getType () {
        return this.type;
    }

    getAudio () {
        return this.audio;
    }

    getTitle () {
        return this.title;
    }

    getText () {
        return this.text;
    }
}

// ------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------
module.exports = {
    connection: oConnection,
    contestant: oContestant,
    quizMaster: oQuizMaster,
    team:       oTeam,
    question:   oQuestion
}
