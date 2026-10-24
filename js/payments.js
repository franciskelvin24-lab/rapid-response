(function () {
  const config = window.RRPL_CONFIG;
  const catalog = window.RRPL_PRICING;
  if (!config || !Array.isArray(catalog)) return;

  let activeItem = null;
  let activeDetails = {};
  let checkoutReference = "";
  let checkoutAmount = 0;
  let paymentCompleted = false;
  let previousFocus = null;
  let flutterwavePromise = null;

  const dialog = document.createElement("dialog");
  dialog.className = "payment-dialog";
  dialog.setAttribute("aria-labelledby", "payment-title");
  dialog.innerHTML = `
    <div class="payment-dialog-panel">
      <button class="payment-close" type="button" aria-label="Close payment">×</button>
      <p class="payment-eyebrow">RAPID RESPONSE · SECURE CHECKOUT</p>
      <h2 id="payment-title"></h2>
      <p class="payment-description"></p>
      <form class="payment-form">
        <label>Full name<input name="name" autocomplete="name" required minlength="2" maxlength="100"></label>
        <label>Email address<input name="email" type="email" autocomplete="email" required maxlength="150"></label>
        <label>Phone number<input name="phone" type="tel" autocomplete="tel" required pattern="\\+?[0-9 ]{7,}" maxlength="30"></label>
        <label class="payment-service-field">Preferred date<input name="date" type="date"></label>
        <label class="payment-service-field">A short note<textarea name="note" rows="3" maxlength="500"></textarea></label>
        <label class="payment-course-field">Preferred start month<input name="startMonth" type="month"></label>
        <fieldset class="payment-deposit" hidden><legend>Choose an amount</legend>
          <label><input type="radio" name="amountChoice" value="full" checked> Pay full amount</label>
          <label class="deposit-choice"><input type="radio" name="amountChoice" value="deposit"> <span></span></label>
        </fieldset>
        <p class="payment-total" aria-live="polite"></p>
        <p class="payment-status" role="status" aria-live="polite"></p>
        <button class="button button-gold payment-submit" type="submit">Continue to payment</button>
      </form>
      <section class="payment-result" hidden aria-live="polite"></section>
    </div>`;
  document.body.append(dialog);

  const form = dialog.querySelector(".payment-form");
  const title = dialog.querySelector("#payment-title");
  const description = dialog.querySelector(".payment-description");
  const status = dialog.querySelector(".payment-status");
  const submitButton = dialog.querySelector(".payment-submit");
  const total = dialog.querySelector(".payment-total");
  const result = dialog.querySelector(".payment-result");
  const depositOptions = dialog.querySelector(".payment-deposit");

  function clean(value, limit) {
    return String(value || "").replace(/[<>]/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit);
  }

  function formatAmount(value) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: config.payments.currency,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function getItem(id) {
    return catalog.find((item) => item.id === id);
  }

  function getPaymentLink(item) {
    const link = config.payments.paymentLinks[item.id];
    if (!link) return "";
    try {
      const parsed = new URL(link, window.location.href);
      return parsed.protocol === "https:" ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function isPayable(item) {
    if (!item || !Number.isFinite(Number(item.price)) || Number(item.price) <= 0) return false;
    if (config.payments.mode === "link") return Boolean(getPaymentLink(item));
    return Boolean(config.payments.publicKey && /^FLWPUBK(?:_TEST)?-/.test(config.payments.publicKey));
  }

  function whatsappUrl(message) {
    const phone = String(config.whatsapp || config.phone || "").replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function quoteLink(item) {
    if (item.type === "service") {
      const quoteForm = document.querySelector("#quote-form");
      const serviceSelect = quoteForm && quoteForm.elements.service;
      if (serviceSelect) {
        serviceSelect.value = item.id;
        quoteForm.scrollIntoView({ behavior: "smooth", block: "center" });
        serviceSelect.focus({ preventScroll: true });
        return;
      }
    }
    const message = `Hello Rapid Response Protocol, I would like to request a quote for ${item.title}.`;
    window.open(whatsappUrl(message), "_blank", "noopener");
  }

  window.RRPLPayment = {
    isPayable,
    open(itemId, details) {
      const item = getItem(itemId);
      if (!item) throw new Error("The selected item is not available.");
      if (!isPayable(item)) {
        quoteLink(item);
        return false;
      }
      if (config.payments.mode === "link") {
        const link = getPaymentLink(item);
        if (link) window.open(link, "_blank", "noopener");
        else quoteLink(item);
        return Boolean(link);
      }
      openCheckout(item, details);
      return true;
    },
    requestQuote(itemId) {
      const item = getItem(itemId);
      if (item) quoteLink(item);
    },
  };

  function updatePayActions() {
    document.querySelectorAll("[data-pay-item]").forEach((button) => {
      const item = getItem(button.dataset.payItem);
      if (!item) return;
      const payable = isPayable(item);
      button.textContent = payable ? "Pay Now" : "Request a Quote";
      button.setAttribute("aria-label", `${payable ? "Pay now for" : "Request a quote for"} ${item.title}`);
      button.classList.toggle("is-unpriced", !payable);
      button.dataset.paymentAvailable = String(payable);
    });
    document.querySelectorAll("[data-item-price]").forEach((element) => {
      const item = getItem(element.dataset.itemPrice);
      if (item) element.textContent = item.price == null ? item.priceLabel : formatAmount(Number(item.price));
    });
  }

  function openCheckout(item, details) {
    activeItem = item;
    activeDetails = details || {};
    checkoutReference = "";
    checkoutAmount = Number(item.price);
    paymentCompleted = false;
    form.hidden = false;
    result.hidden = true;
    result.replaceChildren();
    status.textContent = "";
    title.textContent = "Complete your details";
    description.textContent = item.title;
    form.elements.name.value = clean(activeDetails.name, 100);
    form.elements.email.value = clean(activeDetails.email, 150);
    form.elements.phone.value = clean(activeDetails.phone, 30);
    form.elements.date.value = clean(activeDetails.date, 10);
    form.elements.note.value = clean(activeDetails.note, 500);
    form.elements.startMonth.value = clean(activeDetails.startMonth, 7);
    dialog.querySelectorAll(".payment-service-field").forEach((field) => {
      field.hidden = item.type !== "service";
      field.querySelector("input,textarea").required = false;
    });
    dialog.querySelectorAll(".payment-course-field").forEach((field) => {
      field.hidden = item.type !== "course";
      field.querySelector("input").required = false;
    });
    depositOptions.hidden = !item.depositAllowed;
    if (item.depositAllowed) {
      form.querySelector('[name="amountChoice"][value="full"]').checked = true;
      const depositRadio = form.querySelector('[name="amountChoice"][value="deposit"]');
      depositRadio.disabled = !(item.depositPercent > 0 && item.depositPercent < 100);
      form.querySelector(".deposit-choice span").textContent = `Pay deposit (${item.depositPercent}%)`;
    }
    updateTotal();
    previousFocus = document.activeElement;
    dialog.showModal();
    form.elements.name.focus();
  }

  function updateTotal() {
    if (!activeItem) return;
    const selected = form.querySelector('[name="amountChoice"]:checked');
    const isDeposit = selected && selected.value === "deposit";
    checkoutAmount = isDeposit
      ? Math.round(Number(activeItem.price) * Number(activeItem.depositPercent) / 100 * 100) / 100
      : Number(activeItem.price);
    total.textContent = `Amount due: ${formatAmount(checkoutAmount)}`;
  }

  function loadFlutterwave() {
    if (window.FlutterwaveCheckout) return Promise.resolve();
    if (flutterwavePromise) return flutterwavePromise;
    flutterwavePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.flutterwave.com/v3.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        flutterwavePromise = null;
        reject(new Error("The secure payment service could not be loaded. Check your connection and try again."));
      };
      document.head.append(script);
    });
    return flutterwavePromise;
  }

  function makeReference(item) {
    const prefix = item.type === "service" ? "RRPL-SRV" : "RRPL-ACD";
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `${prefix}-${Date.now()}-${random}`;
  }

  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.textContent = busy ? "Connecting securely…" : "Continue to payment";
    form.setAttribute("aria-busy", String(busy));
  }

  async function verifyOptional(transactionId) {
    if (!config.payments.verifyEndpoint) return;
    const response = await fetch(config.payments.verifyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_id: transactionId,
        tx_ref: checkoutReference,
        amount: checkoutAmount,
        currency: config.payments.currency,
      }),
    });
    if (!response.ok) throw new Error("The optional server verification could not be completed.");
    const verification = await response.json();
    if (verification.verified !== true) throw new Error("The payment is awaiting transaction verification.");
  }

  function appendText(parent, tag, text, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  }

  function renderFailure(message) {
    form.hidden = true;
    result.hidden = false;
    result.replaceChildren();
    title.textContent = "Payment not completed";
    appendText(result, "p", message);
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "button button-gold";
    retry.textContent = "Retry payment";
    retry.addEventListener("click", () => openCheckout(activeItem, activeDetails));
    result.append(retry);
  }

  function receiptMarkup(receipt) {
    const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>RRPL payment receipt</title><style>body{font:16px Arial,sans-serif;color:#151a22;max-width:680px;margin:40px auto;padding:24px;border:1px solid #dce3ec}h1{color:#0a1f5c}dt{font-weight:bold;margin-top:16px}dd{margin:4px 0}</style><h1>Rapid Response Protocol</h1><h2>Payment received, pending confirmation</h2><dl><dt>Customer</dt><dd>${esc(receipt.name)}</dd><dt>Item</dt><dd>${esc(receipt.item)}</dd><dt>Amount</dt><dd>${esc(receipt.amount)}</dd><dt>Transaction reference</dt><dd>${esc(receipt.txRef)}</dd><dt>Preferred date / start month</dt><dd>${esc(receipt.schedule)}</dd></dl><p>This receipt is not confirmation that a service, booking or course access has been issued. The business must verify the transaction.</p></html>`;
  }

  function showReceipt(receipt) {
    const blob = new Blob([receiptMarkup(receipt)], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `RRPL-receipt-${receipt.txRef}.html`;
    link.textContent = "Download printable receipt";
    link.className = "button button-outline receipt-download";
    result.append(link);
    const printButton = document.createElement("button");
    printButton.type = "button";
    printButton.className = "button button-outline";
    printButton.textContent = "Print receipt";
    printButton.addEventListener("click", () => {
      const printWindow = window.open(link.href, "_blank", "noopener");
      if (printWindow) printWindow.addEventListener("load", () => printWindow.print(), { once: true });
    });
    result.append(printButton);
  }

  async function showSuccess(data) {
    paymentCompleted = true;
    const name = clean(form.elements.name.value, 100);
    const dateOrMonth = activeItem.type === "service"
      ? clean(form.elements.date.value, 10) || "Flexible"
      : clean(form.elements.startMonth.value, 7) || "To be confirmed";
    const txRef = clean(data.tx_ref || checkoutReference, 100);
    const registrationRef = `RRPL-${activeItem.type === "course" ? "ACD" : "SRV"}-${Date.now().toString(36).toUpperCase()}`;
    const amount = formatAmount(checkoutAmount);
    const receipt = { name, item: activeItem.title, amount, txRef, schedule: dateOrMonth };
    form.hidden = true;
    result.hidden = false;
    result.replaceChildren();
    title.textContent = "Payment received, pending confirmation";
    appendText(result, "p", "Thank you. Your transaction is awaiting business confirmation; payment alone does not confirm a booking or course access.");
    appendText(result, "p", `Registration reference: ${registrationRef}`, "payment-reference");
    appendText(result, "p", `Transaction reference: ${txRef}`);
    appendText(result, "p", `${activeItem.title} · ${amount}`);
    const message = [
      "Hello Rapid Response Protocol, I have made a payment and request confirmation.",
      `Name: ${name}`,
      `Item: ${activeItem.title}`,
      `Registration reference: ${registrationRef}`,
      `tx_ref: ${txRef}`,
      `Amount: ${amount}`,
      `${activeItem.type === "service" ? "Preferred date" : "Preferred start month"}: ${dateOrMonth}`,
    ].join("\n");
    const whatsApp = document.createElement("a");
    whatsApp.href = whatsappUrl(message);
    whatsApp.target = "_blank";
    whatsApp.rel = "noopener";
    whatsApp.className = "button button-gold";
    whatsApp.textContent = "Message us on WhatsApp";
    result.append(whatsApp);
    showReceipt(receipt);
    /*
     * A browser callback is not proof of settlement. The owner must verify
     * this transaction in the Flutterwave dashboard (or through the optional
     * server verification endpoint) before delivering service or course access.
     */
    if (config.payments.verifyEndpoint && data.transaction_id) {
      try {
        await verifyOptional(data.transaction_id);
      } catch (error) {
        appendText(result, "p", error.message, "payment-status");
      }
    }
  }

  async function beginPayment(formData) {
    setBusy(true);
    status.textContent = "";
    try {
      await loadFlutterwave();
      checkoutReference = makeReference(activeItem);
      const name = clean(formData.get("name"), 100);
      const email = clean(formData.get("email"), 150);
      const phone = clean(formData.get("phone"), 30);
      const date = clean(formData.get("date"), 10);
      const note = clean(formData.get("note"), 500);
      const startMonth = clean(formData.get("startMonth"), 7);
      const schedule = activeItem.type === "service" ? date : startMonth;

      window.FlutterwaveCheckout({
        public_key: config.payments.publicKey,
        tx_ref: checkoutReference,
        amount: checkoutAmount,
        currency: config.payments.currency,
        payment_options: "card, banktransfer, ussd",
        customer: { email, phone_number: phone, name },
        customizations: {
          title: clean(config.payments.businessName || "Rapid Response Protocol", 80),
          description: clean(activeItem.title, 120),
          logo: config.payments.logoUrl,
        },
        meta: {
          item_id: activeItem.id,
          type: activeItem.type,
          date: activeItem.type === "service" ? date : "",
          start_month: activeItem.type === "course" ? startMonth : "",
          note,
        },
        callback: async (data) => {
          if (data.status === "successful" || data.status === "completed") {
            await showSuccess(data);
          } else {
            renderFailure("The transaction was not marked successful. You can retry or contact us for help.");
          }
        },
        onclose: () => {
          if (!paymentCompleted && dialog.open) {
            renderFailure("No payment confirmation was received. You can safely retry when ready.");
          }
        },
      });
      activeDetails = { name, email, phone, date, note, startMonth };
    } catch (error) {
      status.textContent = error.message || "Unable to start checkout. Please try again.";
    } finally {
      setBusy(false);
    }
  }

  dialog.querySelector(".payment-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled])'))
      .filter((element) => !element.closest("[hidden]"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  form.addEventListener("change", (event) => {
    if (event.target.name === "amountChoice") updateTotal();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    beginPayment(new FormData(form));
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pay-item]");
    if (button) {
      event.preventDefault();
      const item = getItem(button.dataset.payItem);
      if (!item) return;
      if (!isPayable(item)) {
        quoteLink(item);
        return;
      }
      if (config.payments.mode === "link") {
        const link = getPaymentLink(item);
        if (link) {
          window.open(link, "_blank", "noopener");
        } else {
          quoteLink(item);
        }
        return;
      }
      openCheckout(item, {});
    }
  });

  const quoteForm = document.querySelector("#quote-form");
  if (quoteForm) {
    quoteForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!quoteForm.reportValidity()) return;
      const data = new FormData(quoteForm);
      const item = getItem(clean(data.get("service"), 80));
      const summary = [
        "Hello Rapid Response Protocol, I would like to request a service quote.",
        `Name: ${clean(data.get("name"), 100)}`,
        `Phone: ${clean(data.get("phone"), 30)}`,
        `Email: ${clean(data.get("email"), 150)}`,
        `Service: ${item ? item.title : "Not selected"}`,
        `Preferred date: ${clean(data.get("date"), 10) || "Flexible"}`,
        `Location: ${clean(data.get("location"), 150)}`,
        `Number of officers or vehicles: ${clean(data.get("quantity"), 50) || "To be discussed"}`,
        `Message: ${clean(data.get("message"), 700)}`,
      ].join("\n");
      const messageLink = quoteForm.querySelector("[data-quote-whatsapp]");
      messageLink.href = whatsappUrl(summary);
      messageLink.hidden = false;
      const success = quoteForm.querySelector("[data-quote-success]");
      success.textContent = "Your quote request is ready. Continue to WhatsApp to send it.";
      // Owner email-delivery hook: connect Formspree, Web3Forms or EmailJS here.
      // Keep service credentials server-side; never expose private email API keys in this page.
      window.open(messageLink.href, "_blank", "noopener");
    });
  }

  updatePayActions();
  document.dispatchEvent(new Event("rrpl:payments-ready"));
}());
