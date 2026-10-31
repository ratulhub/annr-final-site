/*
 * Bootstrap loader for Shopify storefront (non-module tag)
 *
 * This is the entry script for the Candyrack storefront widget. It:
 * - Chooses modern ESM (code-split) or legacy (single-file) bundle at runtime based on browser capabilities
 * - Sets up early event listeners before the main app loads (captures add-to-cart/checkout clicks)
 * - Detects base URL from script tag origin for proper asset loading
 * - Single state guard (CANDYRACK_BOOTSTRAP): 'loading' prevents races, 'loaded' signals success
 * - Logs are conditional: only shown when localStorage['candyrack-debug'] === 'true'
 *
 * Why this loader runs before Vite-bundled code:
 * - Enables early event capture before the app fully loads
 * - Allows dynamic detection of environment (CDN, staging, local)
 * - Can fetch config or call backend APIs before heavy app code loads
 * - See docs/vite-frontend-release.md for full architecture
 *
 * Why ES5 syntax (var, function, etc.)?
 * This script executes BEFORE any polyfills or transpiled code load, so it must work in the oldest
 * browsers we support (targets: ['defaults', 'not IE 11']). Using let/const or arrow functions would
 * break in older browsers before we can even detect capabilities and load the appropriate bundle.
 * Once the correct bundle loads, modern syntax is fine - modern browsers get native ESM, legacy browsers
 * get transpiled bundles.
 */
