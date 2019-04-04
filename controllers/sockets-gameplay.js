const uniqid = require('uniqid');
const Question = require('../models/question');
const Category = require('../models/category');
const Question_arte = require('../models/question_arte');
const Question_ciencia = require('../models/question_ciencia');
const Question_deportes = require('../models/question_deportes');
const Question_entretenimiento = require('../models/question_entretenimiento');
const Question_geografia = require('../models/question_geografia');
const Question_historia = require('../models/question_historia');
const logger = require('../configuration/logger')(__filename);
const Game = require('../models/game');
const User = require('../controllers/users');

var gameRooms = [];
var gamesPlaying = {};
const userList = [];
const usersCount = 0;
var io;

//logger.emerg("Emergency");
//logger.alert("Alert");
//logger.crit("Critial");
//logger.error("Error");
//logger.warning("Warning");
//logger.notice("Notice");
//logger.info("Info"); 
//logger.debug("debug");

//Traigo las categorias disponibles
var categories = [];
Category.find({}, {
    "_id": 0,
    "categoryName": 1
  }, function(error, res){
    categories = res.map(a => a.categoryName);
})

//Se crean las primeras rooms
gameRooms.push({'id': uniqid(), 'books':100, 'level': 'Neofito', 'max': 4, 'inside': 0, 'users':[]});
gameRooms.push({'id': uniqid(), 'books':100, 'level': 'Virtuoso', 'max': 4, 'inside': 0, 'users':[]});
gameRooms.push({'id': uniqid(), 'books':100, 'level': 'Serafin', 'max': 4, 'inside': 0, 'users':[]});

exports = module.exports = function (ios) {
    io = ios;
    io.on('connection', function(socket){
        logger.info("New connection from" + socket.handshake.address);
        socket.on('newUser', newUser);
        socket.on('join', join);
        socket.on('userBet', userBet);
        socket.on('userAnswer', userAnswer);
        socket.on('disconnecting',function(){
            //Si el user esta en una room, avisar de su desconexión
            if(Object.getOwnPropertyNames(socket.rooms)[1] != undefined){
                io.sockets.to(Object.getOwnPropertyNames(socket.rooms)[1]).emit('userLeft', {"socketID": socket.id})
                if (gamesPlaying.indexOf(Object.getOwnPropertyNames(socket.rooms)[1]) != -1) {
                    delete gamesPlaying[Object.getOwnPropertyNames(socket.rooms)[1]].users[socket.id];
                    delete gamesPlaying[Object.getOwnPropertyNames(socket.rooms)[1]].rounds[gamesPlaying[Object.getOwnPropertyNames(socket.rooms)[1]].rounds.length -1].users[socket.id]
                }
            }
        });
        socket.on('disconnect',function(){
            userList.splice(userList.indexOf(socket.id), 1);
            logger.info("New disconnection from" + socket.handshake.address);
        });
    })

};

/**
 * @param {{level: string, userID: string, user: string}} data 
 */
newUser = function(data){
    var socket = this;
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
        
        logger.info('Room with id: ' + data + ' is full. Starting game...');
        var index = gameRooms.findIndex(x => x.id === data);
        var gameData = gameRooms[index];
        //Se crea otra room
        let id = uniqid();
        gameRooms.push({'id': id, 'books': 100, 'level': gameData.level, 'max': 4, 'inside': 0, 'users':[]});
        logger.info("New room was created. ID: " + id);
        //Partida full, se quita de la lista. 
        var x = gameRooms.filter(function (element){ return element.id != data });
        gameRooms = x;
        //Comienza la partida. Enviar quien empieza.
        gameData.category = categories[Math.floor(Math.random()*categories.length)];
        io.sockets.in(data).emit('beginNewGame', JSON.stringify(gameData));
        saveGame(gameData.id, gameData.users);
        var users = gameData.users;
        users = Object.assign({}, ...users.map(user => ({[user.socketID]: user})));
        gameData.users = [];
        gameData.users = users;
        var round = {"category" : gameData.category, "users": gameData.users, "questionID" : '', "answer_ok": '' , "userWon" : '', "bets":[]}
        gameData.rounds = [];
        gameData.rounds.push(round);
        gameData.rounds[0].answers = [];
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
    
    //Se envía la pregunta cuanto los users ya hayan apostado
    if (gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].bets.length === Object.keys(gamesPlaying[data.roomID].users).length) {
        io.sockets.in(data.roomID).emit('newBet', JSON.stringify({"apuesta" : data.value, "next": null}));
       
        getQuestion(gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].category, 1, function(result){
            if(result){
                let quest = result;
            let question = {"id": quest._id, "question": quest.question, "option_1": quest.option_1, "option_2": quest.option_2, "option_3": quest.option_3 };
            io.sockets.in(data.roomID).emit('question', JSON.stringify(question));
            gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].questionID = quest.id;
            gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answer_ok = quest.answer_ok;
            }else{
                console.log("error question");
            }
            
        })

    }else{
        //Busco quien es el siguiente en el turno.
        let nextTurn;
        let nextId;

        for (const key in  gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users) {
            if (key === socket.id) {
                nextTurn = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users[key].turn + 1
                break;
            }
            //let value =  gameData.users[key];
        }
        for (const key in  gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users) {
            let value =  gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users[key];
            if (value.turn === nextTurn) {
                nextId = value.userID;
                break;
            }
        }
        //let nextIndex = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users.findIndex(x => x.socketID === socket.id) + 1;
        //let nextId =  gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].users[nextIndex].userID;
        io.sockets.in(data.roomID).emit('newBet', JSON.stringify({"apuesta" : data.value, "next": nextId}));
    }
    
};

