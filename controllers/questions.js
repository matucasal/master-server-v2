const Question = require('../models/question');

module.exports = {

    getQuestion: async (req, res, next) => {
        
        res.status(200).json( "Question" );
      }
}