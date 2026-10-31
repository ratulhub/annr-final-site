(function() {
  const BASE_URL = 'https://static.joy.so';

  const scriptElement = document.createElement('script');
  scriptElement.type = 'text/javascript';
  scriptElement.async = !0;
  scriptElement.src = `${BASE_URL}/avada-joy.min.js?v=${new Date().getTime()}`;
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(scriptElement, firstScript);
})();
