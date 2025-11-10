const mongoose = require('mongoose');

const vocabItemSchema = mongoose.Schema({
    id: { type: String, required: true },
    hanzi: { type: String, required: true },
    pinyin: { type: String, required: true },
    meaning: { type: String, required: true },
    exampleSentence: { type: String },
    needsReview: { type: Boolean, default: false },
});

const vocabSetSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            index: true, // Performance optimization: Index this field for faster queries
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        difficulty: {
            type: String,
            required: true,
            enum: ['Easy', 'Medium', 'Hard'],
            default: 'Medium',
        },
        items: [vocabItemSchema],
    },
    {
        timestamps: true,
    }
);

const VocabSet = mongoose.model('VocabSet', vocabSetSchema);

module.exports = VocabSet;