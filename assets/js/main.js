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

  const nameInput = leadForm.querySelector("input[name='name']");
  const emailInput = leadForm.querySelector("input[type='email']");
  const companyInput = leadForm.querySelector("input[name='company']");
  const message = leadForm.querySelector(".form-message");

  if (
    !(nameInput instanceof HTMLInputElement) ||
    !(emailInput instanceof HTMLInputElement) ||
    !(companyInput instanceof HTMLInputElement) ||
    !(message instanceof HTMLElement)
  ) {
    return;
  }

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const company = companyInput.value.trim();

  if (!name) {
    message.textContent = "Informe seu nome para receber o convite.";
    nameInput.focus();
    return;
  }

  if (!email || !emailInput.checkValidity()) {
    message.textContent = "Informe um e-mail válido para receber o convite.";
    emailInput.focus();
    return;
  }

  if (!company) {
    message.textContent = "Informe sua empresa para receber o convite.";
    companyInput.focus();
    return;
  }

  if (!window.PerifaCRM?.upsertLead) {
    message.textContent = "Não foi possível salvar seu cadastro agora. Tente novamente em instantes.";
    return;
  }

  try {
    const result = window.PerifaCRM.upsertLead({
      name,
      email,
      company,
      interest: "Convite lançamento",
      source: "Site",
      status: "Novo",
      notes: `Cadastro feito pelo formulário público da landing page. Empresa: ${company}.`
    });

    message.textContent = result.created
      ? "Cadastro salvo. Vamos avisar você sobre o lançamento."
      : "Esse e-mail já estava no CRM. Atualizamos o cadastro.";
    leadForm.reset();
  } catch (error) {
    console.error("Não foi possível salvar o cadastro.", error);
    message.textContent = "Não foi possível salvar seu cadastro agora. Tente novamente em instantes.";
  }
});
