const uniqid = require('uniqid');
const Question = require('../models/question')
var gameRooms = [];
var gamesPlaying = {};
const userList = [];
const usersCount = 0;
var io;
//Se crean las primeras rooms
gameRooms.push({'id': uniqid(), 'books':100, 'level': 'Neofito', 'max': 4, 'inside': 0, 'users':[]});
gameRooms.push({'id': uniqid(), 'books':100, 'level': 'Virtuoso', 'max': 4, 'inside': 0, 'users':[]});
gameRooms.push({'id': uniqid(), 'books':100, 'level': 'Serafin', 'max': 4, 'inside': 0, 'users':[]});

exports = module.exports = function (ios) {
    io = ios;
    io.on('connection', function(socket){

        socket.on('newUser', newUser);
        socket.on('join', join);
        socket.on('userBet', userBet);
        socket.on('userPass', userPass)
        socket.on('finishBet', finishBet);
        socket.on('userAnswer', userAnswer)

        socket.on('disconnect',function(){
            userList.splice(userList.indexOf(socket.id), 1);
            console.log("User disconnected. Total online: ", userList.length);
        });
    
    })

};

/**
 * @param {{level: string, userID: string, user: string}} data 
 */
newUser = function(data){
    var socket = this;
    console.log("Usuario conectado: " + JSON.stringify(data));
            console.log(data);
            console.log(data.userID);
            //Busco la partida segun el level
            var index = gameRooms.findIndex(x => x.level === data.level);
            socket.emit("Welcome", JSON.stringify(gameRooms[index]));
            userList.push({'name':data.user, 'socketID':socket.id, 'turn': 0, 'userID': data.userID});
            console.log("User connected. Total online: " + userList.length);
}

/**
 * @param {string} data Es el ID de la room
 */
join = function(data){
    var socket = this;
    if(socket.adapter.rooms[data] != null){
        io.sockets.in(data).emit('newPlayerJoinned', JSON.stringify(userList.filter(function (element ){
            return element.socketID == socket.id
        })));
        var index = gameRooms.findIndex(x => x.id === data);
        socket.emit('usersInGame', JSON.stringify(gameRooms[index]));
        socket.join(data);
        var x = userList.filter(function (element ){
                return element.socketID == socket.id
            });
        x[0].books = gameRooms[index].books;
        x[0].turn = gameRooms[index].inside + 1;
        gameRooms[index].inside = gameRooms[index].inside + 1;
        gameRooms[index].users.push(x[0]);
        
    }else{
        socket.join(data);
        var index = gameRooms.findIndex(x => x.id === data);
        var x = userList.filter(function (element ){
                return element.socketID == socket.id
            });
        x[0].turn = 1;
        x[0].books = gameRooms[index].books;
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
        gameData.categoria = "Ciencia";
        io.sockets.in(data).emit('beginNewGame', JSON.stringify(gameData));
        var round = {"categogia" : gameData.categoria, "users": gameData.users, "questionID" : '', "answer_ok": '' , "userWon" : '', "bets":[]}
        gameData.round = [];
        gameData.round.push(round);
        var users = gameData.users;
        users = Object.assign({}, ...users.map(user => ({[user.socketID]: user})));
        gameData.users = users;
        gamesPlaying[gameData.id] = gameData;
        
    }
}

/**
 * @param {{value: number , roomID: string}} data
 */
function userBet(data){
    
    var socket = this;
    //Le resto al user la cantidad de libros que aposto
    gamesPlaying[data.roomID].users[socket.id].books = gamesPlaying[data.roomID].users[socket.id].books - data.value;
    let bet = {"socketID": socket.id, "bet": data.value, "userID": data.userID}
    gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].bets.push(bet);
    //Busco quien es el siguiente en el turno.
    let nextIndex = gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].users.findIndex(x => x.socketID === socket.id) + 1;
    let nextId =  gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].users[nextIndex].userID;
    //Enviar cuanto aposto el user y quien sigue
    
    //Se envía la pregunta cuanto los users ya hayan apostado
    if (gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].bets.length == 4) {
        socket.to(data.roomID).emit('newBet', JSON.stringify({"apuesta" : data.value, "next": null}));
        Question.aggregate().sample(1).exec( function (err, result){
            let question = {"id": result.id, "question": result.question, "option_1": result.option_1, "option_2": result.option_2, "option_3": result.option_3 };
            io.sockets.in(data.roomID).emit('question', JSON.stringify(question));
            gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].questionID = result.id;
            gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].answer_ok = result.answer_ok;
            console.log(result)
        })
    }else{
        socket.to(data.roomID).emit('newBet', JSON.stringify({"apuesta" : data.value, "next": nextId}));
    }
    
};

/**
 * @param {{answer: String , roomID: string, timeResponse: Number}} data
 */
function userAnswer(data){
    var socket = this;
    let answerSelected = {"socketID": socket.id, "answer": data.value}
    gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].aswers.push(let);
    if (gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].aswers.length == 4) {
        //verificar quien ganó, emitir respuesta y recalcular libros para cada user.
    
    }
}

/** 
 * @param data Contiene el ID del room
 */
function finishBet(data){
    //Enviar la pregunta a los usuarios
    Question.aggregate().sample(1).exec( function (err, result){
        io.sockets.in(data).emit('question', JSON.stringify(result));
        console.log(result)
    })

};

/** 
 * @param data Contiene el ID del room
 */
function userPass(data){
    var socket = this;

    gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].users = gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].usersfilter(function (element){ return element.socketID != socket.id });
    //remover el usuario que no juega la ronda
    console.log(gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].users)
};

