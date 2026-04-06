import axios from 'axios';

async function test() {
    try {
        const response = await axios.get('https://api.asb.web.tr/api/integrations/etsy/seller-taxonomy-nodes');
        console.log(response.status);
    } catch (error: any) {
        console.error('Error:', error.response?.status, error.response?.data);
    }
}

test();
