const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/auth';

async function testEditUser() {
    try {
        console.log('1. Fetching users...');
        const response = await axios.get(`${BASE_URL}/users`);
        
        if (!response.data || !response.data.users || response.data.users.length === 0) {
            console.error('No users found to test with.');
            return;
        }

        const user = response.data.users[0];
        console.log(`Testing with user: ${user.userName} (ID: ${user.id})`);

        // Prepare update payload
        const updateData = {
            userName: user.userName,
            role: user.role,
            status: user.status,
            mobile: '9876543210', // Valid mobile
            email: user.email
        };
        
        // Add password only if it was present (simulating frontend behavior, though frontend sends it if not empty)
        // Frontend logic: if (formData.password) updateData.password = formData.password;
        // We won't send password to test the case where it's not changed.

        console.log('2. Sending PUT request...');
        console.log('Payload:', JSON.stringify(updateData, null, 2));

        const updateResponse = await axios.put(`${BASE_URL}/users/${user.id}`, updateData);
        
        console.log('3. Response received:');
        console.log('Status:', updateResponse.status);
        console.log('Data:', updateResponse.data);

    } catch (error) {
        console.error('Test Failed!');
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        } else if (error.request) {
            console.error('No response received from server.');
            console.error('Error Code:', error.code);
            console.error('Error Message:', error.message);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testEditUser();
