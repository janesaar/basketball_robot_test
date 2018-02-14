var throwerSpeedInput = document.querySelector('#thrower-speed');
var sendThrowerSpeedButton = document.querySelector('#send-thrower-speed');
var throwerSpeedInput2 = document.querySelector('#thrower-speed2');
var throwerSpeedInput3 = document.querySelector('#thrower-speed3');
var sendThrowerSpeedButton2 = document.querySelector('#send-thrower-speed2');
var sendThrowerSpeedButton3 = document.querySelector('#send-thrower-speed3');
var stopThrowerButton = document.querySelector('#stop-thrower');
var failsafeCheckbox = document.querySelector('#failsafe');

var params = {
    throwerSpeed1: '0',
    throwerSpeed2: '0',
    throwerSpeed3: '0'
};

throwerSpeedInput.addEventListener('keyup', function () {
    params.throwerSpeed1 = throwerSpeedInput.value;
    saveParams();
});

throwerSpeedInput2.addEventListener('keyup', function () {
    params.throwerSpeed2 = throwerSpeedInput2.value;
    saveParams();
});

throwerSpeedInput3.addEventListener('keyup', function () {
    params.throwerSpeed3 = throwerSpeedInput3.value;
    saveParams();
});

sendThrowerSpeedButton.addEventListener('click', function () {
    sendCommand('speeds:0:0:0:0:' + throwerSpeedInput.value);
});

sendThrowerSpeedButton2.addEventListener('click', function () {
    sendCommand('speeds:0:0:0:0:' + throwerSpeedInput2.value);
});

sendThrowerSpeedButton3.addEventListener('click', function () {
    sendCommand('speeds:0:0:0:0:' + throwerSpeedInput3.value);
});

failsafeCheckbox.addEventListener('click', function () {
    sendCommand('fs:' + (failsafeCheckbox.checked ? 1 : 0));
});

stopThrowerButton.addEventListener('click', function () {
    sendCommand('speeds:0:0:0:0:0');
});

function sendCommand(command) {
    var payload = {
        command: command
    };

    fetch("/command",
        {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json'
            }
        });
}

function saveParams() {
    localStorage.setItem('params', JSON.stringify(params));
}

function loadParams() {
    var paramsJson = localStorage.getItem('params');

    try {
        var loadedParams = JSON.parse(paramsJson);
        var key;

        if (loadedParams) {
            for (key in loadedParams) {
                params[key] = loadedParams[key];
            }
        }
    } catch(error) {
        console.log(error);
    }

    throwerSpeedInput.value = params.throwerSpeed1;
    throwerSpeedInput2.value = params.throwerSpeed2;
}

loadParams();