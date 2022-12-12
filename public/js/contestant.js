//  _____             _            _              _       ___ _____
// /  __ \           | |          | |            | |     |_  /  ___|
// | /  \/ ___  _ __ | |_ ___  ___| |_ __ _ _ __ | |_      | \ `--.
// | |    / _ \| '_ \| __/ _ \/ __| __/ _` | '_ \| __|     | |`--. \
// | \__/\ (_) | | | | ||  __/\__ \ || (_| | | | | |_  /\__/ /\__/ /
//  \____/\___/|_| |_|\__\___||___/\__\__,_|_| |_|\__| \____/\____/
//
// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣤⣤⣤⣤⣤⣶⣦⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⡿⠛⠉⠙⠛⠛⠛⠛⠻⢿⣿⣷⣤⡀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⠋⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⠈⢻⣿⣿⡄⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⣸⣿⡏⠀⠀⠀⣠⣶⣾⣿⣿⣿⠿⠿⠿⢿⣿⣿⣿⣄⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⣿⣿⠁⠀⠀⢰⣿⣿⣯⠁⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣷⡄⠀
// ⠀⠀⣀⣤⣴⣶⣶⣿⡟⠀⠀⠀⢸⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣷⠀
// ⠀⢰⣿⡟⠋⠉⣹⣿⡇⠀⠀⠀⠘⣿⣿⣿⣿⣷⣦⣤⣤⣤⣶⣶⣶⣶⣿⣿⣿⠀
// ⠀⢸⣿⡇⠀⠀⣿⣿⡇⠀⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃⠀
// ⠀⣸⣿⡇⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠉⠻⠿⣿⣿⣿⣿⡿⠿⠿⠛⢻⣿⡇⠀⠀
// ⠀⣿⣿⠁⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣧⠀⠀
// ⠀⣿⣿⠀⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⠀⠀   Sussybakka?
// ⠀⣿⣿⠀⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⠀⠀
// ⠀⢿⣿⡆⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀
// ⠀⠸⣿⣧⡀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⠃⠀⠀
// ⠀⠀⠛⢿⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⣰⣿⣿⣷⣶⣶⣶⣶⠶⠀⢠⣿⣿⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⣿⣿⠀⠀⠀⠀⠀⣿⣿⡇⠀⣽⣿⡏⠁⠀⠀⢸⣿⡇⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⣿⣿⠀⠀⠀⠀⠀⣿⣿⡇⠀⢹⣿⡆⠀⠀⠀⣸⣿⠇⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⢿⣿⣦⣄⣀⣠⣴⣿⣿⠁⠀⠈⠻⣿⣿⣿⣿⡿⠏⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠈⠛⠻⠿⠿⠿⠿⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
$(function () {
    var socket     = io('/contestant'),
        cid        = window.localStorage.getItem('cid'),
        buzzerBlob = null,
        hasLogo    = false,
        hasAvatar  = false,
        myTeamName = 'unassigned';

    console.log('My id: ' + cid);

    //  _   _ _                 _   _      _
    // | | | (_)               | | | |    | |
    // | | | |_  _____      __ | |_| | ___| |_ __   ___ _ __ ___
    // | | | | |/ _ \ \ /\ / / |  _  |/ _ \ | '_ \ / _ \ '__/ __|
    // \ \_/ / |  __/\ V  V /  | | | |  __/ | |_) |  __/ |  \__ \
    //  \___/|_|\___| \_/\_/   \_| |_/\___|_| .__/ \___|_|  |___/
    //                                      | |
    //                                      |_|
    function buttonView () {
        $('section').hide();
        $('#buttons').show();
        $('#buzzer').addClass('is-success').removeClass('is-error').prop("disabled", false);
    }

    //
    //  _____            _        _     _____                _
    // /  ___|          | |      | |   |  ___|              | |
    // \ `--.  ___   ___| | _____| |_  | |____   _____ _ __ | |_ ___
    //  `--. \/ _ \ / __| |/ / _ \ __| |  __\ \ / / _ \ '_ \| __/ __|
    // /\__/ / (_) | (__|   <  __/ |_  | |___\ V /  __/ | | | |_\__ \
    // \____/ \___/ \___|_|\_\___|\__| \____/ \_/ \___|_| |_|\__|___/
    socket
    .on('connect', function (msg) {
        socket.emit('ident', cid);
    })
    .on('reconnect', function (msg) {
        $('section').hide();
        socket.emit('ident', cid);
    })
    .on('wait', function() {
        $('section').hide();
        $('#wait').show();
        $('#bMenu').show();
    })
    .on('teams list', function (teams) {
        $('#teams .list').html('');
        $(teams).each(function(k, v) {
            $('#teams .list').append(
                $('<button/>')
                    .addClass('btn')
                    .addClass('is-error')
                    .text(v.name)
                    .on('click', function () {
                        $('#err').html("").hide();
                        socket.emit('team join', k);
                        $('#teamname').html(v.name);
                    })
            ).append("<br/>");
        });
        $('#teams').show();
    })
    .on('teams invalid', function () {
        $('#err').html("Invalid Team Choice").show();
    })
    .on('team state', function (data) {
        if (data.logo) {
            var logo = new Image();
            logo.onload = function(){
              tl_canvasCtx.drawImage(logo, 0, 0);
            };
            logo.src = data.logo;
            hasLogo = true;
        }

        if (data.avatar) {
            var avatar = new Image();
            avatar.onload = function(){
              avatar_canvasCtx.drawImage(avatar, 0, 0);
            };
            avatar.src = data.avatar;
            hasAvatar = true;
            avatar_canvas.style.display = 'block';
        }

        if (data.buzzer) {
            var buzzerBlob = new Blob([team.buzzer], { 'type' : 'audio/ogg; codecs=opus' }),
                audioURL = window.URL.createObjectURL(buzzerBlob);
            $('#aBuzzer')[0].src = audioURL;
        }
    })
    .on('question play', function(options) {
        buttonView();
        $('#menu').hide();
    })
    .on('question chance', function(options) {
        buttonView();
        $('#menu').hide();
    })
    .on('question disable', function(options) {
        $('#buzzer').removeClass('is-success').addClass('is-error').prop("disabled", true);
        $('#menu').hide();
    })
    .on('game state', function (state) {
        if (state.team) {
            team = state.team;
            $('#name_field').val(team.name);
            $('#teamname').html(team.name);

            if (state.question && state.question.type != "pictionary") {
                buttonView();
                if (state.answered) {
                    $('#buzzer').removeClass('is-success').addClass('is-error').prop("disabled", true);
                }
            }
        }
    })
    .on('order 66', function (msg) {
        window.localStorage.removeItem('cid');
        cid = null;
        $('section').hide();
        $('#killed').show();
        $('#menu').show();
        console.log("execute order 66");
    })
    .on('id', function (id) {
        console.log('Got ID: ' + id);
        cid = id;
        window.localStorage.setItem('cid', cid);
    });

    //
    // ______                      ___       _   _
    // |  ___|                    / _ \     | | (_)
    // | |_ ___  _ __ _ __ ___   / /_\ \ ___| |_ _  ___  _ __  ___
    // |  _/ _ \| '__| '_ ` _ \  |  _  |/ __| __| |/ _ \| '_ \/ __|
    // | || (_) | |  | | | | | | | | | | (__| |_| | (_) | | | \__ \
    // \_| \___/|_|  |_| |_| |_| \_| |_/\___|\__|_|\___/|_| |_|___/
    //
    $('#bResetToken').on('click', function () {
        window.localStorage.removeItem('cid');
        cid = null;
        window.location.reload(false);
    });

    $('#buzzer').on('click', function () {
        socket.emit('buzzer send', cid);
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        $('#buzzer').removeClass('is-success').addClass('is-error').prop("disabled", true);
    });

    $('#bMenu').on('click', function () {
        $('#menu').show();
        $('#bMenu').hide();
    });
    $('#bSave').on('click', function () {
        var settings = {
            name: $('#name_field').val()
        };

        socket.emit('team update', settings);
        socket.emit('team buzzer', buzzerBlob);
        socket.emit('team logo', tl_canvas.toDataURL());
        socket.emit('team avatar', avatar_canvas.toDataURL('image/jpg'));
        $('#menu').hide();
        $('#bMenu').show();
    });
    $('#bCancel').on('click', function () {
        $('#menu').hide();
        $('#bMenu').show();
    });

    $('#bPlay').on('click', function () {
        if (!buzzerChunks)
            return;
        $('#aBuzzer')[0].play();
    });

    //  _____                     ______
    // |_   _|                    | ___ \
    //   | | ___  __ _ _ __ ___   | |_/ /_   _ ___________ _ __
    //   | |/ _ \/ _` | '_ ` _ \  | ___ \ | | |_  /_  / _ \ '__|
    //   | |  __/ (_| | | | | | | | |_/ / |_| |/ / / /  __/ |
    //   \_/\___|\__,_|_| |_| |_| \____/ \__,_/___/___\___|_|
    //
    var mediaRecorder, recording = false, buzzerChunks = [];

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia supported.');
        navigator.mediaDevices.getUserMedia({audio: true})
            .then(function(stream) {
                createMediaRecorder(stream);
            })
            .catch(function(err) {
                console.log('The following getUserMedia error occured: ' + err);
            });
    } else {
        console.log('getUserMedia not supported on your browser!');
    }

    function createMediaRecorder(s) {
        mediaRecorder = new MediaRecorder(s);

        mediaRecorder.ondataavailable = function(e) {
            buzzerChunks.push(e.data);
        }

        mediaRecorder.onstop = function(e) {
            buzzerBlob = new Blob(buzzerChunks, { 'type' : 'audio/ogg; codecs=opus' });
            var audioURL = window.URL.createObjectURL(buzzerBlob);
            $('#aBuzzer')[0].src = audioURL;
        }
    }

    $('#bRecord').on('click', function () {
        if (recording) {
            mediaRecorder.stop();
            recording = false;
            $(this).addClass('is-success').removeClass('is-error').text("Record");
            return;
        }
        recording = true;
        mediaRecorder.start();
        buzzerChunks = [];
        $(this).removeClass('is-success').addClass('is-error').text("Stop");
    });

    //  _____                      _
    // |_   _|                    | |
    //   | | ___  __ _ _ __ ___   | |     ___   __ _  ___
    //   | |/ _ \/ _` | '_ ` _ \  | |    / _ \ / _` |/ _ \
    //   | |  __/ (_| | | | | | | | |___| (_) | (_| | (_) |
    //   \_/\___|\__,_|_| |_| |_| \_____/\___/ \__, |\___/
    //                                          __/ |
    //                                         |___/
    var tl_canvasId  = 'team_logo',
        tl_canvas    = document.getElementById(tl_canvasId),
        tl_canvasCtx = tl_canvas.getContext("2d"),
        tl_canvasW   = tl_canvas.width,
        tl_canvasH   = tl_canvas.height;

    var px = 0, py = 0, cx = 0, cy = 0, penDown = false, colour = "#000", penSize = 5.0;

    $(tl_canvas).on('touchstart touchend touchmove', function(e) {
        px = cx;
        py = cy;

        switch (e.type) {
            case 'touchstart':
                    var touch = e.originalEvent.touches[0],
                        rect  = tl_canvas.getBoundingClientRect();
                    cx = touch.clientX - rect.left;
                    cy = touch.clientY - rect.top;
                penDown = true;
                break;

            case 'touchend':
                penDown = false;
                break;

            case 'touchmove':
                if (penDown) {
                    var touch = e.originalEvent.touches[0],
                        rect  = tl_canvas.getBoundingClientRect();
                    cx = touch.clientX - rect.left;
                    cy = touch.clientY - rect.top;

                    tl_canvasCtx.beginPath();
                        tl_canvasCtx.moveTo(px, py);
                        tl_canvasCtx.lineTo(cx, cy);
                        tl_canvasCtx.strokeStyle = colour;
                        tl_canvasCtx.lineWidth = penSize;
                        tl_canvasCtx.stroke();
                    tl_canvasCtx.closePath();
                }
                break;
        }
    });

    $('.team_logo .canvas_clear').on('click', function() {
        tl_canvasCtx.clearRect(0, 0, tl_canvasW, tl_canvasH);
    });

    $('.team_logo .canvas_fill').on('click', function() {
        tl_canvasCtx.fillStyle = colour;
        tl_canvasCtx.fillRect(0, 0, tl_canvasW, tl_canvasH);
        tl_canvasCtx.fillStyle = '#fff';
    });

    $('.team_logo button[data-colour]').on('click', function() {
        colour = $(this).data('colour');
    });

    $('.team_logo input[name=pen_size]').on('change', function() {
        penSize = $(this).val();
    });

    //  _____                       ___             _
    // |_   _|                     / _ \           | |
    //   | | ___  __ _ _ __ ___   / /_\ \_   ____ _| |_ __ _ _ __
    //   | |/ _ \/ _` | '_ ` _ \  |  _  \ \ / / _` | __/ _` | '__|
    //   | |  __/ (_| | | | | | | | | | |\ V / (_| | || (_| | |
    //   \_/\___|\__,_|_| |_| |_| \_| |_/ \_/ \__,_|\__\__,_|_|
    //
    let avatar_camera_button = document.querySelector("#avatar-start-camera"),
        avatar_video = document.querySelector("#avatar-video"),
        avatar_capture_button = document.querySelector("#avatar-capture"),
        avatar_canvas = document.querySelector("#avatar"),
        avatar_canvasCtx = avatar_canvas.getContext('2d');

    avatar_camera_button.addEventListener('click', async function() {
        avatar_video.style.display = 'block';
        let stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 512, height: 512 },
            audio: false
        });
        avatar_video.srcObject = stream;
        avatar_canvas.style.display = 'none';
        avatar_camera_button.style.display = 'none';
        avatar_capture_button.style.display = 'block';
    });

    avatar_capture_button.addEventListener('click', function() {
        avatar_canvas.style.display = 'block';
        avatar_canvasCtx.drawImage(
            avatar_video,
            0,
            0,
            avatar_canvas.width,
            avatar_canvas.height
        );

        avatar_video.style.display = 'none';
        avatar_camera_button.style.display = 'block';
        avatar_capture_button.style.display = 'none';
    });

    // ______ _      _   _
    // | ___ (_)    | | (_)
    // | |_/ /_  ___| |_ _  ___  _ __   __ _ _ __ _   _
    // |  __/| |/ __| __| |/ _ \| '_ \ / _` | '__| | | |
    // | |   | | (__| |_| | (_) | | | | (_| | |  | |_| |
    // \_|   |_|\___|\__|_|\___/|_| |_|\__,_|_|   \__, |
    //                                             __/ |
    //                                            |___/
    var p_canvasId  = 'p_canvas',
        p_canvas    = document.getElementById(p_canvasId),
        p_canvasCtx = p_canvas.getContext("2d"),
        p_canvasW   = p_canvas.width,
        p_canvasH   = p_canvas.height;

    function sendPen(x1, y1, x2, y2, c, s) {
        socket.emit('pictionary pen', {
            'x1': x1,
            'y1': y1,
            'x2': x2,
            'y2': y2,
            'c':  c,
            's':  s
        });
    }
    function sendClear() {
        socket.emit('pictionary clear');
    }
    function sendFill(c) {
        socket.emit('pictionary fill', {'c': c});
    }

    $(p_canvas).on('touchstart touchend touchmove', function(e) {
        px = cx;
        py = cy;

        switch (e.type) {
            case 'touchstart':
                    var touch = e.originalEvent.touches[0],
                        rect  = p_canvas.getBoundingClientRect();
                    cx = touch.clientX - rect.left;
                    cy = touch.clientY - rect.top;
                penDown = true;
                break;

            case 'touchend':
                penDown = false;
                break;

            case 'touchmove':
                if (penDown) {
                    var touch = e.originalEvent.touches[0],
                        rect  = p_canvas.getBoundingClientRect();
                    cx = touch.clientX - rect.left;
                    cy = touch.clientY - rect.top;

                    p_canvasCtx.beginPath();
                        p_canvasCtx.moveTo(px, py);
                        p_canvasCtx.lineTo(cx, cy);
                        p_canvasCtx.strokeStyle = colour;
                        p_canvasCtx.lineWidth = penSize;
                        p_canvasCtx.stroke();
                    p_canvasCtx.closePath();

                    sendPen(px, py, cx, cy, colour, penSize);
                }
                break;
        }
    });

    $('#pictionary .canvas_clear').on('click', function() {
        p_canvasCtx.clearRect(0, 0, p_canvasW, p_canvasH);
        sendClear();
    });

    $('#pictionary .canvas_fill').on('click', function() {
        p_canvasCtx.fillStyle = colour;
        p_canvasCtx.fillRect(0, 0, p_canvasW, p_canvasH);
        p_canvasCtx.fillStyle = '#fff';
        sendFill(colour);
    });

    $('#pictionary button[data-colour]').on('click', function() {
        colour = $(this).data('colour');
    });

    $('#pictionary input[name=p_pen_size]').on('change', function() {
        penSize = $(this).val();
    });

    socket
    .on('pictionary init', function (qs) {
        pictionary_questions = qs;
        $('section').hide();
        $('#buttons').hide();
        $('#pictionary_guide').show();
        colour = "#000";
        penSize = 5.0;
        p_canvasCtx.clearRect(0, 0, p_canvasW, p_canvasH);
        $('#menu').hide();
    })
    .on('pictionary active', function (qid) {
        $('#pictionary .p_title').html("Draw - " + pictionary_questions[qid]);
        p_canvasCtx.clearRect(0, 0, p_canvasW, p_canvasH);
    })
    .on('pictionary start', function () {
        $('#pictionary_guide').hide();
        $('#pictionary').show();
        $('#pictionary .p_title').html("Draw - " + pictionary_questions[0]);
        p_canvasCtx.clearRect(0, 0, p_canvasW, p_canvasH);
    });

    //  _____             _        _       _____ _      _       _      ______ _     _
    // /  ___|           | |      ( )     /  ___| |    (_)     | |     | ___ (_)   | |
    // \ `--.  __ _ _ __ | |_ __ _|/ ___  \ `--.| | ___ _  __ _| |__   | |_/ /_  __| | ___
    //  `--. \/ _` | '_ \| __/ _` | / __|  `--. \ |/ _ \ |/ _` | '_ \  |    /| |/ _` |/ _ \
    // /\__/ / (_| | | | | || (_| | \__ \ /\__/ / |  __/ | (_| | | | | | |\ \| | (_| |  __/
    // \____/ \__,_|_| |_|\__\__,_| |___/ \____/|_|\___|_|\__, |_| |_| \_| \_|_|\__,_|\___|
    //                                                     __/ |
    //                                                    |___/
    socket
    .on('santassleighride init', function () {
        $('section').hide();
        $('#santassleighride').show();
        $('#buttons').hide();
        $('#ssr-help').show();
        $('#ssr-q').hide();
        $('#menu').hide();
    })
    .on('santassleighride active', function (question, isLeader) {
        $('section').hide();
        $('#santassleighride').show();
        $('#buttons').hide();
        $('#ssr-help').hide();
        $('#menu').hide();

        $('#ssr-q .ssr-question h1').html(question.title);
        var answers = $('#ssr-q .ssr-question ul.ssr-answers');
        answers.empty();

        var qno = 1;
        for (var q in question.answers) {
            answers.append('<li><label><input type="checkbox" class="nes-checkbox" data-aid="' +
                (qno++) + '" value="1">' + q + '</label></li>');
        }

        $('.ssr-answers input').each(function() {
            $(this).removeAttr('disabled');
        });

        var lastQ = $('#ssr-q .ssr-question ul.ssr-answers li:last');
        if (isLeader) {
            $('input', lastQ).attr('disabled', true);
            $('label', lastQ)
                .css('text-decoration', 'line-through')
                .css('color', '#777');
        } else {
            $('label', lastQ)
                .css('text-decoration', 'none')
                .css('color', '#fff');
        }

        $('#ssr-q').show();
    })
    .on('santassleighride getanswers', function () {
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        var answers = [];
        $('.ssr-answers input').each(function () {
            answers[$(this).data('aid')-1] = $(this).prop('checked');
            $(this).attr('disabled', true);
        });
        socket.emit('santassleighride answers', answers);
    })
    .on('santassleighride gameover', function (winner) {
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        $('section').hide();
        $('#buttons').hide();
        $('#ssr-help').hide();
        $('#ssr-q').hide();
        $('#menu').hide();
        $('#santassleighride').show();

        if (winner) {
            $('#ssr-winner').show();
        } else {
            $('#ssr-loser').show();
        }
    });
});
