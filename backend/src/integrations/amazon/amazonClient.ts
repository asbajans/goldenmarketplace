/**
 * Amazon SP-API Client (Skeleton)
 * 
 * Amazon SP-API requires:
 *   1. AWS IAM credentials (Access Key + Secret Key)
 *   2. LWA (Login with Amazon) OAuth tokens
 *   3. AWS Signature v4 signing for each request
 * 
 * Full implementation will be added in a future sprint.
 * Currently only a stub that logs the action.
 */

export interface AmazonProduct {
    asin: string;
    sku: string;
    price: number;
    stock: number;
}

export class AmazonClient {
    private marketplaceId: string;

    constructor(
        _accessKeyId: string,
        _secretAccessKey: string,
        _refreshToken: string,
        marketplaceId: string = 'A33AVAJ2PDY3EV' // TR marketplace ID
    ) {
        this.marketplaceId = marketplaceId;
        console.log('[Amazon] AmazonClient initialized (skeleton mode)');
    }

    /**
     * Verify connection - SKELETON
     */
    async verifyConnection(): Promise<{ success: boolean }> {
        console.log('[Amazon] verifyConnection called - Full SP-API auth pending implementation');
        return {
            success: false
        };
    }

    /**
     * Update prices - SKELETON
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async updatePrices(_items: AmazonProduct[]): Promise<void> {
        console.log(`[Amazon] updatePrices called for ${_items.length} items - Full SP-API implementation pending`);
        // TODO:
        // 1. Get LWA access token using refreshToken
        // 2. Sign request with AWS Signature v4
        // 3. PUT /listings/2021-08-01/items/{sellerId}/{sku} for each item
    }
}

export default AmazonClient;
