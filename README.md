# Quizbot

Note: this thing was cobbled together in a rush without much planning, so beware of dragons! This all needs a serious re-factor and clean up, the CSS hackery is just plain embarrassing :P

# External Libs
https://bcrikko.github.io/NES.css
https://github.com/daneden/animate.css

# SSL (ish)
```
openssl req -x509 -newkey rsa:2048 -keyout keys/keytmp.pem -out keys/cert.pem -days 365
openssl rsa -in keys/keytmp.pem -out key/skey.pem
```

# Ideas
* Define an assets package on server to pass to server.
* Pass question information to contestants.
* Allow all contestants to answer the questions via text input then choose the winner(s) once everyone has answered.
    - Tie breaker mode.
    - Punishment mode for any wrong answers.
* Pipe all dashboard audio through - DynamicsCompressorNode.
* fft visualiser for playing audio on audio questions.
* Nat punchthrough / stun
* Quizmaster can set up the questions from the interface.
* Proper round system.
* Audience players to vote on best answers.
* Better dashboard UI ;)
