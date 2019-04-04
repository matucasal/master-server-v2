const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

// Create a schema
const userSchema = new Schema({
  books: { type: Number, default: 1000},
  level: { type: String },
  avatar: { type: String, default: 'avatarDefault.png' },
  accesories: [String],
  gamesPlayed: { type: Number, default: 0},
  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  favoriteCategory: { type: String },
  method: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    required: true
  },
  local: {
    email: {
      type: String,
      lowercase: true
    },
    password: { 
      type: String
    },
    name: { 
      type: String
    }

  },
  google: {
    id: {
      type: String
    },
    email: {
      type: String,
      lowercase: true
    }
  },
  facebook: {
    id: { type: String },
    name: { type: String },
    email: { type: String, lowercase: true },
  }
});

userSchema.pre('save', async function(next) {
  try {
    if (this.method !== 'local') {
      next();
    }

    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Generate a password hash (salt + hash)
    const passwordHash = await bcrypt.hash(this.local.password, salt);
    // Re-assign hashed version over original, plain text password
    this.local.password = passwordHash;
    next();
  } catch(error) {
    next(error);
  }
});

userSchema.methods.isValidPassword = async function(newPassword) {
  try {
    return await bcrypt.compare(newPassword, this.local.password);
  } catch(error) {
    throw new Error(error);
  }
}

// Create a model
const User = mongoose.model('user', userSchema);

// Export the model
module.exports = User;