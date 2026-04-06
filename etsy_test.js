const axios = require('axios');

async function test() {
    try {
        const response = await axios.get(`https://api.etsy.com/v3/application/seller-taxonomy/nodes`, {
            headers: {
                'x-api-key': 'dummy_api_key_123'
            }
        });
        console.log("Success", response.status);
    } catch (error) {
        console.error("Error from Etsy:", error.response?.status, error.response?.data || error.message);
    }
}
test();
