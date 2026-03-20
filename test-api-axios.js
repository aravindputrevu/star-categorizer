// Test API using axios
const axios = require('axios');

async function testAPI() {
  try {
    console.log('Sending request to categorize stars for aravindputrevu...');
    
    const response = await axios.post('http://localhost:3000/api/compute', {
      username: 'aravindputrevu'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = response.data;
    
    // Print summary info
    console.log('\nAPI RESPONSE SUMMARY:');
    console.log('Status:', response.status);
    console.log('Message:', data.message);
    console.log('Starred Count:', data.starredCount);
    console.log('Category Count:', data.categoryCount);
    console.log('Processing Time:', data.processingTime);
    
    // If there are categories, show them with repo counts
    if (data.categories) {
      console.log('\nCATEGORIES:');
      Object.entries(data.categories).forEach(([category, repos]) => {
        console.log(`- ${category}: ${repos.length} repos`);
      });
    }
    
    // If there's a dev fact (no stars case)
    if (data.devFact) {
      console.log('\nDev Fact:', data.devFact);
    }
    
    // If there's an error
    if (data.error) {
      console.log('\nERROR:', data.error);
      console.log('Message:', data.message);
      if (data.suggestion) {
        console.log('Suggestion:', data.suggestion);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();