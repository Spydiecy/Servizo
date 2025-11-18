const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email service error:', error.message);
    } else {
        console.log('✅ Email service ready to send messages');
    }
});

// Generate OTP
const generateOTP = () => {
    return otpGenerator.generate(6, {
        digits: true,
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
    });
};

// Email Templates
const getEmailTemplate = (type, data) => {
    const templates = {
        welcome: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .content { padding: 40px 30px; }
                    .content h2 { color: #333; margin-bottom: 20px; }
                    .content p { color: #666; line-height: 1.6; margin-bottom: 15px; }
                    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Welcome to Servizo!</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${data.name}! 👋</h2>
                        <p>Thank you for joining Servizo, your trusted platform for professional home services.</p>
                        <p>We're excited to have you on board! With Servizo, you can:</p>
                        <ul>
                            <li>📋 Book professional services easily</li>
                            <li>⭐ Read reviews from real customers</li>
                            <li>💬 Chat with service providers</li>
                            <li>📊 Track your bookings in real-time</li>
                        </ul>
                        <p>Get started by exploring our services and finding the perfect professional for your needs.</p>
                        <a href="${process.env.BASE_URL || 'http://localhost:3000'}/services" class="button">Explore Services</a>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Servizo. All rights reserved.</p>
                        <p>This email was sent to ${data.email}</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        
        otp: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .content { padding: 40px 30px; text-align: center; }
                    .content h2 { color: #333; margin-bottom: 20px; }
                    .content p { color: #666; line-height: 1.6; margin-bottom: 15px; }
                    .otp-box { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 30px; margin: 30px 0; }
                    .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 10px 0; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; text-align: left; }
                    .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Email Verification</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${data.name}! 👋</h2>
                        <p>Please use the following OTP to verify your email address:</p>
                        <div class="otp-box">
                            <p style="margin: 0; color: #666;">Your OTP Code</p>
                            <div class="otp-code">${data.otp}</div>
                            <p style="margin: 0; color: #999; font-size: 14px;">Valid for 10 minutes</p>
                        </div>
                        <div class="warning">
                            <strong>⚠️ Security Notice:</strong><br>
                            Never share this OTP with anyone. Servizo staff will never ask for your OTP.
                        </div>
                        <p>If you didn't request this code, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Servizo. All rights reserved.</p>
                        <p>This email was sent to ${data.email}</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        
        booking: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .content { padding: 40px 30px; }
                    .content h2 { color: #333; margin-bottom: 20px; }
                    .content p { color: #666; line-height: 1.6; margin-bottom: 15px; }
                    .booking-details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
                    .detail-label { font-weight: bold; color: #555; }
                    .detail-value { color: #333; }
                    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Booking Confirmed!</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${data.name}! 👋</h2>
                        <p>Your booking has been confirmed successfully. Here are your booking details:</p>
                        <div class="booking-details">
                            <div class="detail-row">
                                <span class="detail-label">Booking ID:</span>
                                <span class="detail-value">#${data.bookingId}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Service:</span>
                                <span class="detail-value">${data.serviceName}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Date:</span>
                                <span class="detail-value">${data.date}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Time:</span>
                                <span class="detail-value">${data.time}</span>
                            </div>
                            <div class="detail-row" style="border-bottom: none;">
                                <span class="detail-label">Total Amount:</span>
                                <span class="detail-value" style="color: #667eea; font-size: 18px; font-weight: bold;">₹${data.amount}</span>
                            </div>
                        </div>
                        <p>The service provider will contact you shortly to confirm the details.</p>
                        <a href="${process.env.BASE_URL || 'http://localhost:3000'}/bookings" class="button">View Booking</a>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Servizo. All rights reserved.</p>
                        <p>This email was sent to ${data.email}</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        
        passwordReset: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .content { padding: 40px 30px; }
                    .content h2 { color: #333; margin-bottom: 20px; }
                    .content p { color: #666; line-height: 1.6; margin-bottom: 15px; }
                    .otp-box { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 30px; margin: 30px 0; text-align: center; }
                    .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 10px 0; }
                    .warning { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
                    .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔑 Password Reset</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${data.name}! 👋</h2>
                        <p>We received a request to reset your password. Use the OTP below to proceed:</p>
                        <div class="otp-box">
                            <p style="margin: 0; color: #666;">Your Reset OTP</p>
                            <div class="otp-code">${data.otp}</div>
                            <p style="margin: 0; color: #999; font-size: 14px;">Valid for 10 minutes</p>
                        </div>
                        <div class="warning">
                            <strong>⚠️ Security Alert:</strong><br>
                            If you didn't request this password reset, please ignore this email and secure your account immediately.
                        </div>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Servizo. All rights reserved.</p>
                        <p>This email was sent to ${data.email}</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    return templates[type] || templates.welcome;
};

// Send Email Function
const sendEmail = async (to, subject, type, data) => {
    try {
        const htmlContent = getEmailTemplate(type, { ...data, email: to });
        
        const mailOptions = {
            from: `"Servizo" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        return { success: false, error: error.message };
    }
};

// Specific email functions
const sendWelcomeEmail = async (user) => {
    return await sendEmail(
        user.email,
        '🎉 Welcome to Servizo!',
        'welcome',
        { name: user.firstName }
    );
};

const sendOTPEmail = async (user, otp) => {
    return await sendEmail(
        user.email,
        '🔐 Your Servizo Verification Code',
        'otp',
        { name: user.firstName, otp }
    );
};

const sendBookingConfirmation = async (user, booking) => {
    return await sendEmail(
        user.email,
        '✅ Booking Confirmed - Servizo',
        'booking',
        {
            name: user.firstName,
            bookingId: booking._id.toString().slice(-8).toUpperCase(),
            serviceName: booking.service.title,
            date: new Date(booking.scheduledDate).toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            time: booking.scheduledTime,
            amount: booking.totalAmount
        }
    );
};

const sendPasswordResetEmail = async (user, otp) => {
    return await sendEmail(
        user.email,
        '🔑 Password Reset Request - Servizo',
        'passwordReset',
        { name: user.firstName, otp }
    );
};

module.exports = {
    generateOTP,
    sendEmail,
    sendWelcomeEmail,
    sendOTPEmail,
    sendBookingConfirmation,
    sendPasswordResetEmail
};
