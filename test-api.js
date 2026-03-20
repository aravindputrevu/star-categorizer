// Simplified API test to check for errors
const { execSync } = require('child_process');

try {
  console.log('Running curl command to test API...');
  
  const output = execSync(`curl -X POST http://localhost:3000/api/compute \
  -H "Content-Type: application/json" \
  -d '{"username":"aravindputrevu"}' \
  -v`, { encoding: 'utf-8' });
  
  console.log('API test result:');
  console.log(output);
} catch (error) {
  console.error('Error executing test:');
  console.error(error.toString());
  
  // Print any stdout/stderr that was captured
  if (error.stdout) {
    console.log('STDOUT:', error.stdout.toString());
  }
  if (error.stderr) {
    console.log('STDERR:', error.stderr.toString());
  }
}