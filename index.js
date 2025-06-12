const http = require('http');
const { singleFrame, spectacle, testColors} = require('./controllers/stripControllerImproved.js');

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
        case '/testColors':
          testColors(req, res);
          break;
        default:
          notFound(res);
          break;
      }
      break;
    case 'GET':
      switch (req.url) {
        case '/':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <h1>WS2801 LED Controller</h1>
            <p>Endpoints disponibles:</p>
            <ul>
              <li>POST /singleFrame - Renderizar un frame</li>
              <li>POST /spectacle - Renderizar espectáculo</li>
              <li>POST /testColors - Probar colores básicos</li>
            </ul>
          `);
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
