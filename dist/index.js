"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Trigger backend dev server reload after database schema update
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const vendor_routes_1 = __importDefault(require("./routes/vendor.routes"));
const employee_routes_1 = __importDefault(require("./routes/employee.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const projectedSale_routes_1 = __importDefault(require("./routes/projectedSale.routes"));
const amc_routes_1 = __importDefault(require("./routes/amc.routes"));
const invoice_routes_1 = __importDefault(require("./routes/invoice.routes"));
const billing_routes_1 = __importDefault(require("./routes/billing.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const role_routes_1 = __importDefault(require("./routes/role.routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Security Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
// Rate limiting - prevents brute force attacks
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 10000, // Limit each IP
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);
// Body parser
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve uploaded files statically
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/customers', customer_routes_1.default);
app.use('/api/employees', employee_routes_1.default);
app.use('/api/payments', payment_routes_1.default);
app.use('/api/projected-sales', projectedSale_routes_1.default);
app.use('/api/amcs', amc_routes_1.default);
app.use('/api/invoices', invoice_routes_1.default);
app.use('/api/billing', billing_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/roles', role_routes_1.default);
app.use('/api', vendor_routes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
// 404 handler
app.use((req, res, next) => {
    res.status(404).json({ message: 'Resource not found' });
});
// Global Error Handler
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
