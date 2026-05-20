import axios from 'axios';

async function testApi() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@mipl.com',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;
    console.log('Login successful! Token acquired.');

    console.log('Fetching proforma invoices...');
    const piRes = await axios.get('http://localhost:5000/api/invoices/proforma?limit=10000', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Proforma invoices status:', piRes.status);
    console.log('Proforma invoices data:', JSON.stringify(piRes.data, null, 2));

    console.log('Fetching tax invoices...');
    const tiRes = await axios.get('http://localhost:5000/api/invoices/tax?limit=10000', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Tax invoices status:', tiRes.status);
    console.log('Tax invoices data:', JSON.stringify(tiRes.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error('API Error Response:', error.response.status, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error calling API:', error.message);
    }
  }
}

testApi();
