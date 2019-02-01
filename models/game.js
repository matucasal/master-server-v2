const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a schema
const gameSchema = new Schema({

    date: { type: Date, default: Date.now },
    participants: [{ user : String }, {price: Number }],
    won: { user : String }
    
  });
  
  
  // Create a model
  const Game = mongoose.model('games', gameSchema);
  
  // Export the model
  module.exports = Game;