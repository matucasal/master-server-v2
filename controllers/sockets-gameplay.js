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
        var round = {"category" : gameData.categoria, "users": gameData.users, "questionID" : '', "answer_ok": '' , "userWon" : '', "bets":[]}
        gameData.rounds = [];
        gameData.rounds.push(round);
        var users = gameData.users;
        users = Object.assign({}, ...users.map(user => ({[user.socketID]: user})));
        gameData.users = users;
        gamesPlaying[gameData.id] = gameData;
        
    }
}

/**
 * @param {{value: number , roomID: string, userID: string}} data
 */
function userBet(data){
    var socket = this;
    //Le resto al user la cantidad de libros que aposto
    //gamesPlaying[data.roomID].users[socket.id].books = gamesPlaying[data.roomID].users[socket.id].books - data.value;
    
    let bet = {"socketID": socket.id, "bet": data.value, "userID": data.userID}
    gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].bets.push(bet);
    
    //Enviar cuanto aposto el user y quien sigue
    

    //Se envía la pregunta cuanto los users ya hayan apostado
    if (gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].bets.length == 4) {
        socket.to(data.roomID).emit('newBet', JSON.stringify({"apuesta" : data.value, "next": null}));
        Question.aggregate().sample(1).exec( function (err, result){
            let question = {"id": result[0]._id, "question": result[0].question, "option_1": result[0].option_1, "option_2": result[0].option_2, "option_3": result[0].option_3 };
            io.sockets.in(data.roomID).emit('question', JSON.stringify(question));
            gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].questionID = result.id;
            gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answer_ok = result.answer_ok;
        })
    }else{
        //Busco quien es el siguiente en el turno.
        let nextIndex = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users.findIndex(x => x.socketID === socket.id) + 1;
        let nextId =  gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users[nextIndex].userID;
        socket.to(data.roomID).emit('newBet', JSON.stringify({"apuesta" : data.value, "next": nextId}));
    }
    


    
};

/**
 * @param {{answer: String , roomID: string, timeResponse: Number, userID: string}} data
 */
function userAnswer(data){
    var socket = this;
    gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answers = [];
    let result;
    let answerSelected = {"socketID": socket.id, "answer": data.value, "timeResponse": data.timeResponse}
    gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answers.push(answerSelected);
    
    if (gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answers.length == 4) {
        //Opcion correcta
        let res_ok = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answer_ok;
        let winner;
        //verificar quien ganó, emitir respuesta y recalcular libros para cada user.
        for (let index = 0; index < gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answers.length; index++) {
            const element = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answers[index];
            if (element.answer == res_ok) {
                if (winner == null) {
                    winner = element;
                }else{
                    if (element.timeResponse < winner.timeResponse) {
                        winner = element;
                    }
                }
            }
        }

        //Se calculan los libros
        let userWinner = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].bets.filter(function (element){ return element.socketID == winner.socketID });
        let price = userWinner.bet;
        let result = gamesPlaying[data.roomID].users[userWinner.socketID].userID;
        let usersLost = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].bets.filter(function (element){ return element.socketID != winner.socketID });
        
        //Se envia el resultado
        io.socket.in(data.roomID).emit('roundResult', {'userID' : result});

        //Se le suman libros al user que gano
        gamesPlaying[data.roomID].users[userWinner.socketID].books = (gamesPlaying[data.roomID].users[userWinner.socketID].books + price) + (price * (gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users.length - 1));
        
        //Se le restan los libros a los que perdieron
        usersLost.forEach(element => {
            //Hacer esto siempre y cuando no se reste del lado server al momento que apostó un user
            gamesPlaying[data.roomID].users[element.socketID].books = gamesPlaying[data.roomID].users[element.socketID].books - price;
            if (gamesPlaying[data.roomID].users[element.socketID].books <= 0){
                //Game over para el player
                //Hay que quitarlo de la room
                delete gamesPlaying[data.roomID].users[element.socketID];
            }
        });

        let newRound = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1];
        newRound.category = "Deportes";
        newRound.questionID = "";
        newRound.res_ok = "";
        newRound.userWon ="";
        newRound.bets = [];
        newRound.answers = []; 
        newRound.users = gamesPlaying[data.roomID].users;
        gamesPlaying[data.roomID].rounds.push(newRound);        
    
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

    gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users = gamesPlaying[data.roomID].round[gamesPlaying[data.roomID].round.length -1].usersfilter(function (element){ return element.socketID != socket.id });
    //remover el usuario que no juega la ronda
    console.log(gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users)
};