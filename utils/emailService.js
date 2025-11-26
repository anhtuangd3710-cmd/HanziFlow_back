const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('⚠️ Email credentials not configured. Emails will be logged to console only.');
        return null;
    }

    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
};

// Send verification email
const sendVerificationEmail = async (email, verificationLink) => {
    try {
        // Always log the link for debugging
        console.log(`\n📧 Email Verification Link:\n${verificationLink}\n`);

        const transporter = createTransporter();
        
        // If no transporter (credentials not set), just return after logging
        if (!transporter) {
            console.log('📧 Email would be sent to:', email);
            return;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email - HanziFlow',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4F46E5;">Welcome to HanziFlow!</h2>
                    <p>Please verify your email address to complete registration:</p>
                    <p style="margin: 20px 0;">
                        <a href="${verificationLink}" style="
                            background-color: #4F46E5;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 5px;
                            display: inline-block;
                            font-weight: bold;
                        ">Verify Email</a>
                    </p>
                    <p style="color: #666;">Or copy and paste this link:</p>
                    <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">
                        ${verificationLink}
                    </p>
                    <p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send verification email:', error.message);
        // Log the full link even if email fails
        console.log(`📧 Verification link (email failed): ${verificationLink}`);
        throw error;
    }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetLink) => {
    try {
        // Always log the link for debugging
        console.log(`\n🔐 Password Reset Link:\n${resetLink}\n`);

        const transporter = createTransporter();
        
        // If no transporter (credentials not set), just return after logging
        if (!transporter) {
            console.log('📧 Email would be sent to:', email);
            return;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: 'Reset Your Password - HanziFlow',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4F46E5;">Password Reset Request</h2>
                    <p>We received a request to reset your password. Click the link below to proceed:</p>
                    <p style="margin: 20px 0;">
                        <a href="${resetLink}" style="
                            background-color: #4F46E5;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 5px;
                            display: inline-block;
                            font-weight: bold;
                        ">Reset Password</a>
                    </p>
                    <p style="color: #666;">Or copy and paste this link:</p>
                    <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">
                        ${resetLink}
                    </p>
                    <p style="color: #999; font-size: 12px;">This link expires in 30 minutes.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error.message);
        // Log the full link even if email fails
        console.log(`🔐 Reset link (email failed): ${resetLink}`);
        throw error;
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
};
