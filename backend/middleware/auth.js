// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'duemate_secret_key_change_in_production';
const JWT_EXPIRY = '7d';

// ============================================================
// GENERATE TOKEN
// ============================================================

function generateToken(email) {
    return jwt.sign(
        { email, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

// ============================================================
// VERIFY TOKEN MIDDLEWARE
// ============================================================

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'No token provided. Authentication required.'
        });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            email: decoded.email
        };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token. Authentication failed.'
        });
    }
}

// ============================================================
// OPTIONAL TOKEN VERIFICATION (doesn't fail if no token)
// ============================================================

function verifyTokenOptional(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            email: decoded.email
        };
    } catch (err) {
        req.user = null;
    }

    next();
}

module.exports = {
    generateToken,
    verifyToken,
    verifyTokenOptional,
    JWT_SECRET,
    JWT_EXPIRY
};
