import { Component, OnInit } from '@angular/core';
import { SocketService } from '../services/socket.service';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'front';
  user = {'user': 'marcos'};
  room;
  game;
  username;
  question;
  bet;
  id = Math.random().toString(36).substr(2, 9);

  constructor(
    private socketService: SocketService

  ) { }
  
  ngOnInit() {
    this.socketService.onNewMessage().subscribe(msg => {
      this.room = JSON.parse(msg);
      console.log(this.room);
    });

    this.socketService.onNewGame().subscribe(game => {
      this.game = JSON.parse(game);
      console.log(this.game);
    });

    this.socketService.onNewQuestion().subscribe(question => {
      this.question = question;
      console.log(question);
    })

  }

  newUser(username) {
    this.socketService.newUser({'user': username, 'level': 'Virtuoso', 'userID': this.id});
  }

  join() {
    console.log('join');
    this.socketService.join(this.room.id);
  }

  userBet(bet){
    let msg = {"roomID" : this.game.id, "value" : bet, 'userID': this.id}
    this.socketService.userBet(msg);
    console.log("Apuesta: " + bet);
  }

  enviarRespuesta(pregunta, time){
    let msg = {"roomID" : this.game.id, "answer" : pregunta, 'userID': this.id, "timeResponse": time}
    this.socketService.enviarRespuesta(msg);
  }

}

