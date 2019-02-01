const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a schema
const questionSchema = new Schema({

    level: { type: String },
    question: { type: String },
    answer_a: { type: String},
    answer_b: { type: String},
    answer_ok: { type: String}
    
  });
  
  
  // Create a model
  const Question = mongoose.model('question', questionSchema);
  
  // Export the model
  module.exports = Question;