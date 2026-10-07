/**
 * Facebook Pixel & TikTok Pixel Helper
 * Provides tracking functions for e-commerce events
 */

// Declare global fbq & ttq & gtag functions
declare global {
    interface Window {
        fbq: (...args: any[]) => void;
        ttq: any;
        gtag: (...args: any[]) => void;
        dataLayer: any[];
    }
}

/**
 * Initialize Facebook Pixel
 * Call this once in your app's entry point
 */
export function initFacebookPixel(pixelId: string) {
    if (!pixelId || pixelId === 'YOUR_PIXEL_ID') {
        console.log('[FB Pixel] No Pixel ID configured, skipping initialization');
        return;
    }

    // Load Facebook Pixel script
    const script = document.createElement('script');
    script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
    document.head.appendChild(script);
}

/**
 * Initialize TikTok Pixel
 */
export function initTikTokPixel(pixelId: string) {
    if (!pixelId || pixelId === 'YOUR_TIKTOK_PIXEL_ID') {
        console.log('[TikTok Pixel] No Pixel ID configured, skipping initialization');
        return;
    }

    const script = document.createElement('script');
    script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
      ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
      ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
      ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";
      o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];
      a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
      ttq.page();
    }(window, document, 'ttq');
  `;
    document.head.appendChild(script);
}

// ============================================================
// E-Commerce Event Tracking
// ============================================================

/** Track when a user views a product */
export function trackViewContent(product: {
    id: string;
    title: string;
    price: number;
    category?: string;
}) {
    if (window.fbq) {
        window.fbq('track', 'ViewContent', {
            content_ids: [product.id],
            content_name: product.title,
            content_type: 'product',
            value: product.price,
            currency: 'TRY'
        });
    }
    if (window.ttq) {
        window.ttq.track('ViewContent', {
            contents: [{ content_id: product.id, content_name: product.title }],
            value: product.price,
            currency: 'TRY'
        });
    }
}

/** Track when a user adds a product to the cart */
export function trackAddToCart(product: {
    id: string;
    title: string;
    price: number;
    quantity: number;
}) {
    if (window.fbq) {
        window.fbq('track', 'AddToCart', {
            content_ids: [product.id],
            content_name: product.title,
            content_type: 'product',
            value: product.price * product.quantity,
            currency: 'TRY'
        });
    }
    if (window.ttq) {
        window.ttq.track('AddToCart', {
            contents: [{ content_id: product.id, quantity: product.quantity }],
            value: product.price * product.quantity,
            currency: 'TRY'
        });
    }
}

/** Track when a user begins checkout */
export function trackInitiateCheckout(totalValue: number, numItems: number) {
    if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', {
            value: totalValue,
            currency: 'TRY',
            num_items: numItems
        });
    }
}

/** Track a successful purchase */
export function trackPurchase(orderId: string, totalValue: number, items: { id: string; quantity: number }[]) {
    if (window.fbq) {
        window.fbq('track', 'Purchase', {
            content_ids: items.map(i => i.id),
            content_type: 'product',
            value: totalValue,
            currency: 'TRY',
            order_id: orderId
        });
    }
    if (window.ttq) {
        window.ttq.track('CompletePayment', {
            contents: items.map(i => ({ content_id: i.id, quantity: i.quantity })),
            value: totalValue,
            currency: 'TRY'
        });
    }
}

/** Track a search query */
export function trackSearch(searchQuery: string) {
    if (window.fbq) {
        window.fbq('track', 'Search', {
            search_string: searchQuery
        });
    }
}

// ============================================================
// Google Ads Purchase Conversion (AW-...)
// IDs come from backend public settings:
//   google_ads_id (e.g. AW-18476524454)
//   google_ads_conversion_label (e.g. h13_CP_rhpMdEKbHpepE)
// Fire ONLY on the order success page (/order/:id?success=1) after the
// order status is verified as paid — never site-wide.
// ============================================================

/** Load gtag.js once and configure the Google Ads ID */
export function initGoogleAds(adsId: string) {
    if (!adsId || adsId === 'AW-XXXXXXXXXX') {
        console.log('[Google Ads] No Ads ID configured, skipping initialization');
        return;
    }
    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${adsId}"]`)) {
        return; // already loaded
    }
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function (...args: any[]) {
        window.dataLayer.push(args);
    };
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${adsId}`;
    document.head.appendChild(script);
    window.gtag('js', new Date());
}

/**
 * Fire the "Satın alma işlemi" conversion exactly once per order.
 * Reload-guard: sessionStorage key per orderId.
 */
export function trackGoogleAdsPurchase(params: {
    adsId: string;
    label: string;
    orderId: string;
    value: number;
    currency?: string;
}) {
    const { adsId, label, orderId, value } = params;
    const currency = params.currency || 'TRY';
    if (!adsId || !label || !orderId || typeof window.gtag !== 'function') {
        return;
    }
    const guardKey = `google_ads_converted_${orderId}`;
    if (sessionStorage.getItem(guardKey)) {
        return; // already reported for this order (e.g. page refresh)
    }
    window.gtag('event', 'conversion', {
        'send_to': `${adsId}/${label}`,
        'value': value,
        'currency': currency,
        'transaction_id': orderId,
    });
    sessionStorage.setItem(guardKey, '1');
}
