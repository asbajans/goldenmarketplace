import axios from 'axios';

export interface N11CreateProductItem {
    title: string;
    stockCode: string;       // SKU — unique identifier
    description: string;
    categoryId: string;      // N11 category ID
    price: number;
    quantity: number;
    images: string[];        // Image URLs
    vatRate?: number;        // Default 10
}

export interface N11PriceUpdateItem {
    productId: string;       // N11 product ID
    price: number;
    stock: number;
}

export class N11Client {
    private appKey: string;
    private appSecret: string;

    constructor(appKey: string, appSecret: string) {
        this.appKey = appKey;
        this.appSecret = appSecret;
    }

    private auth() {
        return `<sch:auth>
            <sch:appKey>${this.appKey}</sch:appKey>
            <sch:appSecret>${this.appSecret}</sch:appSecret>
         </sch:auth>`;
    }

    private async soapPost(endpoint: string, soapAction: string, body: string): Promise<string> {
        const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
   <soapenv:Header/>
   <soapenv:Body>
      ${body}
   </soapenv:Body>
</soapenv:Envelope>`;
        const response = await axios.post(`https://api.n11.com/ws/${endpoint}`, xml, {
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                'SOAPAction': `http://www.n11.com/ws/schemas/${soapAction}`
            },
            timeout: 20000
        });
        return response.data as string;
    }

    /**
     * Verify connection using GetCities (lightweight endpoint)
     */
    async verifyConnection(): Promise<{ success: boolean; accountName?: string }> {
        try {
            const body = `<sch:GetCitiesRequest>${this.auth()}</sch:GetCitiesRequest>`;
            const result = await this.soapPost('cityService/', 'GetCitiesRequest', body);
            if (result.includes('<status>failure</status>') && result.includes('AUTH')) {
                throw new Error(`N11 kimlik dogrulama hatasi: App Key veya Secret yanlis`);
            }
            return { success: true, accountName: 'N11 Hesabi' };
        } catch (error: any) {
            throw new Error(`N11 baglanti hatasi: ${error.message}`);
        }
    }

    /**
     * Create a new product on N11 (SOAP SaveProductRequest)
     * Returns the N11 product ID on success.
     */
    async createProduct(item: N11CreateProductItem): Promise<string> {
        const imagesXml = item.images.slice(0, 8).map((url, idx) =>
            `<sch:image>
                <sch:url>${url}</sch:url>
                <sch:order>${idx + 1}</sch:order>
            </sch:image>`
        ).join('');

        const body = `<sch:SaveProductRequest>
            ${this.auth()}
            <sch:product>
                <sch:productSellerCode>${item.stockCode}</sch:productSellerCode>
                <sch:title>${item.title}</sch:title>
                <sch:description>${item.description || item.title}</sch:description>
                <sch:category>
                    <sch:id>${item.categoryId}</sch:id>
                </sch:category>
                <sch:price>${item.price}</sch:price>
                <sch:currencyType>1</sch:currencyType>
                <sch:images>${imagesXml}</sch:images>
                <sch:approvalStatus>1</sch:approvalStatus>
                <sch:vatRate>${item.vatRate || 10}</sch:vatRate>
                <sch:preparingDay>3</sch:preparingDay>
                <sch:attributes/>
                <sch:stockItems>
                    <sch:stockItem>
                        <sch:quantity>${item.quantity}</sch:quantity>
                        <sch:sellerStockCode>${item.stockCode}</sch:sellerStockCode>
                        <sch:n11CatalogId/>
                        <sch:optionPrice>${item.price}</sch:optionPrice>
                    </sch:stockItem>
                </sch:stockItems>
            </sch:product>
        </sch:SaveProductRequest>`;

        try {
            const result = await this.soapPost('productService/', 'SaveProductRequest', body);

            if (result.includes('<status>failure</status>')) {
                const errorMatch = result.match(/<errorMessage>(.*?)<\/errorMessage>/);
                throw new Error(errorMatch ? errorMatch[1] : 'N11 urun olusturma hatasi');
            }

            const idMatch = result.match(/<id>(\d+)<\/id>/);
            const n11Id = idMatch ? idMatch[1] : item.stockCode;
            console.log(`[N11] Product created successfully. ID: ${n11Id}`);
            return n11Id;
        } catch (error: any) {
            console.error('[N11] createProduct error:', error.message);
            throw new Error(`N11 urun olusturma hatasi: ${error.message}`);
        }
    }

    /**
     * Update price and stock for an existing N11 product.
     */
    async updatePrices(items: N11PriceUpdateItem[]): Promise<void> {
        for (const item of items) {
            const body = `<sch:UpdateProductBasicRequest>
                ${this.auth()}
                <sch:productId>${item.productId}</sch:productId>
                <sch:price>${item.price}</sch:price>
                <sch:stockItems>
                    <sch:stockItem>
                        <sch:sellerStockCode>${item.productId}</sch:sellerStockCode>
                        <sch:quantity>${item.stock}</sch:quantity>
                    </sch:stockItem>
                </sch:stockItems>
            </sch:UpdateProductBasicRequest>`;

            try {
                const result = await this.soapPost('productService/', 'UpdateProductBasicRequest', body);
                if (result.includes('<status>failure</status>')) {
                    const errMatch = result.match(/<errorMessage>(.*?)<\/errorMessage>/);
                    throw new Error(errMatch ? errMatch[1] : 'N11 guncelleme hatasi');
                }
            } catch (error: any) {
                console.error(`[N11] updatePrices error for ${item.productId}:`, error.message);
                throw new Error(`N11 fiyat guncelleme hatasi: ${error.message}`);
            }
        }
        console.log(`[N11] Updated ${items.length} product prices`);
    }
}

export default N11Client;
