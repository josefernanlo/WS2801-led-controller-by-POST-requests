const http = require('http');
const { singleFrame, spectacle} = require('./controllers/stripController.js');

const server = http.createServer((req, res) => {
  switch (req.method) {
    case 'POST':
      switch (req.url) {
        case '/singleFrame':
          singleFrame(req, res);
          break;
        case '/spectacle':
          spectacle(req, res);
          break;
        default:
          notFound(res);
          break;
      }
      break;
    default:
      notFound(res);
      break;
  }
});

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        message: 'Route Not Found',
      })
    );
}

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = server;
