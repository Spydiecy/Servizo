const User = require('../models/User');
const { generateOTP, sendOTPEmail, sendWelcomeEmail } = require('../services/emailService');

// Register user
const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, userType } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // If user exists but email not verified, allow re-registration with OTP
            if (!existingUser.emailVerified) {
                // Check if OTP already exists and is not expired
                const hasValidOTP = existingUser.otp && existingUser.otpExpires && new Date() < existingUser.otpExpires;
                
                if (!hasValidOTP) {
                    // Generate and send new OTP
                    const otp = generateOTP();
                    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
                    
                    existingUser.otp = otp;
                    existingUser.otpExpires = otpExpires;
                    await existingUser.save();
                    
                    await sendOTPEmail(existingUser, otp);
                }
                
                req.session.pendingUserId = existingUser._id;
                
                return res.status(200).json({
                    success: true,
                    message: hasValidOTP 
                        ? 'Account exists but not verified. Please check your email for OTP.' 
                        : 'OTP sent to your email. Please verify to continue.',
                    requiresOTP: true,
                    email: existingUser.email
                });
            }
            
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create new user
        const user = new User({
            firstName,
            lastName,
            email,
            phone,
            password,
            userType: userType || 'customer',
            otp,
            otpExpires,
            emailVerified: false
        });

        await user.save();

        // Send OTP email
        await sendOTPEmail(user, otp);

        // Store user ID in session for OTP verification
        req.session.pendingUserId = user._id;

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please check your email for OTP verification.',
            requiresOTP: true,
            email: user.email
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find user
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if OTP matches and is not expired
        if (user.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        if (new Date() > user.otpExpires) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Mark email as verified and clear OTP
        user.emailVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        // Send welcome email
        await sendWelcomeEmail(user);

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.password;

        // Set session
        req.session.userId = user._id;
        req.session.user = userResponse;
        delete req.session.pendingUserId;

        res.json({
            success: true,
            message: 'Email verified successfully! Welcome to Servizo!',
            user: userResponse
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during verification'
        });
    }
};

// Resend OTP
const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        // Send OTP email
        await sendOTPEmail(user, otp);

        res.json({
            success: true,
            message: 'New OTP sent to your email'
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Login user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact support.'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if email is verified
        if (!user.emailVerified) {
            // Check if OTP already exists and is not expired
            const hasValidOTP = user.otp && user.otpExpires && new Date() < user.otpExpires;
            
            if (!hasValidOTP) {
                // Generate and send new OTP only if no valid OTP exists
                const otp = generateOTP();
                const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
                
                user.otp = otp;
                user.otpExpires = otpExpires;
                await user.save();
                
                await sendOTPEmail(user, otp);
            }
            
            req.session.pendingUserId = user._id;
            
            return res.status(403).json({
                success: false,
                message: hasValidOTP 
                    ? 'Email not verified. Please check your email for OTP.' 
                    : 'Email not verified. OTP sent to your email.',
                requiresOTP: true,
                email: user.email
            });
        }

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.password;

        // Set session
        req.session.userId = user._id;
        req.session.user = userResponse;

        res.json({
            success: true,
            message: 'Login successful',
            user: userResponse
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// Logout user
const logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Could not log out'
            });
        }
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    });
};

// Get current user
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    registerUser,
    verifyOTP,
    resendOTP,
    loginUser,
    logoutUser,
    getCurrentUser
};
