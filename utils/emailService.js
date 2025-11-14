const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Send verification email
const sendVerificationEmail = async (email, verificationLink) => {
    try {
        // In development, skip actual email sending
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n📧 Email Verification Link (Dev Mode):\n${verificationLink}\n`);
            return;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email - HanziFlow',
            html: `
                <h2>Welcome to HanziFlow!</h2>
                <p>Please verify your email address to complete registration:</p>
                <p>
                    <a href="${verificationLink}" style="
                        background-color: #4F46E5;
                        color: white;
                        padding: 10px 20px;
                        text-decoration: none;
                        border-radius: 5px;
                        display: inline-block;
                    ">Verify Email</a>
                </p>
                <p>Or copy and paste this link:</p>
                <p>${verificationLink}</p>
                <p>This link expires in 24 hours.</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send verification email:', error.message);
        throw error;
    }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetLink) => {
    try {
        // In development, skip actual email sending
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n🔐 Password Reset Link (Dev Mode):\n${resetLink}\n`);
            return;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: 'Reset Your Password - HanziFlow',
            html: `
                <h2>Password Reset Request</h2>
                <p>We received a request to reset your password. Click the link below to proceed:</p>
                <p>
                    <a href="${resetLink}" style="
                        background-color: #4F46E5;
                        color: white;
                        padding: 10px 20px;
                        text-decoration: none;
                        border-radius: 5px;
                        display: inline-block;
                    ">Reset Password</a>
                </p>
                <p>Or copy and paste this link:</p>
                <p>${resetLink}</p>
                <p>This link expires in 30 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error.message);
        throw error;
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
};