(function () {
  // Single state variable to prevent race conditions while allowing retry on total failure:
  // - undefined: not started or failed (allows execution/retry)
  // - 'loading': in progress (blocks concurrent execution)
  // - 'loaded': success (blocks all future attempts)
  // Conditional logging: only log if debug flag is set (matches logging.ts pattern)
  var dbg = false;
  try {
    dbg =
      window.localStorage &&
      window.localStorage.getItem('candyrack-debug') === 'true';
  } catch (e) {}
  var log = dbg ? console.log.bind(console) : function () {};
  if (window.CANDYRACK_BOOTSTRAP === 'loaded') {
    log('[bootstrap] already loaded, skipping');
    return;
  }
  if (window.CANDYRACK_BOOTSTRAP === 'loading') {
    log('[bootstrap] already in progress, skipping');
    return;
  }
  window.CANDYRACK_BOOTSTRAP = 'loading';
  log('[bootstrap] start');
  // Set up event listeners immediately to capture clicks from the earliest possible moment.
  // These listeners queue events until app.js loads and sets up the real handlers.
  // This ensures no clicks are missed, even on very fresh page reloads.
  (function setupEarlyEventListeners() {
    // Initialize event queues if they don't exist
    if (!window.CANDYRACK_EVENT_QUEUES) {
      window.CANDYRACK_EVENT_QUEUES = {
        addToCart: [],
        checkoutButton: [],
      };
    }
    // Add-to-cart button click listener
    document.addEventListener(
      'addToCartButtonClicked',
      function (event) {
        if (window.CANDYRACK_EVENT_QUEUES) {
          window.CANDYRACK_EVENT_QUEUES.addToCart.push(event);
        }
      },
      { capture: true },
    );
    // Checkout button click listener
    document.addEventListener(
      'checkoutButtonClicked',
      function (event) {
        if (window.CANDYRACK_EVENT_QUEUES) {
          window.CANDYRACK_EVENT_QUEUES.checkoutButton.push(event);
        }
      },
      { capture: true },
    );
  })();
  // Resolve absolute base from this script tag's URL
  // Extract the directory path to support CDN paths like:
  // https://cdn.shopify.com/extensions/.../assets/main.js -> .../assets/
  var current = (document.currentScript && document.currentScript.src) || '';
  var url = new URL(current, window.location.href);
  // Get the full path up to (but not including) main.js
  var pathname = url.pathname;
  var dir = pathname.substring(0, pathname.lastIndexOf('/'));
  var base = url.origin + dir + '/';
  log('[bootstrap] base: ' + base);

  // Fetch entry manifest to get hashed filenames
  // This allows entry files to have content hashes for cache busting
  // NOTE:
  // - These values are *last-resort defaults* for older/degraded setups.
  // - In normal production, entry files are hashed (e.g. app-<hash>.js) and MUST be loaded via candyrack-popup-manifest.json.
  // - If the manifest can't be loaded and the CDN doesn't provide non-hashed aliases, these defaults will 404 and
  //   Candyrack won't initialize. We keep them mainly for backward compatibility and partial-deploy safety.
  var entryManifest = {
    app: 'candyrack-popup-app.js',
    appLegacy: 'candyrack-popup-app-legacy.js',
    polyfillsLegacy: 'candyrack-popup-polyfills-legacy.js',
  };
  // Inject a script with optional attributes/nonce; always log as strings
  function add(src, attrs, onload, onerror) {
    log('[bootstrap] inject: ' + src);
    var s = document.createElement('script');
    s.src = src;
    if (attrs) for (var k in attrs) s.setAttribute(k, attrs[k]);
    s.async = true;
    if (onload) s.addEventListener('load', onload);
    if (onerror) s.addEventListener('error', onerror);
    document.head.appendChild(s);
    return s;
  }
  // Performance monitoring: log page load time (only in debug mode)
  // Uses modern PerformanceNavigationTiming API when available, falls back to deprecated timing API
  function logPerformanceMetrics() {
    if (!dbg) return;
    try {
      var perfData = null;
      var navStart = 0;
      var useModernAPI = false;
      // Try modern PerformanceNavigationTiming API first
      if (window.performance && window.performance.getEntriesByType) {
        var navEntries = window.performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length > 0) {
          perfData = navEntries[0];
          navStart = perfData.startTime || 0;
          useModernAPI = true;
        }
      }
      // Fallback to deprecated timing API for older browsers
      if (!perfData && window.performance && window.performance.timing) {
        perfData = window.performance.timing;
        navStart = perfData.navigationStart || 0;
      }
      if (perfData) {
        log('[bootstrap] performance metrics:');
        log('   navigationStart: ' + navStart);
        var loadEventEnd = perfData.loadEventEnd;
        if (loadEventEnd && loadEventEnd > 0) {
          var loadTime = useModernAPI ? loadEventEnd : loadEventEnd - navStart;
          log('   loadTime: ' + loadTime + 'ms');
          log('   loadEventEnd: ' + loadEventEnd);
        } else {
          log('   loadTime: (not available - page still loading)');
          log('   loadEventEnd: ' + (loadEventEnd || 0));
        }
        var domContentLoadedEventEnd = perfData.domContentLoadedEventEnd;
        if (domContentLoadedEventEnd) {
          var domContentLoadedTime = useModernAPI
            ? domContentLoadedEventEnd
            : domContentLoadedEventEnd - navStart;
          log('   domContentLoadedTime: ' + domContentLoadedTime + 'ms');
        }
        var domInteractive = perfData.domInteractive;
        if (domInteractive) {
          var domInteractiveTime = useModernAPI
            ? domInteractive
            : domInteractive - navStart;
          log('   domInteractiveTime: ' + domInteractiveTime + 'ms');
        }
      }
    } catch (e) {
      log('[bootstrap] performance monitoring failed');
    }
  }
  // Log performance metrics when page is fully loaded
  if (document.readyState === 'complete') {
    logPerformanceMetrics();
  } else {
    window.addEventListener('load', logPerformanceMetrics);
  }
  // Feature-detect ESM support: presence of "noModule" on <script>
  var supportsModule = 'noModule' in document.createElement('script');
  log('[bootstrap] supportsModule: ' + String(supportsModule));
  function loadLegacy(manifest) {
    log('[bootstrap] legacy path');
    // Use hashed polyfills filename from manifest
    var polyfillsEntry = base + manifest.polyfillsLegacy;
    add(
      polyfillsEntry,
      null,
      function () {
        log('[bootstrap] polyfills loaded');
        try {
          // Vite legacy output can use System.register; when SystemJS is present use System.import
          // Otherwise fall back to plain <script> include (for IIFE-style legacy builds)
          var legacyEntry = base + manifest.appLegacy;
          if (window.System && window.System.import) {
            window.System.import(legacyEntry)
              .then(function () {
                log('[bootstrap] legacy main loaded');
                window.CANDYRACK_BOOTSTRAP = 'loaded';
              })
              .catch(function () {
                log('[bootstrap] legacy main failed');
                window.CANDYRACK_BOOTSTRAP = undefined;
              });
          } else {
            add(
              legacyEntry,
              null,
              function () {
                log('[bootstrap] legacy main loaded');
                window.CANDYRACK_BOOTSTRAP = 'loaded';
              },
              function () {
                log('[bootstrap] legacy main failed');
                window.CANDYRACK_BOOTSTRAP = undefined;
              },
            );
          }
        } catch (e) {
          log('[bootstrap] legacy load error');
          window.CANDYRACK_BOOTSTRAP = undefined;
        }
      },
      function () {
        log('[bootstrap] polyfills failed');
        window.CANDYRACK_BOOTSTRAP = undefined;
      },
    );
  }
  function startLoading(manifest) {
    if (supportsModule) {
      log('[bootstrap] modern path');
      // main ESM entry uses hashed filename from manifest for cache busting
      var modernEntry = base + manifest.app;
      add(
        modernEntry,
        { type: 'module', crossorigin: 'anonymous' },
        function () {
          log('[bootstrap] modern main loaded');
          window.CANDYRACK_BOOTSTRAP = 'loaded';
          // Inspect loaded code-split chunks for quick visibility in DevTools
          if (dbg) {
            setTimeout(function () {
              try {
                var entries =
                  performance && performance.getEntriesByType
                    ? performance.getEntriesByType('resource')
                    : [];
                var names = Array.prototype.map
                  .call(entries, function (e) {
                    return e.name;
                  })
                  .filter(function (n) {
                    return n.indexOf('candyrack-popup-') !== -1;
                  });
                log('[bootstrap] modern chunks: ' + names.join(', '));
              } catch (e) {
                log('[bootstrap] modern chunk inspection failed');
              }
            }, 0);
          }
        },
        function () {
          // Graceful degradation: if module load fails, switch to legacy
          // Note: don't mark as failed here - legacy path will handle final success/failure
          console.warn('[bootstrap] modern failed → fallback to legacy');
          loadLegacy(manifest);
        },
      );
    } else {
      loadLegacy(manifest);
    }
  }
  // Async XHR for manifest (non-blocking, prevents main thread blocking)
  // Falls back to default filenames if fetch fails
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', base + 'candyrack-popup-manifest.json', true); // true = asynchronous
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          entryManifest = JSON.parse(xhr.responseText);
          log(
            '[bootstrap] manifest loaded: app=' +
              entryManifest.app +
              ', appLegacy=' +
              entryManifest.appLegacy +
              ', polyfillsLegacy=' +
              entryManifest.polyfillsLegacy,
          );
        } catch (e) {
          log(
            '[bootstrap] manifest parse failed, using defaults: ' + String(e),
          );
        }
      } else {
        log('[bootstrap] manifest not found, using defaults');
      }
      startLoading(entryManifest);
    };
    xhr.onerror = function () {
      log('[bootstrap] manifest fetch failed, using defaults');
      startLoading(entryManifest);
    };
    xhr.send(null);
  } catch (e) {
    // If XHR setup fails, fall back to default filenames and start loading immediately
    log(
      '[bootstrap] manifest fetch setup failed, using defaults: ' + String(e),
    );
    startLoading(entryManifest);
  }
})();
