const VocabSet = require('../models/vocabSetModel');
const NodeCache = require('node-cache');

// Initialize cache with a 10 minute TTL (Time To Live)
const myCache = new NodeCache({ stdTTL: 600 });


// @desc    Get user's vocab sets
// @route   GET /api/sets
// @access  Private
const getSets = async (req, res) => {
    const userId = req.user._id.toString();
    const cacheKey = `sets_${userId}`;

    // Try to get data from cache
    if (myCache.has(cacheKey)) {
        console.log('Serving sets from cache');
        return res.json(myCache.get(cacheKey));
    }

    // If not in cache, fetch from DB
    console.log('Serving sets from DB');
    const sets = await VocabSet.find({ user: req.user._id });
    
    // Store result in cache before sending response
    myCache.set(cacheKey, sets);

    res.json(sets);
};

// @desc    Create a new vocab set
// @route   POST /api/sets
// @access  Private
const createSet = async (req, res) => {
    const { title, description, items, difficulty } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Title is required' });
    }

    const set = new VocabSet({
        title,
        description,
        items,
        difficulty,
        user: req.user._id,
    });

    const createdSet = await set.save();
    
    // Invalidate cache for this user
    myCache.del(`sets_${req.user._id.toString()}`);

    res.status(201).json(createdSet);
};

// @desc    Update a vocab set
// @route   PUT /api/sets/:id
// @access  Private
const updateSet = async (req, res) => {
    const { title, description, items, difficulty } = req.body;

    const set = await VocabSet.findById(req.params.id);

    if (set) {
        if (set.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        set.title = title || set.title;
        set.description = description || set.description;
        set.items = items || set.items;
        set.difficulty = difficulty || set.difficulty;

        const updatedSet = await set.save();

        // Invalidate cache for this user
        myCache.del(`sets_${req.user._id.toString()}`);

        res.json(updatedSet);
    } else {
        res.status(404).json({ message: 'Set not found' });
    }
};

// @desc    Delete a vocab set
// @route   DELETE /api/sets/:id
// @access  Private
const deleteSet = async (req, res) => {
    const set = await VocabSet.findById(req.params.id);

    if (set) {
        if (set.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        await set.deleteOne();
        
        // Invalidate cache for this user
        myCache.del(`sets_${req.user._id.toString()}`);

        res.json({ message: 'Set removed' });
    } else {
        res.status(404).json({ message: 'Set not found' });
    }
};


module.exports = {
    getSets,
    createSet,
    updateSet,
    deleteSet,
};