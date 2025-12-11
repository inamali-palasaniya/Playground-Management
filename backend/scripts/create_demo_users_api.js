const API_URL = 'http://localhost:3000/api';

async function createDemoUsers() {
    console.log("Setting up Demo Users...");

    const users = [
        {
            name: 'Admin User',
            email: 'admin@sports.com',
            phone: '+10000000000',
            password: 'admin123',
            role: 'MANAGEMENT'
        },
        {
            name: 'Star Player',
            email: 'player@sports.com',
            phone: '+10000000001',
            password: 'player123',
            role: 'NORMAL'
        }
    ];

    for (const user of users) {
        console.log(`\nProcessing ${user.name} (${user.role})...`);
        
        // Try Login first
        try {
            const loginRes = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, password: user.password })
            });

            if (loginRes.ok) {
                console.log(`✅ User ${user.email} already exists. Ready to use.`);
                continue;
            }
        } catch (e) {
            // Ignore connection errors for now, assume server up
        }

        // Register if login failed
        try {
            const regRes = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            
            const data = await regRes.json();
            
            if (regRes.status === 201) {
                console.log(`✅ Created ${user.email} successfully.`);
            } else {
                console.error(`❌ Failed to create ${user.email}:`, data.error);
            }
        } catch (e) {
            console.error(`❌ Error connecting to server for ${user.email}:`, e.message);
        }
    }
}

createDemoUsers();
