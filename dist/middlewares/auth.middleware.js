"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized. No token provided.' });
        }
        const token = authHeader.split(' ')[1];
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Unauthorized. Invalid or expired token.' });
    }
};
exports.authenticate = authenticate;
const requireSuperAdmin = (req, res, next) => {
    if (req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Forbidden. Super Admin access required.' });
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
