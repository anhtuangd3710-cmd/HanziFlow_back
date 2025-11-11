
const express = require('express');
const router = express.Router();
const {
    saveQuizResult,
    getQuizHistory,
    getUserStats,
} = require('../controllers/quizHistoryController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected and require a valid token
router.route('/').get(protect, getQuizHistory).post(protect, saveQuizResult);
router.route('/stats').get(protect, getUserStats);

module.exports = router;