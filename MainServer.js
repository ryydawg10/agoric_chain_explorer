const http = require('http');
const handleRequest = require('./Routes');

const port = 3000;

const server = http.createServer((req, res) => {
    handleRequest(req, res);
});

server.listen(port, () => {});
