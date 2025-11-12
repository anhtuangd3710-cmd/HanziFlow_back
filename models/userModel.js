
const mongoose = require('mongoose');
const argon2 = require('argon2');

const userSchema = mongoose.Schema({
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    refreshTokens: [String],
    // Gamification fields
    xp: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastStudiedDate: { type: Date },
    // Community fields
    clonedSets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VocabSet',
    }],
}, {
    timestamps: true,
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        this.password = await argon2.hash(this.password);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await argon2.verify(this.password, enteredPassword);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
