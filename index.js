const app = require('./app');
const socket = require('socket.io')({
    transports: ['websocket']
  });
const socketEvents = require('./controllers/sockets-gameplay');

// Start the server
const port = process.env.PORT || 8000;
var server = app.listen(port);
console.log(`Server listening at ${port}`);

// refactored code for easier test and feature scale

const gameRooms = [];

const io = socket.attach(server);
socketEvents(io);

//Se crean las 1eras rooms segun los levels




