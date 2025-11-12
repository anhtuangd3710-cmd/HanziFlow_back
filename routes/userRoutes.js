
const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getLeaderboard,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/leaderboard', protect, getLeaderboard);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

module.exports = router;