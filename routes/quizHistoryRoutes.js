const express = require('express');
const router = express.Router();
const {
    saveQuizResult,
    getQuizHistory,
} = require('../controllers/quizHistoryController');
const { protect } = require('../middleware/authMiddleware');

// Both routes are protected and require a valid token
router.route('/').get(protect, getQuizHistory).post(protect, saveQuizResult);

module.exports = router;
