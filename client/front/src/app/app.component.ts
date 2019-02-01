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

    this.socketService.onNewQuestion().subscribe(quiz => {
      this.question = quiz;
      console.log(quiz);
    })

  }

  newUser(username) {
    this.socketService.newUser({'user': username, 'level': 'Newbie'});
  }

  join() {
    console.log('join');
    this.socketService.join(this.room.id);
  }

  userBet(bet){
    this.socketService.userBet(bet);
    console.log("Apuesta: " + bet);
  }

}

