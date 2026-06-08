const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector(".primary-nav");
const leadForm = document.querySelector(".lead-form");

function setMenuState(isOpen) {
  if (!navToggle || !primaryNav) return;

  document.body.classList.toggle("nav-open", isOpen);
  primaryNav.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
}

navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  setMenuState(!isOpen);
});

primaryNav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    setMenuState(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuState(false);
  }
});

leadForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const emailInput = leadForm.querySelector("input[type='email']");
  const message = leadForm.querySelector(".form-message");

  if (!(emailInput instanceof HTMLInputElement) || !(message instanceof HTMLElement)) {
    return;
  }

  const email = emailInput.value.trim();

  if (!email || !emailInput.checkValidity()) {
    message.textContent = "Informe um e-mail válido para receber o convite.";
    emailInput.focus();
    return;
  }

  message.textContent = "Obrigado. Vamos avisar você sobre o lançamento.";
  leadForm.reset();
});
