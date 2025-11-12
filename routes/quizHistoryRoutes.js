
const express = require('express');
const router = express.Router();
const {
    saveQuizResult,
    getQuizHistory,
    getUserStats,
} = require('../controllers/quizHistoryController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected and require a valid token
router.use(protect);

router.route('/').get(getQuizHistory).post(saveQuizResult);
router.route('/stats').get(getUserStats);

module.exports = router;