/**
 * @param {{answer: String , roomID: string, timeResponse: Number, userID: string}} data
 */

function userAnswer(data){
    var socket = this;
    let result;
    let answerSelected = {"socketID": socket.id, "answer": data.answer, "timeResponse": data.timeResponse};
    console.log(answerSelected);
    gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answers.push(answerSelected);
    
    if (gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answers.length === Object.keys(gamesPlaying[data.roomID].users).length) {
        //Opcion correcta
        let res_ok = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answer_ok;
        let winner;
        //verificar quien ganó, emitir respuesta y recalcular libros para cada user.
        for (let index = 0; index < gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answers.length; index++) {
            const element = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].answers[index];
            if (element.answer === res_ok) {
                if (winner === undefined) {
                    winner = element;
                }else{
                    if (element.timeResponse < winner.timeResponse) {
                        winner = element;
                    }
                }
            }
        }
        //Si no hay ganador, entra al IF
        if (winner === undefined) {
            //Reasignar turnos
            //NewRound
            let newRound = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1];
            newRound.category = categories[Math.floor(Math.random()*categories.length)];
            newRound.questionID = "";
            newRound.res_ok = "";
            newRound.userWon ="";
            newRound.bets = [];
            newRound.answers = [];
            newRound.users = changeTurns(gamesPlaying[data.roomID].users);
            //newRound.users = gamesPlaying[data.roomID].users;
            //newRound.users =  Object.keys(gamesPlaying[data.roomID].users).map(key => gamesPlaying[data.roomID].users[key]);
            gamesPlaying[data.roomID].rounds.push(newRound);
            io.sockets.in(data.roomID).emit('newRound', newRound);
            return;
        }

        //Se calculan los libros
        let userWinner = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].bets.filter(function (element){ return element.socketID == winner.socketID });
        let price = Number(userWinner[0].bet);
        let result = gamesPlaying[data.roomID].users[userWinner[0].socketID].userID;
        let usersLost = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1].bets.filter(function (element){ return element.socketID != winner.socketID });
        //Se envia el resultado
        io.sockets.in(data.roomID).emit('roundResult', {'userID' : result});
        console.log("Gano el user: " + result);
        //Se le suman libros al user que gano
        gamesPlaying[data.roomID].users[userWinner[0].socketID].books = Number((gamesPlaying[data.roomID].users[userWinner[0].socketID].books)) + Number((price * (Object.keys(gamesPlaying[data.roomID].users).length -1)));
        //Se le restan los libros a los que perdieron
        usersLost.forEach(element => {
            gamesPlaying[data.roomID].users[element.socketID].books = gamesPlaying[data.roomID].users[element.socketID].books - price;
            if (gamesPlaying[data.roomID].users[element.socketID].books <= 0){
                //Game over para el player
                io.to(element.socketID).emit('gameOver', {'userID' : element.userID});
                //Cerrar conexion socket
                
                //Hay que quitarlo de la room
                delete gamesPlaying[data.roomID].users[element.socketID];
            }
        });

        //Quedan más de 1 player?
        if (Object.keys(gamesPlaying[data.roomID].users).length > 1) {

            let newRound = gamesPlaying[data.roomID].rounds[gamesPlaying[data.roomID].rounds.length -1];
            newRound.category = categories[Math.floor(Math.random()*categories.length)];
            newRound.questionID = "";
            newRound.res_ok = "";
            newRound.userWon ="";
            newRound.bets = [];
            newRound.answers = []; 
            newRound.users = changeTurns(gamesPlaying[data.roomID].users);
            //newRound.users =  Object.keys(gamesPlaying[data.roomID].users).map(key => gamesPlaying[data.roomID].users[key]);
            gamesPlaying[data.roomID].rounds.push(newRound);
            io.sockets.in(data.roomID).emit('newRound', newRound);

        }else{
            //No quedan players, se elimina el room
            //Se debe guardar en la DB antes de eliminar la partida.
            //Se envia aviso a los players que quedan
            io.sockets.in(data.roomID).emit('roomClosed', {'userID' : result});
            logger.info("Game terminated. ID: " + data.roomID);
            gamesPlaying[data.roomID].users[Object.keys(gamesPlaying[data.roomID].users)[0]].books = gamesPlaying[data.roomID].users[Object.keys(gamesPlaying[data.roomID].users)[0]].books - gamesPlaying[data.roomID].books;
            User.updateBooks(gamesPlaying[data.roomID].users[Object.keys(gamesPlaying[data.roomID].users)[0]]);
            gameUpdate(data.roomID, gamesPlaying[data.roomID].users[Object.keys(gamesPlaying[data.roomID].users)[0]],  gamesPlaying[data.roomID].rounds.length);
            delete  gamesPlaying[data.roomID];
        }
    }
}


