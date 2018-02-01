const dgram = require('dgram');
const client = dgram.createSocket('udp4');
const mbedIpAddress = '192.168.4.1';
const mbedPort = 8042;

const express = require('express');
var bodyParser = require('body-parser');
const app = express();

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(express.urlencoded({
    extended: true
}));

function send(message) {
    const buf = Buffer.from(message);

    client.send(buf, mbedPort, mbedIpAddress, (err) => {
        if (err) {
            console.error(err);
        }
    });
}

app.post('/command', (req, res) => {
    //console.log(req.body);

    const command = req.body.command;

    console.log('command', command);

    send(command);

    res.sendStatus(200);
});

app.listen(3000, () => console.log('Listening on port 3000!'));