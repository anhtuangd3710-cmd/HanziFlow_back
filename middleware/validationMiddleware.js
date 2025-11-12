
const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
};

const validateRegistration = [
    body('name')
        .trim()
        .not().isEmpty().withMessage('Name is required.')
        .isLength({ min: 3 }).withMessage('Name must be at least 3 characters long.')
        .escape(),
    body('email')
        .isEmail().withMessage('Please include a valid email.')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        .matches(/\d/).withMessage('Password must contain a number.')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter.')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
        .matches(/[\W_]/).withMessage('Password must contain a special character.'),
    handleValidationErrors,
];

const validateLogin = [
    body('email')
        .isEmail().withMessage('Please include a valid email.')
        .normalizeEmail(),
    body('password')
        .not().isEmpty().withMessage('Password is required.'),
    handleValidationErrors,
];

module.exports = {
    validateRegistration,
    validateLogin,
};
