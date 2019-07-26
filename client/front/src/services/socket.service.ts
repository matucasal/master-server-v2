import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as io from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket: SocketIOClient.Socket;

  constructor() {
    //this.socket = io('http://localhost:8000');
    this.socket = io('http://181.114.143.60:8000');
    //"http://181.114.143.60:8000";
  }

  // EMITTER
  newUser(msg: any) {
    this.socket.emit('newUser', msg);
  }

  getAllRooms(msg: any) {
    this.socket.emit('getAllRoms', 'get');
  }

  join(msg: any) {
    this.socket.emit('join', msg);
  }

  userBet(msg: any) {
    console.log("Se emite el bet");
    this.socket.emit('userBet', msg);
  }

  enviarRespuesta(msg: any) {
    console.log("Se emite la respuesta");
    this.socket.emit('userAnswer', msg);
  }

  // HANDLER
  onNewMessage() {
    return Observable.create(observer => {
      this.socket.on('Welcome', msg => {
        observer.next(msg);
      });
      this.socket.on('newPlayerJoinned', msg => {
        observer.next(msg);
      });
      this.socket.on('usersInGame', msg => {
        observer.next(msg);
      });
      this.socket.on('newBet', msg => {
        observer.next(msg);
      });
    });
  }

  onNewGame() {
    return Observable.create(observer => {
      this.socket.on('beginNewGame', game => {
        observer.next(game);
      });
    });
  }

  onNewQuestion() {
    return Observable.create(observer => {
      this.socket.on('question', question => {
        observer.next(question);
        console.log(question);
      });
    });
  }



}
