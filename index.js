const app = require('./app');
var socket = require('socket.io')({
    transports: ['websocket']
  });
var uniqid = require('uniqid');
const gameplay = require('./gameplay/gameplay');

// Start the server
const port = process.env.PORT || 8000;
var server = app.listen(port);
console.log(`Server listening at ${port}`);

// refactored code for easier test and feature scale

var userList = [];
var usersCount = 0;
var gameRooms = [];


var io = socket.attach(server);
io.sockets.removeAllListeners();

//Se crean las 1eras rooms segun los levels
gameRooms.push({'id': uniqid(), 'level': 'Neofito', 'max': 4, 'inside': 0, 'users':[]});
gameRooms.push({'id': uniqid(), 'level': 'Virtuoso', 'max': 4, 'inside': 0, 'users':[]});
gameRooms.push({'id': uniqid(), 'level': 'Serafin', 'max': 4, 'inside': 0, 'users':[]});


io.on('connection', function(socket){

    socket.on('newUser', function(data){

        console.log("Usuario conectado: " + JSON.stringify(data));
        console.log(data.level);
        //Busco la partida segun el level
        var index = gameRooms.findIndex(x => x.level === data.level);
        
        socket.emit("Welcome", JSON.stringify(gameRooms[index]));
        userList.push({'name':data.user, 'id':socket.id, 'turn': 0, 'books': 1000});
        
        console.log("User connected. Total online: " + userList.length);

    })

    socket.on('join', function(data){
        
        if(socket.adapter.rooms[data] != null){
            io.sockets.in(data).emit('newPlayerJoinned', JSON.stringify(userList.filter(function (element ){
                return element.id == socket.id
            })));
            var index = gameRooms.findIndex(x => x.id === data);
            socket.emit('usersInGame', JSON.stringify(gameRooms[index]));
            socket.join(data);
            var x = userList.filter(function (element ){
                    return element.id == socket.id
                });
            x[0].turn = gameRooms[index].inside + 1;
            gameRooms[index].inside = gameRooms[index].inside + 1;
            gameRooms[index].users.push(x[0]);
            
        }else{
            socket.join(data);
            var index = gameRooms.findIndex(x => x.id === data);
            var x = userList.filter(function (element ){
                    return element.id == socket.id
                });
            x[0].turn = 1;
            gameRooms[index].inside = 1;
            gameRooms[index].users.push(x[0]);

        }
            
        if(socket.adapter.rooms[data].length === 4){
            console.log('Room with id: ' + data + ' is full. Starting game...')
            var index = gameRooms.findIndex(x => x.id === data);
            var gameData = gameRooms[index];
            //Se crea otra room
            gameRooms.push({'id': uniqid(), 'level': gameData.level, 'max': 4, 'inside': 0, 'users':[]});
            //Partida full, se quita de la lista. 
            var x = gameRooms.filter(function (element){ return element.id != data });
            gameRooms = x;
            //Comienza la partida. Enviar quien empieza.
            io.sockets.in(data).emit('beginNewGame', JSON.stringify(gameData));
            gameplay.gameStart(io, socket, data, gameData );
        }
        
    });
    
    socket.on('disconnect',function(){
        userList.splice(userList.indexOf(socket.id), 1);
        console.log("User disconnected. Total online: ", userList.length);
    });

})
