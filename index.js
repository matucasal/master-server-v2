const app = require('./app');
const socket = require('socket.io')({
    transports: ['websocket']
  });
const socketEvents = require('./controllers/sockets-gameplay');
const logger = require('./configuration/logger')(__filename);

// Start the server
const port = process.env.PORT || 8000;
var server = app.listen(port);
console.log(`Server listening at ${port}`);
logger.info(`Server listening and running at ${port}`);
const io = socket.attach(server);
socketEvents(io);






