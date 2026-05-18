"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const zod_1 = require("zod");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const login = async (req, res, next) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        const { email, password } = validatedData;
        const user = await db_1.prisma.user.findFirst({
            where: { email, isActive: true }
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials or inactive account.' });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') });
        res.json({
            status: 'success',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                }
            }
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        next(error);
    }
};
exports.login = login;
const getMe = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, isActive: true, createdAt: true }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            status: 'success',
            data: {
                user
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
