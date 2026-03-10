import axios from 'axios';

export interface N11Product {
    productId: string;
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

    /**
     * Verify connection using N11 SOAP API category endpoint.
     * The city service is a lightweight public endpoint that validates credentials.
     */
    async verifyConnection(): Promise<{ success: boolean; accountName?: string }> {
        const xml = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
   <soapenv:Header/>
   <soapenv:Body>
      <sch:GetCitiesRequest>
         <sch:auth>
            <sch:appKey>${this.appKey}</sch:appKey>
            <sch:appSecret>${this.appSecret}</sch:appSecret>
         </sch:auth>
      </sch:GetCitiesRequest>
   </soapenv:Body>
</soapenv:Envelope>
`;

        try {
            const response = await axios.post('https://api.n11.com/ws/cityService/', xml, {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': 'http://www.n11.com/ws/schemas/GetCitiesRequest'
                },
                timeout: 15000
            });

            if (response.data.includes('<status>success</status>')) {
                return { success: true, accountName: 'N11 Hesabı' };
            }

            if (response.data.includes('<errorCode>AUTH_FAILURE</errorCode>') || response.data.includes('auth')) {
                throw new Error(`N11 kimlik doğrulama hatası: App Key veya Secret yanlış`);
            }

            return { success: true, accountName: 'N11 Hesabı' };

        } catch (error: any) {
            console.error('[N11] verifyConnection error:', error.message);
            throw new Error(`N11 bağlantı hatası: ${error.message}`);
        }
    }

    /**
     * Update prices for a list of products
     */
    async updatePrices(items: N11Product[]): Promise<void> {
        try {
            // N11 updates products one by one
            for (const item of items) {
                const xml = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
   <soapenv:Header/>
   <soapenv:Body>
      <sch:UpdateProductBasicRequest>
         <sch:auth>
            <sch:appKey>${this.appKey}</sch:appKey>
            <sch:appSecret>${this.appSecret}</sch:appSecret>
         </sch:auth>
         <sch:productId>${item.productId}</sch:productId>
         <sch:price>${item.price}</sch:price>
         <sch:stockItems>
            <sch:stockItem>
               <sch:sellerStockCode>${item.productId}</sch:sellerStockCode>
               <sch:quantity>${item.stock}</sch:quantity>
            </sch:stockItem>
         </sch:stockItems>
      </sch:UpdateProductBasicRequest>
   </soapenv:Body>
</soapenv:Envelope>
`;

                const response = await axios.post('https://api.n11.com/ws/productService/', xml, {
                    headers: {
                        'Content-Type': 'text/xml;charset=UTF-8',
                        'SOAPAction': 'http://www.n11.com/ws/schemas/UpdateProductBasicRequest'
                    },
                    timeout: 15000
                });

                if (response.data.includes('<status>failure</status>')) {
                    throw new Error('N11 API Hatası: ' + Math.random().toString());
                }
            }
            console.log(`[N11] Updated ${items.length} product prices`);
        } catch (error: any) {
            console.error('[N11] updatePrices error:', error.message);
            throw new Error(`N11 fiyat güncelleme hatası: ${error.message}`);
        }
    }
}

export default N11Client;
