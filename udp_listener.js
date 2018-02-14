const dgram = require('dgram');
const client = dgram.createSocket('udp4');
const mbedIpAddress = '192.168.4.1';
const mbedPort = 8042;

function send(message) {
    const buf = Buffer.from(message);

    client.send(buf, mbedPort, mbedIpAddress, (err) => {
        if (err) {
            console.error(err);
        }
    });
}

client.on('message', (msg, rinfo) => {
    //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);

    //const type = msg.toString('ascii', 1, 4);

    //console.log(message);
    //console.log(msg);

    //if (msg[1] === 0x74 && msg[2] === 0x66 && msg[3] === 0x6d) {
    if (msg.toString('ascii', 1, 4) === 'tfm') {
        console.log(msg.readUInt16LE(7));
    }

    /*const ballPattern = /<ball:(\d):(\d)>/;

    const match = ballPattern.exec(message);

    //console.log(match);

    if (Array.isArray(match) && match.length === 3) {
        const value1 = match[2];
        const value2 = match[1];

        prevBallValue = ballValue;
        ballValue = value1 === '1';
        prevBall2Value = ball2Value;
        ball2Value = value2 === '1';

        handleBallValueChanged();
    }*/
});

send('fs:1');
