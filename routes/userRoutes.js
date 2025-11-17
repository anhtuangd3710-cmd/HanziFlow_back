
const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getLeaderboard,
    forgotPassword,
    resetPassword,
    verifyEmail,
    googleAuth,
    saveApiKey,
    getApiKey,
    deleteApiKey,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/verify-email', verifyEmail);
router.post('/login', loginUser);
router.post('/google-auth', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/leaderboard', protect, getLeaderboard);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/api-key')
    .get(protect, getApiKey)
    .put(protect, saveApiKey)
    .delete(protect, deleteApiKey);

module.exports = router;