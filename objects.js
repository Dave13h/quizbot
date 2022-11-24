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
        this.logo     = null;
        this.avatar   = null;
    }

    toJson () {
        return {
            id: this.id,
            name: this.name,
            points: this.points,
            buzzer: this.buzzer,
            logo: this.logo,
            avatar: this.avatar
        };
    }

    getId () {
        return this.id;
    }

    getBuzzer () {
        return this.buzzer;
    }

    setBuzzer (blob) {
        this.buzzer = blob;
        return this;
    }

    getAvatar () {
        return this.avatar;
    }

    setAvatar (blob) {
        this.avatar = blob;
    }

    getLogo () {
        return this.logo;
    }

    setLogo (blob) {
        this.logo = blob;
        return this;
    }

    getName () {
        return this.name;
    }

    setName (name) {
        this.name = name;
        return this;
    }

    getAnswered () {
        return this.answered;
    }

    setAnswered (answered) {
        this.answered = answered;
        return this;
    }

    getPoints () {
        return this.points;
    }

    addPoints (incr) {
        this.points += incr;
        return this;
    }

    decPoints (decr) {
        this.points -= decr;
        return this;
    }

    setPoints (points) {
        this.points = parseInt(points);
        return this;
    }
}

class oQuestion {
    constructor (qid, data) {
        this.id     = qid;
        this.played = false;

        this.type   = data.type;
        this.title  = data.title;
        this.text   = data.text;
        this.audio  = data.audio;
        this.image  = data.image;

        this.points  = 1;
        if (!isNaN(data.points))
            this.points = parseInt(data.points);

        this.timer  = 60;
        if (!isNaN(data.timer))
            this.timer = parseInt(data.timer);

        this.questions = [];
        if (this.type == 'pictionary') {
            this.team = data.team;
            this.questions = data.questions;
        }
    }

    toJson () {
        return {
            id: this.id,
            played: this.played,
        };
    }

    getType () {
        return this.type;
    }

    getAudio () {
        return this.audio;
    }

    getImage () {
        return this.image;
    }

    getTitle () {
        return this.title;
    }

    getTeam () {
        return this.team;
    }

    getQuestions () {
        return this.questions;
    }

    getPoints() {
        return this.points;
    }

    getText () {
        return this.text;
    }

    getTimer () {
        return this.timer;
    }

    setPlayed (played) {
        this.played = played;
        return this;
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
