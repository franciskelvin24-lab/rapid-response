(function () {
  const grid = document.querySelector("#course-grid");
  if (!grid || !Array.isArray(window.RRPL_COURSES)) return;

  const modal = document.querySelector("#course-detail");
  const modalTitle = modal.querySelector("[data-course-title]");
  const modalDescription = modal.querySelector("[data-course-description]");
  const modalPrice = modal.querySelector("[data-item-price]");
  const modalPay = modal.querySelector("[data-pay-item]");
  const modalRegister = modal.querySelector("[data-course-register]");

  function registerUrl(course) {
    return `register.html?course=${encodeURIComponent(course.id)}`;
  }

  function feeLabel(course) {
    if (course.price == null) return course.priceLabel;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: window.RRPL_CONFIG.payments.currency,
      maximumFractionDigits: 2,
    }).format(course.price);
  }

  window.RRPL_COURSES.forEach((course, index) => {
    const article = document.createElement("article");
    article.className = "course-card";
    const number = document.createElement("span");
    number.className = "course-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const title = document.createElement("h2");
    title.textContent = course.title;
    const description = document.createElement("p");
    description.textContent = course.description;
    const price = document.createElement("p");
    price.className = "item-price";
    price.dataset.itemPrice = course.id;
    price.textContent = feeLabel(course);
    const actions = document.createElement("div");
    actions.className = "course-actions";
    const pay = document.createElement("button");
    pay.type = "button";
    pay.className = "button button-gold";
    pay.dataset.payItem = course.id;
    pay.textContent = window.RRPLPayment.isPayable(course) ? "Pay Now" : "Request a Quote";
    const register = document.createElement("a");
    register.className = "button button-outline course-register";
    register.href = registerUrl(course);
    register.textContent = "Register";
    const details = document.createElement("button");
    details.type = "button";
    details.className = "course-details";
    details.textContent = "Course details";
    details.setAttribute("aria-label", `View details for ${course.title}`);
    details.addEventListener("click", () => {
      modalTitle.textContent = course.title;
      modalDescription.textContent = course.description;
      modalPrice.dataset.itemPrice = course.id;
      modalPrice.textContent = feeLabel(course);
      modalPay.dataset.payItem = course.id;
      modalPay.textContent = window.RRPLPayment.isPayable(course) ? "Pay Now" : "Request a Quote";
      modalRegister.href = registerUrl(course);
      modal.showModal();
    });
    actions.append(pay, register);
    article.append(number, title, description, price, actions, details);
    grid.append(article);
  });

  modal.querySelector(".payment-close").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
  modal.addEventListener("cancel", (event) => {
    event.preventDefault();
    modal.close();
  });
}());
