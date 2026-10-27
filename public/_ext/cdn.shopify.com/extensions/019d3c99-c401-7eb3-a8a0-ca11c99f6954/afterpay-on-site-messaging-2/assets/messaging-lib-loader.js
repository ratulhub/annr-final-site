// Calls itself when loaded by App Blocks
(function injectMessagingLib() {
  if (document && document.body) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://js.squarecdn.com/square-marketplace.js";

    document.body.appendChild(script);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "Afterpay: Document or its body don't exist. We can't append our messaging script, so messaging will not be shown.",
    );
  }
})();
