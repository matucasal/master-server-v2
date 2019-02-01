const Game = require('../models/game');

module.exports = {
    
    newGame: function() {
        const newGame = new Game;
          newGame.save((err, game) => {
            // Check if error occured
            return game._id;
          })
      
          

      }
}