const mongoose = require('mongoose');

const vocabItemSchema = mongoose.Schema({
    id: { type: String, required: true },
    hanzi: { type: String, required: true },
    pinyin: { type: String, required: true },
    meaning: { type: String, required: true },
    exampleSentence: { type: String },
    needsReview: { type: Boolean, default: false },
    // --- SRS Fields ---
    srsLevel: { type: Number, default: 0 }, // 0=new, higher=more learned
    nextReviewDate: { type: Date, default: () => new Date(), index: true },
    interval: { type: Number, default: 0 }, // in days
});

const vocabSetSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            index: true,
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
        // --- Community Fields ---
        isPublic: {
            type: Boolean,
            default: false,
            index: true,
        },
        creatorName: { type: String },
        cloneCount: {
            type: Number,
            default: 0,
        },
        publishedAt: { type: Date },
        originalSetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VocabSet',
        }
    },
    {
        timestamps: true,
    }
);

const VocabSet = mongoose.model('VocabSet', vocabSetSchema);

module.exports = VocabSet;