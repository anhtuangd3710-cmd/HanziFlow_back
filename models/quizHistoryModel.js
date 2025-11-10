const mongoose = require('mongoose');

const quizHistorySchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        vocabSet: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'VocabSet',
        },
        score: {
            type: Number,
            required: true,
        },
        total: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

const QuizHistory = mongoose.model('QuizHistory', quizHistorySchema);

module.exports = QuizHistory;
