const QuizHistory = require('../models/quizHistoryModel');

// @desc    Save a quiz result
// @route   POST /api/history
// @access  Private
const saveQuizResult = async (req, res) => {
    const { vocabSet, score, total } = req.body;

    if (vocabSet === undefined || score === undefined || total === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const historyItem = new QuizHistory({
        user: req.user._id,
        vocabSet,
        score,
        total,
    });

    const createdHistory = await historyItem.save();
    
    // Populate vocabSet info before sending back
    const populatedHistory = await QuizHistory.findById(createdHistory._id).populate('vocabSet', 'title');

    res.status(201).json(populatedHistory);
};

// @desc    Get user's quiz history
// @route   GET /api/history
// @access  Private
const getQuizHistory = async (req, res) => {
    // Find history, populate the 'title' from the referenced VocabSet
    // Sort by createdAt descending to get the most recent first
    // Limit to 20 results
    const history = await QuizHistory.find({ user: req.user._id })
        .populate('vocabSet', 'title')
        .sort({ createdAt: -1 })
        .limit(20);

    res.json(history);
};

module.exports = {
    saveQuizResult,
    getQuizHistory,
};
