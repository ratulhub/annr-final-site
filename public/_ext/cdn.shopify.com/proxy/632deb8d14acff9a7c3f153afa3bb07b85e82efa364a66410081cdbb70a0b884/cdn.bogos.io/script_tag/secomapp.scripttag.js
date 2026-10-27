(function BOGOS_HIDDEN_CLONED_PRODUCT() {
    try {
        setTimeout(() => {
            const enableAppStatus = document.querySelector("#secomapp_freegifts_version") ?? false

            if (!enableAppStatus) {
                const gift_icon_collection_query = {
                    default: [
                        ".product-card, #product-grid .grid__item, .product-grid .grid__item, .card-list .card-list__column",
                        ".cc-product-list .product-block, .collection-list.grid .grid__item, .collection-grid.grid .grid__item"
                    ],
                    integration: [
                        ".m-product-item, .m-product-list .swiper-slide, .f-grid .f-column",
                        ".f\\:featured-collection .f\\:featured-collection-block .f\\:column"
                    ],
                    tool: [
                        ".fg-secomapp-collection-img",
                    ]
                }

                const imgCollectionGiftIconQuery = [
                    ...gift_icon_collection_query?.tool,
                    ...gift_icon_collection_query?.integration,
                    ...gift_icon_collection_query?.default
                ].filter(Boolean).join(",")

                document.querySelectorAll(imgCollectionGiftIconQuery).forEach((eachProduct) => {
                    let AProduct = eachProduct.querySelector('a[href*="/products/"]')
                    const arrHandle = AProduct?.getAttribute("href")?.split('/') ?? []
                    const indexProductString = arrHandle?.indexOf("products")
                    let handleProduct = indexProductString >= 0 ? arrHandle[indexProductString + 1] ?? null : null
                    handleProduct = handleProduct?.split("?")?.shift()

                    if (handleProduct?.includes("-sca_clone_freegift")) {
                        eachProduct.remove()
                    }

                    const aCollection = eachProduct.querySelector('a[href*="/collections/sca_fg"]')
                    if (aCollection) {
                        eachProduct.remove()
                    }
                })
            }
        }, 600)
    } catch (e) {
        console.log("Something wrong!", e)
    }
})()

