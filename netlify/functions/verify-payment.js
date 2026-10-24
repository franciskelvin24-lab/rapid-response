exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: "Method not allowed" };
  }
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    return { statusCode: 500, body: JSON.stringify({ verified: false, error: "Payment verification is not configured." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ verified: false, error: "Invalid request body." }) };
  }
  const transactionId = String(body.transaction_id || "");
  const txRef = String(body.tx_ref || "");
  const expectedAmount = Number(body.amount);
  const expectedCurrency = String(body.currency || "");
  if (!/^\d{1,30}$/.test(transactionId)
    || !/^RRPL-(SRV|ACD)-\d{10,}-[A-Z0-9]{4,20}$/.test(txRef)
    || !Number.isFinite(expectedAmount) || expectedAmount <= 0
    || !/^[A-Z]{3}$/.test(expectedCurrency)) {
    return { statusCode: 400, body: JSON.stringify({ verified: false, error: "Invalid transaction details." }) };
  }

  try {
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
      headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" },
    });
    if (!response.ok) {
      return { statusCode: 502, body: JSON.stringify({ verified: false, error: "Flutterwave transaction verification failed." }) };
    }
    const payload = await response.json();
    const transaction = payload.data || {};
    const verified = payload.status === "success"
      && transaction.status === "successful"
      && transaction.tx_ref === txRef
      && Number(transaction.amount) === expectedAmount
      && transaction.currency === expectedCurrency;
    return {
      statusCode: verified ? 200 : 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified }),
    };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ verified: false, error: "Unable to reach Flutterwave for verification." }) };
  }
};