/**
 * Function to get random question
 * @param category
 * @param level
 *  */
function getQuestion(category, level, callback){
    switch (category) {
        case "Arte":
            Question_arte.aggregate().sample(1).exec(function (err, result){
                callback(result[0]);
            })
            break;
        case "Ciencia":
            Question_ciencia.aggregate().sample(1).exec( function (err, result){
                callback(result[0]);
            })
            break;
        case "Deportes":
            Question_deportes.aggregate().sample(1).exec( function (err, result){
                callback(result[0]);
            })
            break;
        case "Entretenimiento":
            Question_entretenimiento.aggregate().sample(1).exec( function (err, result){
                callback(result[0]);
            })
            break;
        case "Geografia":
            Question_geografia.aggregate().sample(1).exec( function (err, result){
                console.log("Geografia")
                callback(result[0]);
            })
            break;
        case "Historia":
            Question_historia.aggregate().sample(1).exec( function (err, result){
                callback(result[0]);
            })
            break;                
        default:
            break;
    }
}

/**
 * Function to re-order the turns 
 * @param obj objeto con los users de la room
 *  */
function changeTurns(obj){
    //Reacomodamiento de turnos si quedan 4 players
    if (Object.keys(obj).length === 4) {

        Object.keys(obj).forEach(key => {
            let value = obj[key];
            if (value.turn === 1) {
                value.turn = 4;
            }else{
                value.turn = value.turn - 1;
            }
        });
        
    }else{
        //reordenamiento de los users cuando quedan menos de 4
        //Paso el object a array y los ordeno
        var newArrayUsers = Object.entries(obj);
        newArrayUsers.sort(function (a, b) {
        if (a[1].turn > b[1].turn) {
            return 1;
        }
        if (a[1].turn < b[1].turn) {
            return -1;
        }
        // a must be equal to b
        return 0;
        });

        //Corrigo los Turnos
        for (let index = 0; index < newArrayUsers.length; index++) {
            newArrayUsers[index][1].turn = index+1; 
        }
        //Se cambia el orden
        for (let index = 0; index < newArrayUsers.length; index++) {
   
            if (newArrayUsers[index][1].turn === 1) {
                newArrayUsers[index][1].turn = newArrayUsers.length;
            }else{
                newArrayUsers[index][1].turn =newArrayUsers[index][1].turn - 1;
            }
             
        }
        //Retorno como object
        obj = newArrayUsers.reduce((acc, record) => ({
            ...acc,
            [record[0]]: record[1],
        }), {});
            
    }
    return obj;
}

saveGame = function(id, users){
    game = new Game({
        'gameID': id,
        'participants': users
    })
    game.save((err, appt) => {
        if (err){logger.error(err); }
        console.log("Mongo save");
        logger.info("Mongodb inserted action was ok");
      });

}

gameUpdate = function(id, won, rounds){

    let winner = {
        "userID": won.userID,
        "username": won.name,
        "price": won.books
    }
    game = {
        'rounds': rounds,
        'won': winner
    }
    Game.findOneAndUpdate({'gameID': id},game,function(error){
        if (error){ logger.error(error)}
        logger.debug("Mongodb object updated succesfully")
    })
}

