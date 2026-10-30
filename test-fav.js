fetch('http://localhost:8080/home.html')
  .then(r => r.text())
  .then(t => {
    const matches = t.match(/<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi);
    console.log('Favicon tags returned by dev server:');
    console.log(matches);
  })
  .catch(err => console.error('Fetch error:', err));
