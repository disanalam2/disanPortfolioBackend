const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    // Frontend se header me token aayega
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "Access Denied! No token provided." });
    }

    try {
        // "Bearer <token>" format se actual token nikalna
        const token = authHeader.replace("Bearer ", "");
        
        // Token verify karna
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; 
        
        next(); // Token sahi hai, aage badhne do
    } catch (error) {
        res.status(400).json({ success: false, message: "Invalid or Expired Token!" });
    }
};

module.exports = verifyToken;