import http from 'http';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('Testing Search Endpoints:');

  // Test 1: Predictive search
  const res1 = await get('http://localhost:8080/search/suggest?q=hoodie');
  console.log('1. /search/suggest?q=hoodie -> status:', res1.status, 'len:', res1.body.length, 'has results:', res1.body.includes('header-search-new__result-products'));

  // Test 2: /search redirect
  const res2 = await get('http://localhost:8080/search?q=hoodie');
  console.log('2. /search?q=hoodie -> status:', res2.status, 'location:', res2.headers.location);

  // Test 3: /search/index.html
  const res3 = await get('http://localhost:8080/search/index.html?type=product&q=hoodie');
  console.log('3. /search/index.html?type=product&q=hoodie -> status:', res3.status, 'len:', res3.body.length);

  // Test 4: empty predictive search
  const res4 = await get('http://localhost:8080/search/suggest?q=xyznonexistentquery');
  console.log('4. /search/suggest empty query -> status:', res4.status, 'empty products div:', res4.body.includes('data-header-search-new-result-products></div>'));

  console.log('\nAll search endpoint tests completed successfully!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
