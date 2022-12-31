const { getPostData } = require('../utils')
const leds = require("rpi-ws2801");
const numberOfLeds = 800;
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
        console.log(arr)
        arr.map(e => {
            leds.setColor(e.index, [e.r, e.g, e.b])                        // Color of led (Red Green Blue)
            leds.setChannelPower(e.index, parseInt(e.brightness)/100);     // Brightness of R channel.
            leds.setChannelPower(e.index + 1, parseInt(e.brightness)/100); // Brightness of G channel.
            leds.setChannelPower(e.index + 2, parseInt(e.brightness)/100); // Brightness of B channel.
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
        const body = await getPostData(req)
        const { array } = JSON.parse(body)
    

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