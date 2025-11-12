
const express = require('express');
const router = express.Router();
const {
    getSets,
    getSetById,
    createSet,
    updateSet,
    deleteSet,
    getPublicSets,
    getPublicSetDetails,
    cloneSet,
} = require('../controllers/setController');
const { protect } = require('../middleware/authMiddleware');

// All routes in this file are protected
router.use(protect);

// Community routes
router.route('/community').get(getPublicSets);
router.route('/community/:id').get(getPublicSetDetails);
router.route('/clone/:id').post(cloneSet);

// User's private set routes
router.route('/').get(getSets).post(createSet);
router.route('/:id').get(getSetById).put(updateSet).delete(deleteSet);

module.exports = router;
