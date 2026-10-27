(function () {
  window.WishlistPlusPDPButtonAPI = window.WishlistPlusPDPButtonAPI || {};
  const defaultQtySelector = "input[name='quantity']";

  // Retailer-configured CTA strings are plain-text button labels. Markup in them is
  // never legitimate, so drop it at ingestion rather than relying on the render site.
  const MARKUP_PATTERN = /<[^>]*>/g;
  // Retailer-controlled values (colours, thickness) are interpolated into SVG
  // attribute markup that is written via outerHTML. Escape the characters that
  // can close an attribute or a tag.
  const sanitizeAttrValue = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[<>"'`]/g, "");
  };

  const sanitizeButtonText = (value) => {
    if (typeof value !== "string") return value;
    return value.replace(MARKUP_PATTERN, "").trim();
  };

  // Utility function to get setting value
  const getSettingValue = (settingName, commonSettings, retailerSettings, fallback) => {
    if (commonSettings !== undefined) {
      switch (settingName) {
        case "AddToWishlistButtonColor":
        case "AddedToWishlistButtonColor":
          if (commonSettings?.buttonType?.style === "outline" || commonSettings?.buttonType?.style === "text") {
            return "rgba(0,0,0,0)";
          }
          else if (commonSettings?.buttonType?.style === "solid") {
            return commonSettings?.primaryColor;
          }
          break;
        case "ATWButtonTextColor": 
          if (commonSettings?.buttonType?.style === "outline" || commonSettings?.buttonType?.style === "text") {
            return commonSettings?.primaryColor;
          }
          else if (commonSettings?.buttonType?.style === "solid") {
            return commonSettings?.secondaryColor;
          }
        case "ATWButtonBorderThickness": 
          if (commonSettings?.buttonType?.style === "outline") return 2
          else return 0;
        default:
          return commonSettings;
      }
    }
    else if (retailerSettings) {
      // use retailer settings
      const defaultColor = retailerSettings.Wishlist.ButtonColor;
      const defaultIcon = retailerSettings.Wishlist.ButtonIcon;
      const defaultButtonType = retailerSettings.Wishlist.ButtonType;

      switch (settingName) {
        case "ATWButtonIcon":
          if (defaultButtonType === "icontext" || defaultButtonType === "iconbtnlink" || defaultButtonType === "icon") {
            return ((defaultIcon && defaultIcon !== "thumbs-o-up") ? defaultIcon : "heart")
          } else if (defaultButtonType === "text" || defaultButtonType === "btnlink") {
            return "none";
          }
          break;
        case "AddToWishlistButtonColor":
        case "AddedToWishlistButtonColor":
          if (defaultButtonType === "icontext" || defaultButtonType === "text") {
            return defaultColor;
          } else if (defaultButtonType === "iconbtnlink" || defaultButtonType === "btnlink" || defaultButtonType === "icon") {
            return "rgba(0,0,0,0)";
          }
          break;
        case "ATWButtonTextColor":
          if (defaultButtonType === "iconbtnlink" || defaultButtonType === "btnlink" || defaultButtonType === "icon") {
            return defaultColor;
          }
          else return "#fff";
        case "ATWDisplayButtonText":
          if (defaultButtonType === "icon") {
            return false;
          } else 
            return true;
        default:
          return;
      } 
    }
    return fallback;
  }

  WishlistPlusPDPButtonAPI.setDefaultCustomizationOptions = (swat) => {
    // Checks if the pdp app block is already enabled then dont inject the default styles from here
    if (window.swymATWButtonConfig) {
      return;
    }

    const customizationSettings = window.SwymWishlistCommonCustomizationSettings;
    const addToCartStyles = WishlistPlusPDPButtonAPI.getAddToCartButtonStyles();

    window.swymATWButtonConfig = {
      'ATWButtonIcon': getSettingValue("ATWButtonIcon", customizationSettings?.icon, swat.retailerSettings, "heart"),
      'AddToWishlistButtonColor': getSettingValue("AddToWishlistButtonColor", customizationSettings, swat.retailerSettings, "#000"),
      'AddedToWishlistButtonColor': getSettingValue("AddedToWishlistButtonColor", customizationSettings, swat.retailerSettings, "#000"),
      'ATWButtonTextColor': getSettingValue("ATWButtonTextColor", customizationSettings, swat.retailerSettings, "#fff"),
      'ATWDisplayButtonText': getSettingValue("ATWDisplayButtonText", customizationSettings?.buttonType?.displayText, swat.retailerSettings, true),
      'ATWButtonBorderThickness': getSettingValue("ATWButtonBorderThickness", customizationSettings, null, 0),
      'shopifyExtensionType': "appembed",
      'ATWButtonBorderRadius': addToCartStyles?.borderRadius || "0px",
      'ATWButtonIconThickness': "1.75",
      'ATWVerticalOffset': getSettingValue("ATWVerticalOffset", customizationSettings?.pdpButtonPosition?.verticalOffset, null, 0),
      'ATWHorizontalOffset': getSettingValue("ATWHorizontalOffset",customizationSettings?.pdpButtonPosition?.horizontalOffset, null, 0),
      'ATWFullWidth': true,
      'ATWAlignButton': "center",
      'ATWCustomCSS': ``,
      'ATWButtonPosition': getSettingValue("ATWButtonPosition", customizationSettings?.pdpButtonPosition?.position, null, "default"),
      'ATWEnableHoverCustomization': false
    };
  };

  WishlistPlusPDPButtonAPI.createButtonFromScratch = () => {
    const buttonContainer = document.createElement("div");
    buttonContainer.id = "swym-atw-button-container";
    buttonContainer.className = `swym-atw-button-container 
        ${window.swymATWButtonConfig.ATWButtonPosition === "default" && "margin-top"}
        ${window.swymATWButtonConfig.ATWButtonPosition === "buy_buttons_above" && "margin-bottom buy_buttons_above"}
      `;
    if (window.swymATWButtonConfig.ATWButtonPosition === "default") {
      buttonContainer.classList.add("default-position");
    }

    const button = document.createElement("button");
    button.id = "swym-atw-pdp-button";
    button.type = "button";
    button.setAttribute("aria-label", "Add to wishlist");
    button.className = `atw-button atw-button-loading atw-button-add-color atw-button-add ${
      window.swymATWButtonConfig.ATWDisplayButtonText && "show-btn-text"
    } ${window.swymATWButtonConfig.ATWFullWidth && "full-width"}`;

    const svgIcon = document.createElement("svg");
    svgIcon.id = "swym-atw-pdp-button-icon";
    svgIcon.className = "atw-button-icon";
    svgIcon.setAttribute("aria-hidden", "true");
    svgIcon.setAttribute("focusable", "false");

    const buttonText = document.createElement("span");
    buttonText.id = "swym-atw-pdp-button-text";
    buttonText.className = "atw-button-text";
    buttonText.setAttribute("aria-hidden", "true");

    const loaderWrapper = document.createElement("div");
    loaderWrapper.id = "swym-atw-animated-loader-wrapper";
    loaderWrapper.className = "swym-atw-animated-loader-wrapper";

    const loader = document.createElement("div");
    loader.id = "swym-atw-animated-loader";

    loaderWrapper.appendChild(loader);
    button.appendChild(svgIcon);
    button.appendChild(buttonText);
    button.appendChild(loaderWrapper);
    buttonContainer.appendChild(button);

    return buttonContainer;
  };

  WishlistPlusPDPButtonAPI.themePresetData = null;
  WishlistPlusPDPButtonAPI.injectDefaultButton = () => {
    return new Promise((resolve) => {
      const buttonContainer = WishlistPlusPDPButtonAPI.createButtonFromScratch();
      
      const injectDefault = () => {
          const addToCartButton = WishlistPlusPDPButtonAPI.getAddToCartButton();
          if (addToCartButton && addToCartButton.parentNode) {
              if (window.swymATWButtonConfig?.ATWButtonPosition === "buy_buttons_above") {
                  addToCartButton.parentNode.insertBefore(buttonContainer, addToCartButton);
              } else {
                  addToCartButton.parentNode.appendChild(buttonContainer);
              }
          }
          resolve(); // Resolve after default injection
      };

      const currentThemeName = window?.Shopify?.theme?.schema_name?.trim();
      const currentThemeId = window?.Shopify?.theme?.theme_store_id;
      const injectWithPresetOrFallback = () => {
        if (currentThemeId || currentThemeName) {
          window._swat.fetchThemePreset({ themeStoreId: currentThemeId || 0, schemaName:  currentThemeName}, (data) => {
            // Store the preset data for later use
            WishlistPlusPDPButtonAPI.themePresetData = data;
            const presetATWButtonSelector = data?.ATWButtonConfig?.[0]?.defaultParentSelectorDesktop;
            if (presetATWButtonSelector) {
              const customParentElement = document.querySelector(presetATWButtonSelector);
              if (customParentElement) {
                customParentElement.appendChild(buttonContainer);
                  if(data?.ATWButtonConfig?.[0]?.ATWButtonCustomCSS) {
                    WishlistPlusPDPButtonAPI.injectStylesheet(`${data?.ATWButtonConfig?.[0]?.ATWButtonCustomCSS}`);  
                  }
                resolve(); // Resolve after preset injection
                return; // Success - don't call fallback
              }
            }
            // Fallback if preset fails
            injectDefault();
          }, () => {injectDefault()});
        } else {
          injectDefault();
        }
      };
      
      injectWithPresetOrFallback();

      // Inject custom styles for the button
      const buttonStyles = `
        .atw-button span {
          color: ${window.swymATWButtonConfig.ATWButtonTextColor};
        }

        .atw-button-add {
          background: ${window.swymATWButtonConfig.AddToWishlistButtonColor};
        }

        .atw-button-added {
          background: ${window.swymATWButtonConfig.AddedToWishlistButtonColor};
        }

        .swym-atw-button-container {
          transform: translateY(${window.swymATWButtonConfig.ATWVerticalOffset}px);
        }

        .atw-button {
          border: ${window.swymATWButtonConfig.ATWButtonBorderThickness}px solid ${window.swymATWButtonConfig.ATWButtonTextColor};
          border-radius: ${window.swymATWButtonConfig.ATWButtonBorderRadius};
        }
      `;

      WishlistPlusPDPButtonAPI.injectStylesheet(buttonStyles);
    });
  };
  
  WishlistPlusPDPButtonAPI.injectStylesheet = (cssString) => {
    const styleElement = document.createElement("style");
    styleElement.type = "text/css";

    if (styleElement.styleSheet) {
      // For older versions of IE
      styleElement.styleSheet.cssText = cssString;
    } else {
      // For modern browsers
      styleElement.appendChild(document.createTextNode(cssString));
    }
    document.head.appendChild(styleElement);
  };

  const WishlistState = {
    isItemInWishlist: false,
    socialCount: 0,
    setSocialCount(swat, buttonReference, value) {
      // Update the buttons social count too.
      this.socialCount = value;
      WishlistPlusPDPButtonAPI.updateButtonState(swat, buttonReference, "");
    },
    setIsItemInWishlist(value) {
      this.isItemInWishlist = value;
    },
  };

  WishlistPlusPDPButtonAPI.getAddToCartButton = () => {
    return document.querySelector("form[action*='/cart/add'] button[type='submit']");
  };

  WishlistPlusPDPButtonAPI.getAddToCartButtonStyles = () => {
    const addToCartButton = WishlistPlusPDPButtonAPI.getAddToCartButton();

    if (addToCartButton) {
      const computedStyles = window.getComputedStyle(addToCartButton);
      const fontSize = computedStyles.fontSize;
      const fontFamily = computedStyles.fontFamily;
      const fontWeight = computedStyles.fontWeight;
      const letterSpacing = computedStyles.letterSpacing;
      const borderRadius = computedStyles.borderRadius;
      
      // Check if button text is in uppercase
      const buttonText = addToCartButton.innerText || addToCartButton.textContent || '';
      const isUpperCase = buttonText.trim() === buttonText.trim().toUpperCase() && buttonText.trim().length > 0;

      return { fontSize, fontFamily, fontWeight, letterSpacing, borderRadius, isUpperCase };
    } else {
      return null;
    }
  };

  WishlistPlusPDPButtonAPI.applyAddToCartButtonStyles = () => {
    const styles = WishlistPlusPDPButtonAPI.getAddToCartButtonStyles();
    const buttonReference = document.getElementById("swym-atw-pdp-button");

    if (styles && buttonReference) {
      const styleKeys = ["fontSize", "fontFamily", "fontWeight", "letterSpacing"];

      styleKeys.forEach((key) => {
        if (styles[key]) {
          buttonReference.style[key] = styles[key];
        }
      });

      // If the merchant has not set any border radius for the app block, then apply the add to cart button border radius
      if (styles.borderRadius && window.swymATWButtonConfig.ATWButtonBorderRadius === 0) {
        buttonReference.style.borderRadius = styles.borderRadius;
      }
    } else {
      if (!styles) {
        console.warn("Add to Cart button styles not found.");
      }
      if (!buttonReference) {
        console.warn("Could not find Wishlist button reference.");
      }
    }
  };

  WishlistPlusPDPButtonAPI.getLargestVisibleImage = () => {
    const images = Array.from(document.querySelectorAll("img"));
    if (images.length === 0) {
      console.warn("No images found on the page.");
      return null;
    }
    // Filter out images that are not visible
    const visibleImages = images.filter((img) => {
      const { width, height } = img.getBoundingClientRect();
      const style = getComputedStyle(img);
      return width > 0 && height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity > 0;
    });

    // Find the visible image with the largest area
    const largestImage = visibleImages.reduce((largest, img) => {
      const { width, height } = img.getBoundingClientRect();
      const area = width * height;
      return area > (largest.area || 0) ? { img, area } : largest;
    }, {});

    return largestImage.img || null; // Return the largest visible image element or null if none
  };

  WishlistPlusPDPButtonAPI.getProductTitleDOMElement = (addToCartButton) => {
    function getClosestH1(addToCartButton) {
      let currentElement = addToCartButton;

      while (currentElement) {
        const h1 = currentElement.querySelector("h1");
        if (h1) {
          return h1; // Return the text content of the first <h1> found
        }
        currentElement = currentElement.parentElement;
      }
      return null;
    }

    const h1Tag = getClosestH1(addToCartButton);

    if (!h1Tag) {
      console.warn("Could not find the product title");
    }

    return h1Tag;
  };

  WishlistPlusPDPButtonAPI.isMobile = () => {
    return window.innerWidth <= 768;
  };
  WishlistPlusPDPButtonAPI.insertSwymAtwButton = (buttonPosition) => {
    // if in preset data, then use the selector from there
    const config = WishlistPlusPDPButtonAPI.themePresetData?.ATWButtonConfig?.[0];
    const isMobile = WishlistPlusPDPButtonAPI.isMobile();

    let largestImage = WishlistPlusPDPButtonAPI.getLargestVisibleImage();
    if (WishlistPlusPDPButtonAPI.themePresetData) {
        const imageSelector = isMobile 
            ? config?.productImageSelectorMobile 
            : config?.productImageSelectorDesktop;
        if (imageSelector) {
            const customImage = document.querySelector(imageSelector);
            if (customImage) {
                largestImage = customImage;
            }
        }
    }
    
    const imageParent = largestImage?.parentNode;


    // Handle Add to Cart Button
    let addToCartButton = WishlistPlusPDPButtonAPI.getAddToCartButton();
    if (WishlistPlusPDPButtonAPI.themePresetData) {
        const cartSelector = isMobile 
            ? config?.addToCartButtonSelectorMobile 
            : config?.addToCartButtonSelectorDesktop;
        if (cartSelector) {
            const customAddToCartButton = document.querySelector(cartSelector);
            if (customAddToCartButton) {
                addToCartButton = customAddToCartButton;
            }
        }
    }

    const atwButtonContainer = document.getElementById("swym-atw-button-container");
    const atwButton = document.getElementById("swym-atw-pdp-button");
    const addToCartButtonParent = addToCartButton?.parentNode;
    const buttonsWrapper = document.getElementById("swym-embed-pdp-btn-wrapper") || document.createElement("div");

      // Handle Product Title
    let productTitleElement = WishlistPlusPDPButtonAPI.getProductTitleDOMElement(addToCartButton);
    if (WishlistPlusPDPButtonAPI.themePresetData) {
        const titleSelector = isMobile 
            ? config?.productTitleSelectorMobile 
            : config?.productTitleSelectorDesktop;
        if (titleSelector) {
            const customTitleElement = document.querySelector(titleSelector);
            if (customTitleElement) {
                productTitleElement = customTitleElement;
            }
        }
    }
    
    const productTitleWrapper = productTitleElement?.parentNode;

    function handleImagePositioning(imagePosition) {


      if (!largestImage || !imageParent) {
        console.warn("[Swym] Cannot find image, please contact support or change button position");
        return;
      }

      buttonsWrapper.classList.add("swym-atw-btn-wrapper-for-img");
      buttonsWrapper.classList.add(imagePosition);
      atwButtonContainer.classList.add(imagePosition);

      buttonsWrapper.appendChild(atwButtonContainer);

      imageParent.style.position = "relative";
      imageParent.appendChild(buttonsWrapper);
    }

    function handleAddToCartPositioning(buttonPosition) {
      if (!addToCartButton || !addToCartButtonParent || addToCartButtonParent.contains(buttonsWrapper)) {
        console.warn("Could not find add to cart button");
        return;
      }

      buttonsWrapper.classList.add("swym-atw-btn-wrapper");
      buttonsWrapper.classList.add(`${buttonPosition}-position`);
      buttonsWrapper.id = "swym-embed-pdp-btn-wrapper";

      addToCartButtonParent.insertBefore(buttonsWrapper, addToCartButton);
      buttonsWrapper.appendChild(addToCartButton);

      buttonsWrapper.insertBefore(atwButtonContainer, addToCartButton);
      atwButtonContainer.classList.add(`${buttonPosition}-position`);
      atwButton.classList.add(`${buttonPosition}-position`);
    }

    function handleTitlePositioning(buttonPosition) {
      if (!productTitleElement || !productTitleWrapper) {
        console.warn("Could not find product title");
        return;
      }

      buttonsWrapper.classList.add("swym-atw-btn-wrapper");
      buttonsWrapper.classList.add(`${buttonPosition}-position`);
      buttonsWrapper.id = "swym-embed-pdp-btn-wrapper";

      productTitleWrapper.insertBefore(buttonsWrapper, productTitleElement);
      buttonsWrapper.appendChild(productTitleElement);

      buttonsWrapper.insertBefore(atwButtonContainer, productTitleElement);
      atwButtonContainer.classList.add(`${buttonPosition}-position`);
      atwButton.classList.add(`${buttonPosition}-position`);
    }

    if (!atwButton) {
      console.warn("Wishlist button not found. Contact Support");
      return;
    }

    switch (buttonPosition) {
      case "add_to_cart_button_left":
        handleAddToCartPositioning("add_to_cart_button_left");
        break;
      case "add_to_cart_button_right":
        handleAddToCartPositioning("add_to_cart_button_right");
        break;
      case "product_image_top_right":
        handleImagePositioning("product_image_top_right");
        break;
      case "product_image_top_left":
        handleImagePositioning("product_image_top_left");
        break;
      case "product_image_bottom_right":
        handleImagePositioning("product_image_bottom_right");
        break;
      case "product_image_bottom_left":
        handleImagePositioning("product_image_bottom_left");
        break;
      case "product_title_left":
        handleTitlePositioning("product_title_left");
        break;
      case "product_title_right":
        handleTitlePositioning("product_title_right");
        break;
      default:
        console.warn("[Swym] Position is not supported");
        break;
    }
  };

  WishlistPlusPDPButtonAPI.initializePDPButton = async (swat, shouldAttachVariantChangeListener) => {
    try {
      const atwButtonContainer = document.getElementById("swym-atw-button-container");
      const wishlistAppDetails = swat.getApp("Wishlist");
      
      if (!atwButtonContainer) {
        await WishlistPlusPDPButtonAPI.injectDefaultButton();
      }

      // Consent check function - handles privacy consent for button visibility
      function checkConsent() {
        const btn = document.getElementById('swym-atw-button-container');
        
        // Keep checking if button doesn't exist yet (DOM not ready)
        if (!btn) {
          requestAnimationFrame(checkConsent);
          return;
        }
        
        // Allow button to show in design mode (theme editor) regardless of consent
        if (window.Shopify?.designMode) {
          btn.classList.add('consent-given');
          return;
        }
        
        const consent = window.Shopify?.customerPrivacy?.preferencesProcessingAllowed?.();
        if (consent === true) {
          // Show button when consent is given explicitly
          btn.classList.add('consent-given');
        } else if (consent === false) {
          // Remove button when consent is denied 
          btn.remove();
        } else {
          // Keep checking if consent state is still being determined
          requestAnimationFrame(checkConsent);
        }
      }
      
      // Initialize consent check after button is guaranteed to exist
      setTimeout(checkConsent, 0); // Ensure DOM is ready before checking
      document.addEventListener('visitorConsentCollected', checkConsent);

      if (atwButtonContainer && wishlistAppDetails && !wishlistAppDetails.enabled) {
        // Prevent initialization when app is disabled due to quota or other reasons.
        atwButtonContainer.remove();
        return;
      }
    
      const buttonReference = document.getElementById("swym-atw-pdp-button");
      const updateStringsOnStringsLoaded = () => {
        if (swat?.retailerSettings?.Strings && window.swymATWButtonConfig) {
          const strings = swat.retailerSettings.Strings;
          if (strings?.WishlistAddedCTA && strings?.WishlistAddCTA) {
            const styles = WishlistPlusPDPButtonAPI.getAddToCartButtonStyles();
            const isUpperCase = styles?.isUpperCase || false;
            // A markup-only label sanitises to "", which would freeze the default
            // state branch and leave a stale label, so keep the configured default.
            const addedCTA = sanitizeButtonText(strings.WishlistAddedCTA) || window.swymATWButtonConfig.AddedToWishlistButtonText;
            const addCTA = sanitizeButtonText(strings.WishlistAddCTA) || window.swymATWButtonConfig.AddToWishlistButtonText;
            window.swymATWButtonConfig.AddedToWishlistButtonText = isUpperCase ? addedCTA.toUpperCase() : addedCTA;
            window.swymATWButtonConfig.AddToWishlistButtonText = isUpperCase ? addCTA.toUpperCase() : addCTA;
          }
        }
        WishlistPlusPDPButtonAPI.updateButtonState(swat, buttonReference, "loading");
        const newState = WishlistState.isItemInWishlist ? "addedToWishlist" : "addToWishlist";
        WishlistPlusPDPButtonAPI.updateButtonState(swat, buttonReference, newState);
      }
      
      const buttonPosition = window.swymATWButtonConfig.ATWButtonPosition;
      if (buttonPosition !== "default") {
        WishlistPlusPDPButtonAPI.insertSwymAtwButton(buttonPosition);
      }

      WishlistPlusPDPButtonAPI.applyAddToCartButtonStyles();

      const currentPageData = swat.currentPageData;

      const disallowedTags = swat?.retailerSettings?.Wishlist?.DisallowedTags;
      const productTags = window?.SwymProductInfo?.product?.tags;

      if (disallowedTags && productTags && disallowedTags?.length > 0) {
        const isDisallowed = disallowedTags?.some(tag => productTags.includes(tag));
        if (isDisallowed) {
          buttonReference.classList.add('swym-button-disabled');
          return;
        }
      }
      
      const socialCountEnabled = swat?.retailerSettings?.Wishlist?.EnableFaveCount;
      if (socialCountEnabled) {
        const product = { epi: currentPageData.epi, empi: currentPageData.empi, du: currentPageData.du };
        let socialCount = -1;
        if (window.SwymViewProducts && product.empi && window.SwymViewProducts[product.empi]) {
          socialCount = window.SwymViewProducts[product.empi].socialCount;
        }
        
        if (socialCount >= 0) {
          // Use the social count from window variable if it's valid (not -1)
          WishlistState.setSocialCount(swat, buttonReference, socialCount);
        } else {
          // Fallback to getSocialCount API if metafield value is -1 (not available)
          swat?.api.wishlist.getSocialCount(
            product,
            (data) => {
                if (data?.data?.count != null) {
                WishlistState.setSocialCount(swat, buttonReference, data.data.count);
                }
            },
            () => console.warn("Failed to get social count for", product)
          );
        }
      }

      const svgRef = document.getElementById("swym-atw-pdp-button-icon");

      if (window.swymATWButtonConfig.ATWCustomCSS) {
        WishlistPlusPDPButtonAPI.injectStylesheet(window.swymATWButtonConfig.ATWCustomCSS);
      }

      if (window.swymATWButtonConfig.ATWButtonIcon === "none") {
        svgRef.classList.add("atw-button-no-icon");
      }

      if (!currentPageData) {
        console.log("[Swym] Error no page data found");
        return;
      }

      // Initialize button state as 'added to wishlist' or 'add to wishlist' after fetching wishlist items.
      const fetchWLCallback = (wishlistedProducts) => {
        const wishlistedItems = WishlistPlusPDPButtonAPI.getDuAndEpiOfWishlistedProducts(wishlistedProducts, swat);

        const isItemInWL = wishlistedItems.some((item) => item.epi === currentPageData?.epi);
        WishlistState.setIsItemInWishlist(isItemInWL);

        updateStringsOnStringsLoaded();
        swat.evtLayer.addEventListener(swat.JSEvents.StringsLoaded, function(e) {
          // In case strings are coming from locale etc
          updateStringsOnStringsLoaded();
        });

        WishlistPlusPDPButtonAPI.attachEventListenersToButton(swat, buttonReference, currentPageData?.du, currentPageData?.epi);
      };

      if (shouldAttachVariantChangeListener) {
        WishlistPlusPDPButtonAPI.attachVariantChangeListener(swat);
      }
      WishlistPlusPDPButtonAPI.fetchWishlistedProducts(fetchWLCallback, swat);
      WishlistPlusPDPButtonAPI.setupXHRTrapForUnwishlisting(swat);
    } catch (error) {
      swat?.utils.log(error);
    }
  };

  // Mirrors SwymWishlistPDPButtonAPI.updateAriaAttributes in advanced-pdp-button.js.
  // The button text span is aria-hidden, so this label is the whole accessible name and
  // has to track the wishlist state on its own. It cannot be derived from the visible
  // text: icon-only buttons render no text at all.
  WishlistPlusPDPButtonAPI.updateAriaAttributes = (buttonReference, isItemInWishlist) => {
    if (!buttonReference) return;
    buttonReference.setAttribute("aria-pressed", String(isItemInWishlist));
    buttonReference.setAttribute("aria-label", isItemInWishlist ? "Remove from wishlist" : "Add to wishlist");
  };

  WishlistPlusPDPButtonAPI.updateButtonState = (swat, buttonReference, newState) => {
    if (!buttonReference) {
      console.log("[Swym] - Error No button reference found!");
      return;
    }

    const socialCountEnabled = swat?.retailerSettings?.Wishlist?.EnableFaveCount;
    const socialCountText = socialCountEnabled ? ` (${WishlistState.socialCount})` : "";
    const isMultiListEnabled = swat?.retailerSettings?.Wishlist?.EnableCollections;
    const isControlCentreEnabled = 
      window?.SwymEnabledCommonFeatures?.["control-centre"] ||  
      window?.SwymStorefrontLayoutContext?.Settings?.EnableStorefrontLayout;


    const btnTextRef = document.getElementById("swym-atw-pdp-button-text");
    const svgRef = document.getElementById("swym-atw-pdp-button-icon");
    const loaderRef = document.getElementById("swym-atw-animated-loader");
    let svgAttrs, newSvgHtml;
    switch (newState) {
      case "loading":
        buttonReference.classList.add("atw-button-loading");
        loaderRef.classList.add("dot-flashing-loader");
        break;
      case "addToWishlist":
        buttonReference.classList.remove("atw-button-loading");
        loaderRef.classList.remove("dot-flashing-loader");
        buttonReference.classList.remove("atw-button-added");

        if (svgRef) {
          // Build a full SVG string
          svgAttrs = Array.from(svgRef.attributes).map(a => `${a.name}="${sanitizeAttrValue(a.value)}"`).join(" ");
          newSvgHtml = 
          `<svg ${svgAttrs} xmlns="http://www.w3.org/2000/svg">
          ${WishlistPlusPDPButtonAPI.getIcon(window.swymATWButtonConfig.ATWButtonIcon, sanitizeAttrValue(window.swymATWButtonConfig.ATWButtonTextColor), sanitizeAttrValue(window.swymATWButtonConfig.ATWButtonIconThickness))["icon-unfilled"]}
          </svg>`;
          
          // Replace the entire element
          // Note: This is done to ensure that the SVG is re-rendered correctly, 
          // We faced errors with the SVG not rendering properly on load, when using innerHTML directly.
          svgRef.outerHTML = newSvgHtml;
          // This triggered a full reparse of the SVG element, which forced the browser to treat the contents correctly as SVG (not plain HTML), resulting in the icon rendering as expected.
        }

        btnTextRef.textContent = window.swymATWButtonConfig.ATWDisplayButtonText
          ? window.swymATWButtonConfig.AddToWishlistButtonText + socialCountText
          : "";
        btnTextRef.setAttribute("aria-hidden", btnTextRef.textContent ? "false" : "true");

        buttonReference.classList.add("atw-button-add");
        WishlistPlusPDPButtonAPI.updateAriaAttributes(buttonReference, false);
        break;
      case "addedToWishlist":
        buttonReference.classList.remove("atw-button-loading");
        loaderRef.classList.remove("dot-flashing-loader");
        buttonReference.classList.remove("atw-button-add");
        
        if (svgRef) {
          svgAttrs = Array.from(svgRef.attributes).map(a => `${a.name}="${sanitizeAttrValue(a.value)}"`).join(" ");
          newSvgHtml = 
          `<svg ${svgAttrs} xmlns="http://www.w3.org/2000/svg">
          ${WishlistPlusPDPButtonAPI.getIcon(window.swymATWButtonConfig.ATWButtonIcon, sanitizeAttrValue(window.swymATWButtonConfig.ATWButtonTextColor), sanitizeAttrValue(window.swymATWButtonConfig.ATWButtonIconThickness))["icon-filled"]}
          </svg>`;
          svgRef.outerHTML = newSvgHtml;
          // This triggered a full reparse of the SVG element, which forced the browser to treat the contents correctly as SVG (not plain HTML), resulting in the icon rendering as expected.
        } 

        btnTextRef.textContent = window.swymATWButtonConfig.ATWDisplayButtonText
          ? (isMultiListEnabled && !isControlCentreEnabled ? window.swymATWButtonConfig.AddToWishlistButtonText : window.swymATWButtonConfig.AddedToWishlistButtonText) + socialCountText
          : "";
        btnTextRef.setAttribute("aria-hidden", btnTextRef.textContent ? "false" : "true");

        buttonReference.classList.add("atw-button-added");
        WishlistPlusPDPButtonAPI.updateAriaAttributes(buttonReference, true);
        break;
      default:
        buttonReference.classList.remove("atw-button-loading");
        loaderRef.classList.remove("dot-flashing-loader");

        if (window.swymATWButtonConfig.ATWDisplayButtonText && (window.swymATWButtonConfig.AddToWishlistButtonText || window.swymATWButtonConfig.AddedToWishlistButtonText)) {
          btnTextRef.textContent = WishlistState?.isItemInWishlist
            ? window.swymATWButtonConfig.AddedToWishlistButtonText + socialCountText
            : window.swymATWButtonConfig.AddToWishlistButtonText + socialCountText;
          btnTextRef.setAttribute("aria-hidden", btnTextRef.textContent ? "false" : "true");
        }
        WishlistPlusPDPButtonAPI.updateAriaAttributes(buttonReference, !!WishlistState?.isItemInWishlist);
        // console.warn("[Swym]Unknown state:", newState);
        break;
    }
  };

  WishlistPlusPDPButtonAPI.fetchWishlistedProducts = async (callbackFn, swat) => {
    const isMultiListEnabled = swat.retailerSettings?.Wishlist?.EnableCollections;

    if (isMultiListEnabled) {
      swat.api.fetchLists({
        callbackFn: callbackFn,
        errorFn: (err) => {
          swat?.utils.log(`Error fetching lists for swym wishlist pdp button. Error: ${err}`);
        },
      });
    } else {
      swat.api.fetch(callbackFn, (err) => {
        swat?.utils.log(`Error fetching wishlist swym wishlist pdp button. Error: ${err}`);
      });
    }
  };

  WishlistPlusPDPButtonAPI.getDuAndEpiOfWishlistedProducts = (wishlistedProducts, swat) => {
    const isMultiListEnabled = swat.retailerSettings?.Wishlist?.EnableCollections;
    let wishlistedItems = [];
    if (isMultiListEnabled) {
      const lists = wishlistedProducts.map((list) => list?.listcontents || []);
      lists.forEach((list) => {
        list.forEach((item) => {
          const cleanedDu = swat?.platform.getProductUrl(item.du);
          wishlistedItems.push({ du: cleanedDu, epi: item.epi });
        });
      });
    } else {
      wishlistedItems = wishlistedProducts.map((product) => {
        const cleanedDu = swat?.platform.getProductUrl(product.du);
        return { du: cleanedDu, epi: product.epi };
      });
    }
    return wishlistedItems;
  };

  WishlistPlusPDPButtonAPI.setupXHRTrapForUnwishlisting = (swat) => {
    swat.evtLayer.addEventListener(swat.JSEvents.xhrTrap, function (event) {
      const xhr = event.detail.d;
      const pathsToListen = ["/epiRecordWishlist", "/removeWishlistDefault", "/delete-list", "/update-ctx", "/update-multiple-ctx"];
      if (pathsToListen.some((p) => xhr._swAction.indexOf(p) > -1)) {
        xhr._swOnSendComplete = function () {
          if (xhr.status == 200) {
            setTimeout(() => {
              WishlistPlusPDPButtonAPI.initializePDPButton(swat, false)
            }, 400);
          }
        };
      }
    });
  };

  WishlistPlusPDPButtonAPI.attachEventListenersToButton = (swat, buttonReference, currentDu, currentEpi) => {
    try {
      // AllowToggle controls whether clicking on "Added to Wishlist" removes the item from wishlist.
      const allowToggleWL = swat.retailerSettings?.Wishlist?.AllowToggle;
      const isMultiListEnabled = swat.retailerSettings?.Wishlist?.EnableCollections;
      const isControlCentreEnabled = 
        window?.SwymEnabledCommonFeatures?.["control-centre"] ||  
        window?.SwymStorefrontLayoutContext?.Settings?.EnableStorefrontLayout;

      const atwButton = document.getElementById("swym-atw-pdp-button");

      // Remove existing listener if it was previously added
      if (atwButton.swymClickHandler) {
        atwButton.removeEventListener("click", atwButton.swymClickHandler);
      }

      const removeFromWishlistSuccessCallback = isMultiListEnabled
        ? (res, isProductRemovedFromAllList) => {
            if (isProductRemovedFromAllList) {
              WishlistPlusPDPButtonAPI.updateButtonState(swat, buttonReference, "addToWishlist");
              WishlistState.setIsItemInWishlist(false);
            }
          }
        : (res) => {
            WishlistPlusPDPButtonAPI.updateButtonState(swat, buttonReference, "addToWishlist");
            WishlistState.setIsItemInWishlist(false);
          };
      const clickHandler = (e) => {
        // to prevent the button from triggering the Add to cart action when clicking on the button.
        e.preventDefault();
        e.stopPropagation();
        if (!allowToggleWL && WishlistState.isItemInWishlist && !isMultiListEnabled) {
          return;
        }
        // If multiple lists and control center are enabled, and the product is already in the wishlist // trigger the UI to open for better user experience.
        if (isMultiListEnabled && isControlCentreEnabled && WishlistState.isItemInWishlist)  {
          window?.SwymStorefrontLayoutExtensions?.SwymStorefrontLayoutPageActions?.setData({ listId: window.SwymStorefrontLayoutContext?.DefaultList?.lid,list: window.SwymStorefrontLayoutContext?.DefaultList,item: window.SwymPageData,collections: window.SwymStorefrontLayoutContext?.collections,actionType: window.SwymStorefrontLayoutContext?.ActionTypes.AddToCollection});
          window.SwymStorefrontLayoutExtensions?.SwymStorefrontLayoutPageActions?.openDrawer()
          return;
        }

        let selectedQty = 1;
        if (WishlistPlusPDPButtonAPI.isSfsFeatureEnabled("WishlistQuantity", swat.retailerSettings)) {
          const qtySelector = swat.retailerSettings?.General?.EngageUI?.Settings?.QtySelector || defaultQtySelector;
          if (qtySelector) {
            const qtyContainer = document.querySelector(qtySelector);
            if (qtyContainer) {
              selectedQty = parseInt(qtyContainer.value, 10) || 1;
            }
          }
        }

        WishlistPlusPDPButtonAPI.updateButtonState(swat, buttonReference, "loading");
        if (!WishlistState.isItemInWishlist) {
          swat.addToWishlistUsingDu(
            {
              du: currentDu,
              epi: currentEpi,
              source: swat.wishlistSources.pdp,
              qty: selectedQty
            },
            (res) => {
              WishlistState.setIsItemInWishlist(true);
              WishlistPlusPDPButtonAPI.updateButtonState(swat, buttonReference, "addedToWishlist");
            },
            (err) => {
              swat?.utils.log(`Failed to add to wishlist. Error: ${err}`);
            }
          );
        }
        else if (WishlistState.isItemInWishlist && isMultiListEnabled) {
          swat.addToWishlistUsingDu(
            {
              du: currentDu,
              epi: currentEpi,
              source: swat.wishlistSources.pdp,
              qty: selectedQty
            },
            (res, isProductRemovedFromAllList) => {
              WishlistState.setIsItemInWishlist(true);
              if (isProductRemovedFromAllList)
                WishlistPlusPDPButtonAPI.updateButtonState(swat, buttonReference, "addToWishlist");
              else 
                WishlistPlusPDPButtonAPI.updateButtonState(swat, buttonReference, "addedToWishlist");
            },
            (err) => {
              swat?.utils.log(`Failed to add to wishlist. Error: ${err}`);
            }
          );
        } 
        else if (allowToggleWL && WishlistState.isItemInWishlist) {
          swat.removeFromWishlistUsingDu(
            {
              du: currentDu,
              epi: currentEpi,
              qty: selectedQty
            },
            removeFromWishlistSuccessCallback,
            (err) => {
              swat?.utils.log(`Failed to add to wishlist. Error: ${err}`);
            }
          );
        }
      }

      atwButton.swymClickHandler = clickHandler;
      atwButton.addEventListener("click", clickHandler);
    } catch (error) {
      console.log("[Error] ", error);
    }
  };

  WishlistPlusPDPButtonAPI.attachVariantChangeListener = (swat) => {
    swat.evtLayer.addEventListener(swat.JSEvents.variantChanged, function(rawVariantChangeData){
      WishlistPlusPDPButtonAPI.initializePDPButton(swat, false);
    })
  }

  WishlistPlusPDPButtonAPI.getIcon = (iconType, color="#000", thickness="1.7") => {
    const iconConfig = {
      "icon-filled": iconType === "heart" ? 
        `<path d="M19.6706 5.4736C17.6806 3.8336 14.7206 4.1236 12.8906 5.9536L12.0006 6.8436L11.1106 5.9536C9.29063 4.1336 6.32064 3.8336 4.33064 5.4736C2.05064 7.3536 1.93063 10.7436 3.97063 12.7836L11.6406 20.4536C11.8406 20.6536 12.1506 20.6536 12.3506 20.4536L20.0206 12.7836C22.0706 10.7436 21.9506 7.3636 19.6706 5.4736Z" 
          stroke="${color}" stroke-width="${thickness}px" fill="${color}" stroke-linecap="round" stroke-linejoin="round" />` : 
        iconType === "star" ? 
        `<path d="M11.2691 4.41115C11.5006 3.89177 11.6164 3.63208 11.7776 3.55211C11.9176 3.48263 12.082 3.48263 12.222 3.55211C12.3832 3.63208 12.499 3.89177 12.7305 4.41115L14.5745 8.54808C14.643 8.70162 14.6772 8.77839 14.7302 8.83718C14.777 8.8892 14.8343 8.93081 14.8982 8.95929C14.9705 8.99149 15.0541 9.00031 15.2213 9.01795L19.7256 9.49336C20.2911 9.55304 20.5738 9.58288 20.6997 9.71147C20.809 9.82316 20.8598 9.97956 20.837 10.1342C20.8108 10.3122 20.5996 10.5025 20.1772 10.8832L16.8125 13.9154C16.6877 14.0279 16.6252 14.0842 16.5857 14.1527C16.5507 14.2134 16.5288 14.2807 16.5215 14.3503C16.5132 14.429 16.5306 14.5112 16.5655 14.6757L17.5053 19.1064C17.6233 19.6627 17.6823 19.9408 17.5989 20.1002C17.5264 20.2388 17.3934 20.3354 17.2393 20.3615C17.0619 20.3915 16.8156 20.2495 16.323 19.9654L12.3995 17.7024C12.2539 17.6184 12.1811 17.5765 12.1037 17.56C12.0352 17.5455 11.9644 17.5455 11.8959 17.56C11.8185 17.5765 11.7457 17.6184 11.6001 17.7024L7.67662 19.9654C7.18404 20.2495 6.93775 20.3915 6.76034 20.3615C6.60623 20.3354 6.47319 20.2388 6.40075 20.1002C6.31736 19.9408 6.37635 19.6627 6.49434 19.1064L7.4341 14.6757C7.46898 14.5112 7.48642 14.429 7.47814 14.3503C7.47081 14.2807 7.44894 14.2134 7.41394 14.1527C7.37439 14.0842 7.31195 14.0279 7.18708 13.9154L3.82246 10.8832C3.40005 10.5025 3.18884 10.3122 3.16258 10.1342C3.13978 9.97956 3.19059 9.82316 3.29993 9.71147C3.42581 9.58288 3.70856 9.55304 4.27406 9.49336L8.77835 9.01795C8.94553 9.00031 9.02911 8.99149 9.10139 8.95929C9.16534 8.93081 9.2226 8.8892 9.26946 8.83718C9.32241 8.77839 9.35663 8.70162 9.42508 8.54808L11.2691 4.41115Z" 
          stroke="${color}" stroke-width="${thickness}px" fill="${color}" stroke-linecap="round" stroke-linejoin="round"/>` :
        iconType === "bookmark" ? 
        `<path d="M5 6.2C5 5.07989 5 4.51984 5.21799 4.09202C5.40973 3.71569 5.71569 3.40973 6.09202 3.21799C6.51984 3 7.07989 3 8.2 3H15.8C16.9201 3 17.4802 3 17.908 3.21799C18.2843 3.40973 18.5903 3.71569 18.782 4.09202C19 4.51984 19 5.07989 19 6.2V21L12 16L5 21V6.2Z" 
          stroke="${color}" stroke-width="${thickness}px" fill="${color}" stroke-linejoin="round"/>` : ``,
      "icon-unfilled": iconType === "heart" ? 
        `<path d="M19.6706 5.4736C17.6806 3.8336 14.7206 4.1236 12.8906 5.9536L12.0006 6.8436L11.1106 5.9536C9.29063 4.1336 6.32064 3.8336 4.33064 5.4736C2.05064 7.3536 1.93063 10.7436 3.97063 12.7836L11.6406 20.4536C11.8406 20.6536 12.1506 20.6536 12.3506 20.4536L20.0206 12.7836C22.0706 10.7436 21.9506 7.3636 19.6706 5.4736Z" 
          stroke="${color}" stroke-width="${thickness}px" fill="none" stroke-linecap="round" stroke-linejoin="round" />` : 
        iconType === "star" ? 
        `<path d="M11.2691 4.41115C11.5006 3.89177 11.6164 3.63208 11.7776 3.55211C11.9176 3.48263 12.082 3.48263 12.222 3.55211C12.3832 3.63208 12.499 3.89177 12.7305 4.41115L14.5745 8.54808C14.643 8.70162 14.6772 8.77839 14.7302 8.83718C14.777 8.8892 14.8343 8.93081 14.8982 8.95929C14.9705 8.99149 15.0541 9.00031 15.2213 9.01795L19.7256 9.49336C20.2911 9.55304 20.5738 9.58288 20.6997 9.71147C20.809 9.82316 20.8598 9.97956 20.837 10.1342C20.8108 10.3122 20.5996 10.5025 20.1772 10.8832L16.8125 13.9154C16.6877 14.0279 16.6252 14.0842 16.5857 14.1527C16.5507 14.2134 16.5288 14.2807 16.5215 14.3503C16.5132 14.429 16.5306 14.5112 16.5655 14.6757L17.5053 19.1064C17.6233 19.6627 17.6823 19.9408 17.5989 20.1002C17.5264 20.2388 17.3934 20.3354 17.2393 20.3615C17.0619 20.3915 16.8156 20.2495 16.323 19.9654L12.3995 17.7024C12.2539 17.6184 12.1811 17.5765 12.1037 17.56C12.0352 17.5455 11.9644 17.5455 11.8959 17.56C11.8185 17.5765 11.7457 17.6184 11.6001 17.7024L7.67662 19.9654C7.18404 20.2495 6.93775 20.3915 6.76034 20.3615C6.60623 20.3354 6.47319 20.2388 6.40075 20.1002C6.31736 19.9408 6.37635 19.6627 6.49434 19.1064L7.4341 14.6757C7.46898 14.5112 7.48642 14.429 7.47814 14.3503C7.47081 14.2807 7.44894 14.2134 7.41394 14.1527C7.37439 14.0842 7.31195 14.0279 7.18708 13.9154L3.82246 10.8832C3.40005 10.5025 3.18884 10.3122 3.16258 10.1342C3.13978 9.97956 3.19059 9.82316 3.29993 9.71147C3.42581 9.58288 3.70856 9.55304 4.27406 9.49336L8.77835 9.01795C8.94553 9.00031 9.02911 8.99149 9.10139 8.95929C9.16534 8.93081 9.2226 8.8892 9.26946 8.83718C9.32241 8.77839 9.35663 8.70162 9.42508 8.54808L11.2691 4.41115Z" 
          stroke="${color}" stroke-width="${thickness}px"  fill="none" stroke-linecap="round" stroke-linejoin="round"/>` :
        iconType === "bookmark" ? 
        `<path d="M5 6.2C5 5.07989 5 4.51984 5.21799 4.09202C5.40973 3.71569 5.71569 3.40973 6.09202 3.21799C6.51984 3 7.07989 3 8.2 3H15.8C16.9201 3 17.4802 3 17.908 3.21799C18.2843 3.40973 18.5903 3.71569 18.782 4.09202C19 4.51984 19 5.07989 19 6.2V21L12 16L5 21V6.2Z" 
          stroke="${color}" stroke-width="${thickness}px" fill="none" stroke-linejoin="round"/>` : ``
    }

    return iconConfig;
  }

  WishlistPlusPDPButtonAPI.isSfsFeatureEnabled = (featureName, retailerSettings) => {
    const SFSEnabled = retailerSettings?.General?.EngageUI?.Enabled;
    const features = retailerSettings?.General?.EngageUI?.Features;
    const featureEnabled = features?.some(
        (feature) => feature?.featureName === featureName && feature?.enabled === true
    );
    return SFSEnabled && featureEnabled;
  }

  // Initializing window objects
  if (!window.SwymCallbacks) {
    window.SwymCallbacks = [];
  }

  window.SwymCallbacks.push((swat) => {
    WishlistPlusPDPButtonAPI.initializePDPButton(swat, true);

    // Handle the failure to initialize case
    if(!swat.retailerSettings){
      swat.evtLayer.addEventListener(swat.JSEvents.configLoaded, function(e) {
        WishlistPlusPDPButtonAPI.initializePDPButton(swat, true);
      });
      return;
    }
  });
})();
