const API_URL = 'http://localhost:3000/api';

async function testAuth() {
    console.log("Testing Auth API...");

    // 1. Register
    const email = `test${Date.now()}@example.com`;
    const phone = `+1${Date.now()}`; // Unique phone
    console.log(`Registering user: ${email}`);
    
    try {
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email,
                phone,
                password: 'password123',
                role: 'NORMAL'
            })
        });
        const regData = await regRes.json();
        console.log('Register Status:', regRes.status);
        if (regRes.status !== 201) console.error('Register Data:', regData);

        // 2. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123'
            })
        });
        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);
        if (loginData.token) console.log('Login Success: Token received');
        else console.error('Login Failed:', loginData);

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

testAuth();
