const { getPostData, timer } = require('../utils')
const leds = require("rpi-ws2801");
const numberOfLeds = 850;
const color = require('onecolor');

leds.connect(numberOfLeds);

let gamma = [];
for (let i = 0; i < 256; i++) {
    gamma[i] = Math.pow(parseFloat(i) / 255.0, 2.5) * 255.0;
}

writeColor(color('black'));

// @desc    rendes one frame
// @route   POST /singleFrame
async function singleFrame(req, res) {
    try {
        const body = await getPostData(req)
        const { array : arr } = JSON.parse(body)
        leds.clear();
        arr.map(led => {
            leds.setColor(led.index, [led.r, led.g, led.b])                        // Color of led (Red Green Blue)
            leds.setChannelPower(led.index, parseInt(led.brightness)/100);     // Brightness of R channel.
            leds.setChannelPower(led.index + 1, parseInt(led.brightness)/100); // Brightness of G channel.
            leds.setChannelPower(led.index + 2, parseInt(led.brightness)/100); // Brightness of B channel.
        
        });
        leds.update();

        res.writeHead(201, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({'render': true}))  

    } catch (error) {
        console.log(error)
    }
}

// @desc    rendes entire spectacle
// @route   POST /spectacle
async function spectacle(req, res) {
    try {
        leds.clear();
        const body = await getPostData(req);
        const { array : arr } = JSON.parse(body);
        arr.map( async (frame) => {
            leds.clear();
            frame.map( led => {
                leds.setColor(led.index, [led.r, led.g, led.b])                    // Color of led (Red Green Blue)
                leds.setChannelPower(led.index, parseInt(led.brightness)/100);     // Brightness of R channel.
                leds.setChannelPower(led.index + 1, parseInt(led.brightness)/100); // Brightness of G channel.
                leds.setChannelPower(led.index + 2, parseInt(led.brightness)/100); // Brightness of B channel.
            })
            leds.update();
            await timer(16.66666667) // 60fps / 1000 ms => 16.6666667 ms/frame
            return true;
        });

        res.writeHead(201, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({'render': true}))  

    } catch (error) {
        console.log(error)
    }
}

function writeColor(newColor) {
    var r = gamma[Math.trunc(newColor.red()   * 255)];
    var g = gamma[Math.trunc(newColor.green() * 255)];
    var b = gamma[Math.trunc(newColor.blue()  * 255)];

    leds.fill(r, g, b);
}


module.exports = {
    singleFrame,
    spectacle
}