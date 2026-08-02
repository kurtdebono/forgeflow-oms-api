"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authUserSelect = exports.publicUserSelect = void 0;
exports.publicUserSelect = {
    id: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true
};
exports.authUserSelect = {
    id: true,
    email: true,
    role: true,
    passwordHash: true,
    refreshTokenHash: true,
    createdAt: true,
    updatedAt: true
};
//# sourceMappingURL=user.select.js.map