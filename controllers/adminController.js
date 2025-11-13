
const User = require('../models/userModel');
const VocabSet = require('../models/vocabSetModel');
const QuizHistory = require('../models/quizHistoryModel');

// @desc    Get admin dashboard stats (user count, set count)
// @route   GET /api/admin/stats
// @access  Admin
const getStats = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const setCount = await VocabSet.countDocuments();
        res.json({ userCount, setCount });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    try {
        const total = await User.countDocuments();
        const totalPages = Math.ceil(total / limit);
        const users = await User.find({})
            .sort({ createdAt: -1 })
            .select('-password -__v')
            .skip(startIndex)
            .limit(limit);
        
        res.json({
            users,
            currentPage: page,
            totalPages: totalPages,
            total: total,
            limit: limit,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a user and their associated data
// @route   DELETE /api/admin/users/:id
// @access  Admin
const adminDeleteUser = async (req, res) => {
    const userId = req.params.id;

    if (userId === req.user._id.toString()) {
        return res.status(400).json({ message: 'Admins cannot delete their own account.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Transaction for atomicity (optional but good practice)
        const session = await User.startSession();
        session.startTransaction();
        try {
            // Delete user, their sets, and their quiz history
            await VocabSet.deleteMany({ user: userId }, { session });
            await QuizHistory.deleteMany({ user: userId }, { session });
            await user.deleteOne({ session });
            
            await session.commitTransaction();
            res.status(204).send();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user and their data.' });
    }
};

// @desc    Export all user data
// @route   GET /api/admin/export/users
// @access  Admin
const exportUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password -__v').lean();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to export user data.' });
    }
};


module.exports = {
    getStats,
    getAllUsers,
    adminDeleteUser,
    exportUsers,
};
