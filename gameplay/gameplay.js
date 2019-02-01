const question = require('../models/question')

var io;
var gameSocket;
var nameRoom;
var dataGame;
var dataRound;

exports.gameStart = function(nio, socket, room, game){

    io = nio;
    gameSocket = socket
    nameRoom = room;
    dataGame = game;
    dataRound = game;

    //events
    
    //recepcion de apuesta si la hay
    gameSocket.on('userBet', function(data){
        console.log("Apuesta: " + data);
    });
    gameSocket.on('userPass', userPass)
    gameSocket.on('finishBet', finishBet);



}

function userBet(data){

    console.log("Apuesta: "+ data);
    //Enviar cuanto aposto el user
    
};

function finishBet(data){
    //Enviar la pregunta a los usuarios
    Question.aggregate().sample(1).exec( function (err, result){
        console.log(result)
    })

};

function userPass(data){
    //remover el usuario que no juega la ronda
    var x = dataRound.filter(function (element){ return element.id != data });
    dataRound = x;
};