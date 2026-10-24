window.RRPL_CONFIG = {
  phone: "+2347064440021",
  whatsapp: "2347064440021",
  email: "info@rapidresponseprotocol.com",
  social: {
    instagram: "",
    tiktok: "",
  },
  payments: {
    provider: "flutterwave",
    publicKey: "",
    currency: "NGN",
    businessName: "",
    logoUrl: "/images/logo.png",
    paymentLinks: {},
    mode: "popup",
    verifyEndpoint: "",
  },
};

/*
 * Flutterwave public key setup:
 * Sign in to the Flutterwave dashboard, open Settings > API Keys, and copy
 * the Public Key (test keys begin FLWPUBK_TEST-; live keys begin FLWPUBK-).
 * Paste only that public key into payments.publicKey above. Never add a
 * secret key, encryption key, or transaction hash to browser-side files.
 */
