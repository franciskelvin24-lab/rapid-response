(function () {
  const form = document.querySelector("#registration-form");
  if (!form || !Array.isArray(window.RRPL_COURSES)) return;

  const courseSelect = form.elements.course;
  const fee = document.querySelector("[data-registration-fee]");
  const payButton = form.querySelector("[data-registration-pay]");
  const status = form.querySelector(".registration-status");
  let currentStep = 1;

  window.RRPL_COURSES.forEach((course) => {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.title;
    courseSelect.append(option);
  });

  const requestedCourse = new URLSearchParams(window.location.search).get("course");
  if (window.RRPL_COURSES.some((course) => course.id === requestedCourse)) {
    courseSelect.value = requestedCourse;
  }

  function selectedCourse() {
    return window.RRPL_COURSES.find((course) => course.id === courseSelect.value);
  }

  function formattedFee(course) {
    if (course.price == null) return course.priceLabel;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: window.RRPL_CONFIG.payments.currency,
      maximumFractionDigits: 2,
    }).format(course.price);
  }

  function updateFee() {
    const course = selectedCourse();
    if (!course) return;
    fee.textContent = formattedFee(course);
    payButton.textContent = window.RRPLPayment.isPayable(course)
      ? "Pay now"
      : "Request a Quote";
  }

  function updateReview() {
    const course = selectedCourse();
    const values = new FormData(form);
    const review = {
      course: course ? course.title : "",
      fee: course ? formattedFee(course) : "",
      name: values.get("name"),
      email: values.get("email"),
      phone: values.get("phone"),
      startMonth: values.get("startMonth") || "To be confirmed",
      note: values.get("note") || "None",
    };
    Object.entries(review).forEach(([key, value]) => {
      const target = form.querySelector(`[data-review="${key}"]`);
      target.textContent = String(value).replace(/[<>]/g, "").slice(0, 700);
    });
    document.querySelector("[data-payment-summary]").textContent = course
      ? `${course.title} · ${formattedFee(course)}. Choose an immediate payment or request registration assistance.`
      : "";
  }

  function goToStep(step) {
    currentStep = step;
    form.querySelectorAll(".registration-step").forEach((section) => {
      section.hidden = Number(section.dataset.step) !== step;
    });
    document.querySelectorAll("[data-step-indicator]").forEach((indicator) => {
      if (Number(indicator.dataset.stepIndicator) === step) indicator.setAttribute("aria-current", "step");
      else indicator.removeAttribute("aria-current");
    });
    form.querySelector(`[data-step="${step}"] h2`).focus({ preventScroll: true });
  }

  courseSelect.addEventListener("change", updateFee);
  form.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => {
      if (currentStep === 1) {
        if (!form.reportValidity()) return;
        updateReview();
        goToStep(2);
      } else if (currentStep === 2) {
        goToStep(3);
      }
    });
  });
  form.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => goToStep(currentStep - 1));
  });
  payButton.addEventListener("click", () => {
    const course = selectedCourse();
    if (!course) return;
    if (!window.RRPLPayment.isPayable(course)) {
      window.RRPLPayment.requestQuote(course.id);
      return;
    }
    const values = new FormData(form);
    window.RRPLPayment.open(course.id, {
      name: values.get("name"),
      email: values.get("email"),
      phone: values.get("phone"),
      startMonth: values.get("startMonth"),
      note: values.get("note"),
    });
  });
  form.querySelector("[data-pay-later]").addEventListener("click", () => {
    const course = selectedCourse();
    if (!course) return;
    const values = new FormData(form);
    const random = Math.random().toString(36).slice(2, 9).toUpperCase();
    const reference = `RRPL-ACD-${Date.now()}-${random}`;
    const message = [
      "Hello Rapid Response Protocol, I would like to submit an academy registration and pay later.",
      `Registration reference: ${reference}`,
      `Name: ${String(values.get("name")).replace(/[<>]/g, "").slice(0, 100)}`,
      `Email: ${String(values.get("email")).replace(/[<>]/g, "").slice(0, 150)}`,
      `Phone: ${String(values.get("phone")).replace(/[<>]/g, "").slice(0, 30)}`,
      `Course: ${course.title}`,
      `Fee: ${formattedFee(course)}`,
      `Preferred start month: ${values.get("startMonth") || "To be confirmed"}`,
      `Note: ${String(values.get("note") || "").replace(/[<>]/g, "").slice(0, 500) || "None"}`,
    ].join("\n");
    const phone = String(window.RRPL_CONFIG.whatsapp).replace(/\D/g, "");
    status.textContent = `Registration ${reference} is ready. Continue to WhatsApp to submit it.`;
    const link = document.createElement("a");
    link.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.className = "button button-outline";
    link.textContent = "Continue to WhatsApp";
    status.append(document.createTextNode(" "));
    status.append(link);
    window.open(link.href, "_blank", "noopener");
  });

  updateFee();
  goToStep(1);
}());
