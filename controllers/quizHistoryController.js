const QuizHistory = require('../models/quizHistoryModel');
const VocabSet = require('../models/vocabSetModel');
const User = require('../models/userModel');
const NodeCache = require('node-cache');

const myCache = new NodeCache({ stdTTL: 600 });
const XP_PER_CORRECT_ANSWER = 10;

// Convert numbered pinyin to toned pinyin (needed for backend check)
const toneMap = { 'a': { '1': 'ā', '2': 'á', '3': 'ǎ', '4': 'à', '5': 'a' },'e': { '1': 'ē', '2': 'é', '3': 'ě', '4': 'è', '5': 'e' },'i': { '1': 'ī', '2': 'í', '3': 'ǐ', '4': 'ì', '5': 'i' },'o': { '1': 'ō', '2': 'ó', '3': 'ǒ', '4': 'ò', '5': 'o' },'u': { '1': 'ū', '2': 'ú', '3': 'ǔ', '4': 'ù', '5': 'u' },'ü': { '1': 'ǖ', '2': 'ǘ', '3': 'ǚ', '4': 'ǜ', '5': 'ü' },'v': { '1': 'ǖ', '2': 'ǘ', '3': 'ǚ', '4': 'ǜ', '5': 'ü' } };
const convertNumberedPinyin = (input) => { if (!input) return ''; const parts = input.toLowerCase().split(/\s+/); const processed = parts.map(part => { const syllables = part.match(/([a-züv]+[1-5]?)/g) || [part]; return syllables.map(syllable => { const match = syllable.match(/^([a-züv]+)([1-5])$/); if (!match) return syllable; const [, letters, tone] = match; let toneIndex = -1; if (letters.includes('a')) toneIndex = letters.indexOf('a'); else if (letters.includes('o')) toneIndex = letters.indexOf('o'); else if (letters.includes('e')) toneIndex = letters.indexOf('e'); else if (letters.includes('iu')) toneIndex = letters.indexOf('u'); else if (letters.includes('i')) toneIndex = letters.indexOf('i'); else if (letters.includes('u')) toneIndex = letters.indexOf('u'); else if (letters.includes('ü')) toneIndex = letters.indexOf('ü'); else if (letters.includes('v')) toneIndex = letters.indexOf('v'); if (toneIndex === -1) return syllable; const vowel = letters[toneIndex]; const tonedVowel = toneMap[vowel]?.[tone] || vowel; return letters.substring(0, toneIndex) + tonedVowel + letters.substring(toneIndex + 1); }).join(''); }); return processed.join(' '); };

// @desc    Save a quiz result, update SRS data, and update user gamification stats
// @route   POST /api/history
// @access  Private
const saveQuizResult = async (req, res) => {
    const { vocabSet, score, total, questions } = req.body;

    if (vocabSet === undefined || score === undefined || total === undefined || !questions) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // --- 1. Save History ---
    const historyItem = new QuizHistory({ user: req.user._id, vocabSet, score, total });
    const createdHistory = await historyItem.save();

    // --- 2. Update SRS Data in VocabSet ---
    const set = await VocabSet.findById(vocabSet);
    if (set && set.user.toString() === req.user._id.toString()) {
        let earnedXp = 0;
        questions.forEach(q => {
            const itemToUpdate = set.items.find(i => i.id === q.vocabItem.id);
            if (!itemToUpdate) return;

            const isCorrect = q.type === 'pinyin'
                ? convertNumberedPinyin(q.userAnswer || '').toLowerCase() === q.correctAnswer.toLowerCase()
                : q.userAnswer === q.correctAnswer;

            if (isCorrect) {
                earnedXp += XP_PER_CORRECT_ANSWER;
                itemToUpdate.srsLevel = (itemToUpdate.srsLevel || 0) + 1;
            } else {
                itemToUpdate.srsLevel = Math.max(0, (itemToUpdate.srsLevel || 0) - 2); // Penalize more
            }

            const intervals = [0, 1, 3, 7, 14, 30, 90, 180]; // in days
            const newInterval = intervals[Math.min(itemToUpdate.srsLevel, intervals.length - 1)];
            itemToUpdate.interval = newInterval;
            
            const reviewDate = new Date();
            reviewDate.setHours(0, 0, 0, 0); // Start of day
            reviewDate.setDate(reviewDate.getDate() + newInterval);
            itemToUpdate.nextReviewDate = reviewDate;
        });

        await set.save();
        myCache.del(`sets_${req.user._id.toString()}`); // Invalidate cache

        // --- 3. Update User Gamification Stats ---
        const user = await User.findById(req.user._id);
        if (user) {
            user.xp = (user.xp || 0) + earnedXp;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const lastStudied = user.lastStudiedDate ? new Date(user.lastStudiedDate) : null;
            if (lastStudied) {
                lastStudied.setHours(0, 0, 0, 0);
                const diffTime = today.getTime() - lastStudied.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    user.currentStreak += 1;
                } else if (diffDays > 1) {
                    user.currentStreak = 1;
                }
            } else {
                user.currentStreak = 1;
            }
            user.lastStudiedDate = new Date();
            if (user.currentStreak > user.longestStreak) {
                user.longestStreak = user.currentStreak;
            }
            await user.save();
        }

         // --- 4. Send back all updated info ---
        const populatedHistory = await QuizHistory.findById(createdHistory._id).populate('vocabSet', 'title');
        const updatedUser = { 
            xp: user.xp, 
            currentStreak: user.currentStreak, 
            longestStreak: user.longestStreak, 
            lastStudiedDate: user.lastStudiedDate 
        };
        
        res.status(201).json({ newHistoryItem: populatedHistory, updatedUser, updatedSet: set });
    } else {
         // This case happens if the set was deleted during the quiz; just return history
        const populatedHistory = await QuizHistory.findById(createdHistory._id).populate('vocabSet', 'title');
        res.status(201).json({ newHistoryItem: populatedHistory });
    }
};

// @desc    Get user's quiz history
// @route   GET /api/history
// @access  Private
const getQuizHistory = async (req, res) => {
    const history = await QuizHistory.find({ user: req.user._id })
        .populate('vocabSet', 'title')
        .sort({ createdAt: -1 })
        .limit(20);

    res.json(history);
};

module.exports = {
    saveQuizResult,
    getQuizHistory,
};