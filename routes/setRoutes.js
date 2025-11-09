const express = require('express');
const router = express.Router();
const {
    getSets,
    createSet,
    updateSet,
    deleteSet,
} = require('../controllers/setController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getSets).post(protect, createSet);
router.route('/:id').put(protect, updateSet).delete(protect, deleteSet);

module.exports = router;