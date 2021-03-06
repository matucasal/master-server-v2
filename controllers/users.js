const JWT = require('jsonwebtoken');
const User = require('../models/user');
const { JWT_SECRET } = require('../configuration');
const logger = require('../configuration/logger')(__filename);

signToken = user => {
  return JWT.sign({
    iss: 'CodeWorkr',
    sub: user.id,
    iat: new Date().getTime(), // current time
    exp: new Date().setDate(new Date().getDate() + 1) // current time + 1 day ahead
  }, JWT_SECRET);
}

module.exports = {
  signUp: async (req, res, next) => {
    const { email, password, name } = req.value.body;

    // Check if there is a user with the same email
    const foundUser = await User.findOne({ "local.email": email });
    if (foundUser) { 
      return res.status(403).json({ error: 'Email is already in use'});
    }

    // Create a new user
    const newUser = new User({ 
      method: 'local',
      local: {
        email: email, 
        password: password,
        name : name
      },
      books: 1000,
      level: "Newbie"
    });

    await newUser.save();

    // Generate the token
    const token = signToken(newUser);
    // Respond with token
    res.status(200).json({ token });
  },

  signIn: async (req, res, next) => {
    // Generate token
    const token = signToken(req.user);
    res.setHeader('Content-Type', 'application/json');
    res.status(200);
    res.send(JSON.stringify({ name: req.user.local.name, mail: req.user.local.mail, token: token, level: req.user.level, userID: req.user.id }, null, 3));
  },

  googleOAuth: async (req, res, next) => {
    // Generate token
    const token = signToken(req.user);
    res.status(200).json({ token });
  },

  facebookOAuth: async (req, res, next) => {
    // Generate token
    const token = signToken(req.user);
    req.user.token = token;
    res.status(200).json( {user: req.user, token: token} );
  },

  secret: async (req, res, next) => {
    console.log('I managed to get here!');
    res.json({ secret: "resource" });
  },

  updateBooks: async (user) => {
    User.findOneAndUpdate({ _id: user.userID }, { $inc: { books: user.books }}, {new: true},function(err, response) {
      if (err) {
        console.log(err);
      }else{
        console.log(response);
      }
    }
  )}


}

