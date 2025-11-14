
const express = require('express');
const router = express.Router();
const {
    getStats,
    getAllUsers,
    adminDeleteUser,
    exportUsers,
    blockUser,
    unblockUser
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

// Protect all routes in this file with both authentication and admin checks
router.use(protect, admin);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.delete('/users/:id', adminDeleteUser);
router.put('/users/:id/block', blockUser);
router.put('/users/:id/unblock', unblockUser);
router.get('/export/users', exportUsers);

module.exports = router;
