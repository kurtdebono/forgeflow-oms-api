export const ProductCacheKeys = {
    all: 'products:all',

    byId(productId: string) {
        return `products:${productId}`;
    }
}