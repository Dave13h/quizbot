# Quizbot

# External Libs
https://bcrikko.github.io/NES.css
https://github.com/daneden/animate.css

# SSL (ish)
```
openssl req -x509 -newkey rsa:2048 -keyout keys/keytmp.pem -out keys/cert.pem -days 365
openssl rsa -in keys/keytmp.pem -out key/skey.pem
```
