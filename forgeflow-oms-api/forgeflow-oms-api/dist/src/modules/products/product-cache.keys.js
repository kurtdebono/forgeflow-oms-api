"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductCacheKeys = void 0;
exports.ProductCacheKeys = {
    all: 'products:all',
    byId(productId) {
        return `products:${productId}`;
    }
};
//# sourceMappingURL=product-cache.keys.js.map