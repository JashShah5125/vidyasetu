const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const redisClient = require('../config/redis');

const MASTER_TENANT_ID = parseInt(process.env.MASTER_TENANT_ID) || 1;


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const users = await userModel.findUserByEmail(email);
        
        if (!users || users.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        if (users.length > 1) {
            // For now, if multiple users share an email, require tenant identification.
            // Since frontend doesn't send tenantId yet, we just block it to prevent IDOR.
            return res.status(400).json({ status: 'error', message: 'Multiple accounts found with this email. Please contact support.' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ status: 'error', message: 'Account is not active' });
        }

        let isSaasAdmin = false;
        
        if (user.tenant_id === MASTER_TENANT_ID) {
            isSaasAdmin = true;
        } 
        
        const permissions = await userModel.getUserPermissions(user.id, user.tenant_id);

        const tokenPayload = {
            userId: user.id,
            tenantId: user.tenant_id,
            userType: user.user_type,
            isSaasAdmin,
            permissions
        };

        const token = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Store session in Redis with 7 days TTL (604800 seconds)
        await redisClient.setEx(`session:${refreshToken}`, 604800, user.id.toString());

        res.status(200).json({
            status: 'success',
            message: 'Logged in successfully',
            data: {
                token,
                refreshToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    userType: user.user_type,
                    tenantId: user.tenant_id,
                    isSaasAdmin,
                    permissions
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error during login' });
    }
};

const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // Verify the refresh token mathematically
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (err) {
            return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
        }

        // Check if the token exists in Redis
        const userId = await redisClient.get(`session:${refreshToken}`);
        if (!userId || userId !== decoded.userId) {
            return res.status(401).json({ status: 'error', message: 'Session expired or invalid' });
        }

        // Issue a new short-lived access token
        const newAccessToken = generateToken({
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            userType: decoded.userType,
            isSaasAdmin: decoded.isSaasAdmin,
            permissions: decoded.permissions
        });

        res.status(200).json({
            status: 'success',
            data: {
                token: newAccessToken
            }
        });

    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error during refresh' });
    }
};

const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        // Remove from Redis to invalidate the session instantly
        if (refreshToken) {
            await redisClient.del(`session:${refreshToken}`);
        }

        res.status(200).json({
            status: 'success',
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error during logout' });
    }
};

module.exports = {
    login,
    refresh,
    logout
};
