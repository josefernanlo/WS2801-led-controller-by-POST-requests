const { getPostData } = require('../utils')

// @desc    rendes one frame
// @route   POST /singleFrame
async function singleFrame(req, res) {
    try {
        const body = await getPostData(req)
        const { array } = JSON.parse(body)
        console.log(array)
      

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



module.exports = {
    singleFrame,
    spectacle
}