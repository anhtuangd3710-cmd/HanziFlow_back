
const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    logoutUser,
    refreshTokenController,
    getUserProfile,
    updateUserProfile,
    getLeaderboard,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validateRegistration, validateLogin } = require('../middleware/validationMiddleware');

router.post('/register', validateRegistration, registerUser);
router.post('/login', validateLogin, loginUser);
router.post('/logout', protect, logoutUser);
router.post('/refresh', refreshTokenController);

router.get('/leaderboard', protect, getLeaderboard);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

module.exports = router;
