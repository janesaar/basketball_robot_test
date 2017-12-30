const dgram = require('dgram');
const client = dgram.createSocket('udp4');
const mbedIpAddress = '192.168.4.1';
const mbedPort = 8042;

const states = {
    GRAB_BALL: 'GRAB_BALL',
    HOLD_BALL: 'HOLD_BALL',
    EJECT_BALL: 'EJECT_BALL',
    THROW_BALL: 'THROW_BALL'
};

let state = states.GRAB_BALL;
let ballValue = false;
let ball2Value = false;
let prevBallValue = false;
let prevBall2Value = false;
let holdBallTimeout = null;
let startTimeEject = Date.now();
let speedSendInterval;
let throwerSpeed = 0;

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

    const message = msg.toString();

    const ballPattern = /<ball:(\d):(\d)>/;

    const match = ballPattern.exec(message);

    //console.log(match);

    if (Array.isArray(match) && match.length === 3) {
        const value1 = match[1];
        const value2 = match[2];

        prevBallValue = ballValue;
        ballValue = value1 === '1';
        prevBall2Value = ball2Value;
        ball2Value = value2 === '1';

        handleBallValueChanged();
    }
});

function handleBallValueChanged() {
    if (state === states.EJECT_BALL) {
        if (prevBall2Value && !ball2Value) {
            state = states.THROW_BALL;
        }
    }
    else if (state === states.THROW_BALL) {
        if (prevBallValue && !ballValue) {
            state = states.GRAB_BALL;
        }
    }
    else if (state === states.GRAB_BALL) {
        if (!prevBallValue && ballValue) {
            state = states.HOLD_BALL;
        }
    }
    else if (state === states.HOLD_BALL) {
        if (holdBallTimeout === null) {
            holdBallTimeout = setTimeout(() => {
                startTimeEject = Date.now();
                state = states.EJECT_BALL;
                holdBallTimeout = null;
            }, 1000);
        }
    }

    console.log(ballValue, ball2Value, state);

    if (state === states.THROW_BALL) {
        throwerSpeed = -2000;
    }
    else if (state === states.GRAB_BALL) {
        throwerSpeed = -200;
    }
    else if (state === states.HOLD_BALL) {
        throwerSpeed = 0;
    }
}

send('fs:0');

function exitHandler(options, err) {
    console.log('exitHandler', options);

    clearInterval(speedSendInterval);
    send('speeds:0:0:0:0:0');

    if (err) console.log(err.stack);
    if (options.exit) {
        setTimeout(() => {
            process.exit();
        }, 1000);
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

speedSendInterval = setInterval(() => {
    if (state === states.EJECT_BALL) {
        let currentTime = Date.now();
        let timeDiff = currentTime - startTimeEject;
        let speed = 200 - timeDiff * 0.235;

        if (speed < 10){
            speed = 10;
        }

        //console.log('spd', speed);
        throwerSpeed = speed;
    }

    send('speeds:0:0:0:0:' + throwerSpeed);
}, 20);
