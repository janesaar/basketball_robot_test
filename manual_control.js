const dgram = require('dgram');
const client = dgram.createSocket('udp4');
const mbedIpAddress = '192.168.4.1';
const mbedPort = 8042;

const steam = require('./steam-controller');
const controller = new steam.SteamController();

controller.connect();

const states = {
    IDLE: 'IDLE',
    GRAB_BALL: 'GRAB_BALL',
    HOLD_BALL: 'HOLD_BALL',
    EJECT_BALL: 'EJECT_BALL',
    THROW_BALL: 'THROW_BALL'
};

let state = states.IDLE;
let ballValue = false;
let ball2Value = false;
let prevBallValue = false;
let prevBall2Value = false;
let holdBallTimeout = null;
let startTimeEject = Date.now();
let speedSendInterval;

let ySpeed = 0;
let xSpeed = 0;
let rotation = 0;
let throwerSpeed = 0;

let defaultMaxSpeed = 1.0;
let maxSpeed = defaultMaxSpeed;
let defaultMaxRotation = 1.0;
let maxRotation = defaultMaxRotation;

let prevButtons = {};

let robotConfig = {
    robotRadius: 0.14,
    wheelRadius: 0.035,
    wheelFromCenter: 0.117,
    wheel1Angle: -135,
    wheel2Angle: 135,
    wheel3Angle: -45,
    wheel4Angle: 45,
    wheel1AxisAngle: 135,
    wheel2AxisAngle: 45,
    wheel3AxisAngle: -135,
    wheel4AxisAngle: -45,
    metricToRobot: 1,
    throwerSpeed: 3000
};

robotConfig.metricToRobot = 225 / (robotConfig.wheelRadius * 2 * Math.PI);

let wheel1Speed = 0,
    wheel2Speed = 0,
    wheel3Speed = 0,
    wheel4Speed = 0,
    dribblerSpeed = 0;

function clone(obj) {
    let cloned = {};

    for (key in obj) {
        cloned[key] = obj[key];
    }

    return cloned;
}

function send(message) {
    const buf = Buffer.from(message);

    client.send(buf, mbedPort, mbedIpAddress, (err) => {
        if (err) {
            console.error(err);
        }
    });
}

controller.on('data', (data) => {
    //console.log(data.button, data.bottom);

    if (!prevButtons.A && data.button.A) {
        console.log('A');
        maxSpeed = defaultMaxSpeed;
        maxRotation = defaultMaxRotation;
        console.log(maxSpeed);
    }

    if (!prevButtons.X && data.button.X) {
        console.log('X');
        maxSpeed /= 2;
        maxRotation /= 2;
        console.log(maxSpeed);
    }

    if (!prevButtons.Y && data.button.Y) {
        console.log('Y');
        maxSpeed *= 2;
        maxRotation *= 2;
        console.log(maxSpeed);
    }

    if (!prevButtons.LB && data.button.LB) {
        console.log('LB');

        if (state === states.IDLE) {
            state = states.GRAB_BALL;
        }
        else if (state === states.HOLD_BALL) {
            state = states.EJECT_BALL;
            startTimeEject = Date.now();
        }
    }

    if (!prevButtons.RB && data.button.RB) {
        console.log('RB');

        if (state === states.IDLE || state === states.GRAB_BALL) {
            state = states.THROW_BALL;
        } else if (state === states.THROW_BALL) {
            state = states.IDLE;
        }
    }

    prevButtons = clone(data.button);

    xSpeed = data.mouse.x / 32768 * maxSpeed;
    ySpeed = data.mouse.y / 32768 * maxSpeed;

    rotation = data.joystick.x / 32768 * maxRotation;

    //console.log(data);
});

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
            state = states.IDLE;
        }
    }
    else if (state === states.THROW_BALL) {
        if (prevBallValue && !ballValue) {
            state = states.IDLE;
        }
    }
    else if (state === states.GRAB_BALL) {
        if (!prevBallValue && ballValue) {
            state = states.HOLD_BALL;
        }
    }
    /*else if (state === states.HOLD_BALL) {
        if (holdBallTimeout === null) {
            holdBallTimeout = setTimeout(() => {
                startTimeEject = Date.now();
                state = states.EJECT_BALL;
                holdBallTimeout = null;
            }, 1000);
        }
    }*/

    console.log(ballValue, ball2Value, state);
}

function drive() {
    var rotationalSpeed = speedMetricToRobot(rotationRadiansToMetersPerSecond(rotation)),
        speed = Math.sqrt(xSpeed * xSpeed + ySpeed * ySpeed),
        angle = Math.atan2(ySpeed, xSpeed),
        wheel1Speed = Math.round(speedMetricToRobot(wheelSpeed(speed, angle, robotConfig.wheel1Angle / 180 * Math.PI)) + rotationalSpeed),
        wheel2Speed = Math.round(speedMetricToRobot(wheelSpeed(speed, angle, robotConfig.wheel2Angle / 180 * Math.PI)) + rotationalSpeed),
        wheel3Speed = Math.round(speedMetricToRobot(wheelSpeed(speed, angle, robotConfig.wheel3Angle / 180 * Math.PI)) + rotationalSpeed),
        wheel4Speed = Math.round(speedMetricToRobot(wheelSpeed(speed, angle, robotConfig.wheel4Angle / 180 * Math.PI)) + rotationalSpeed);

    //console.log(`speeds:${wheel1Speed}:${wheel2Speed}:${wheel3Speed}:${wheel4Speed}:${throwerSpeed}`);
    send(`speeds:${wheel1Speed}:${wheel2Speed}:${wheel3Speed}:${wheel4Speed}:${throwerSpeed}`);
}

function wheelSpeed(robotSpeed, robotAngle, wheelAngle) {
    return robotSpeed * Math.cos(wheelAngle - robotAngle);
}

function speedMetricToRobot(metersPerSecond) {
    return metersPerSecond * robotConfig.metricToRobot;
}

function speedRobotToMetric(wheelSpeed) {
    if (robotConfig.metricToRobot === 0) {
        return 0;
    }

    return wheelSpeed / robotConfig.metricToRobot;
}

function rotationRadiansToMetersPerSecond(radiansPerSecond) {
    return radiansPerSecond * robotConfig.wheelFromCenter;
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
    if (state === states.THROW_BALL) {
        throwerSpeed = -2000;
    }
    else if (state === states.GRAB_BALL) {
        throwerSpeed = -200;
    }
    else if (state === states.HOLD_BALL || state === states.IDLE) {
        throwerSpeed = 0;
    }

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

    drive();
}, 20);
