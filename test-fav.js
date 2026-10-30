fetch('http://localhost:8080/admin')
  .then(r => r.text())
  .then(t => {
    const matches = t.match(/<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi);
    console.log('Favicon tags returned by dev server on /admin:');
    console.log(matches);
  })
  .catch(err => console.error('Fetch error:', err));
