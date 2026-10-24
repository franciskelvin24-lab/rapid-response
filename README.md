# Rapid Response Protocol and Logistics Limited

Static, responsive website for Rapid Response Protocol and Logistics Limited (RRSG), BN 9043510. Built with semantic HTML, CSS and vanilla JavaScript.

## Run locally

1. Open this folder in VS Code.
2. Install the **Live Server** extension if it is not already installed.
3. Right-click `index.html` and select **Open with Live Server**.

Google Fonts and the Unsplash photography require an internet connection. Enquiries open a prefilled WhatsApp message; the visitor chooses to send it. The site does not store form details. A payment confirmation displayed in the browser is not proof of settlement and does not grant a booking, course access or a certificate.

## Configure Flutterwave

1. Open `js/config.js` and paste the Flutterwave **Public Key only** into `payments.publicKey`. Find it in Flutterwave Dashboard → **Settings → API Keys**. Test public keys start with `FLWPUBK_TEST-`; live public keys start with `FLWPUBK-`. Never put a secret key, encryption key or transaction hash in a front-end file.
2. Confirm `payments.currency`, `businessName`, and `logoUrl`. The current logo asset is `images/logo.svg`; either set `logoUrl` to `/images/logo.svg` or add the configured `/images/logo.png` file.
3. In `js/pricing.js`, set the `price` for each service or course in NGN. Prices default to `null` and the site displays **Request a Quote** until an amount is supplied. Set `priceLabel` to the appropriate fee description. Set `depositAllowed` to `true` and choose a `depositPercent` from 1 through 99 only for items where RRSG accepts deposits.
4. The four course cards and registration options are derived from the course records in `js/pricing.js` through `js/courses.js`. Do not maintain a second course/fee list.
5. For the standard checkout popup, leave `payments.mode` set to `"popup"`. To use Flutterwave payment links instead, set `"link"` and add each configured item's HTTPS URL to `payments.paymentLinks`, keyed by its item `id`.
6. Test using a Flutterwave **test public key** and Flutterwave's test payment methods. Verify test transactions in the test dashboard. Once ready, switch to the live public key and live payment links. Use HTTPS on the deployed site.

Flutterwave's inline checkout library is downloaded only when the customer starts a popup checkout. Card details are handled by Flutterwave and are never read or logged by this website. Customer details are sent to Flutterwave only when they submit checkout. A successful browser callback is labeled **Payment received, pending confirmation**; the RRSG owner must verify the transaction in the dashboard before delivering the service or course access.

## Optional Netlify transaction verification

The front end is functional without a serverless function. For optional transaction verification:

1. Deploy the site to Netlify with `netlify/functions/verify-payment.js` included.
2. In Netlify site settings, add `FLW_SECRET_KEY` as an environment variable using the Flutterwave secret key. Never put it in `js/config.js` or any other public file.
3. Set `payments.verifyEndpoint` in `js/config.js` to the deployed function URL, for example `/.netlify/functions/verify-payment`.
4. Deploy and test the function before relying on it. It calls Flutterwave's transaction verification API and compares the transaction status, `tx_ref`, amount and currency. For production-grade verification, also compare the expected item and amount against a server-controlled order/pricing record; request-body values from a static front end are not authoritative.

The function is optional and is not enabled by default. The browser still does not grant course access or confirm a booking based only on a callback.

## Quotes and email delivery

The service quote form validates its fields and prepares a WhatsApp request. `js/main.js` contains a commented integration hook for connecting Formspree, Web3Forms or EmailJS. Keep private email/API credentials on a trusted server rather than exposing them in browser JavaScript.

## Payment and refund policy

Review and edit `payment-policy.html` before publishing so cancellation, refund timing, deposits and service/course-specific terms accurately reflect RRSG's approved policies.

## Files created or changed

- `index.html`
- `academy-courses.html`
- `register.html`
- `payment-policy.html`
- `css/style.css`
- `js/main.js`
- `js/config.js`
- `js/pricing.js`
- `js/courses.js`
- `js/payments.js`
- `js/academy.js`
- `js/register.js`
- `netlify/functions/verify-payment.js`
- `README.md`

## Replaceable image assets

The photographs currently load from Unsplash URLs. To use approved company photography, put the local files in `images/` and replace the matching image URL in `index.html` (and the seasonal background URL in `css/style.css`):

- `index.html`, `.hero-person img`: close-protection officer portrait. Suggested local path: `images/hero-officer.jpg`.
- `index.html`, `.hero-vehicle img`: black SUV convoy / executive vehicle. Suggested path: `images/hero-convoy.jpg`.
- `index.html`, `.about-photo img`: team or operations planning photo. Suggested path: `images/about-team.jpg`.
- `index.html`, each `.fleet-card img` and its matching `data-lightbox`: Prado-class, Land Cruiser-class and fleet images. Suggested paths: `images/fleet-prado.jpg`, `images/fleet-land-cruiser.jpg`, `images/fleet-executive.jpg`. Update both the thumbnail `src` and lightbox `data-lightbox` URL for each card.
- `index.html`, `.why-image img`: operations / coordination image. Suggested path: `images/operations.jpg`.
- `css/style.css`, `.season-photo` background URL: festive-season / Nigeria travel image. Suggested path: `images/detty-december.jpg`.
- `index.html`, `og:image`: social sharing image URL. Set it to a public absolute URL for the chosen brand image.
- `images/logo.svg`: original vector placeholder, circular navy badge with a white horse and shield. Replace its artwork or update the two `<img>` references in `index.html` and favicon link if using a different file. The payment logo can use the existing SVG or a public PNG as configured.

All fleet imagery is illustrative and does not claim that a pictured vehicle is armored or available. Replace with verified company images and specifications before publication. Instagram and TikTok `href="#"` values are placeholders; update them to the official profiles. The contact email is also a placeholder.
