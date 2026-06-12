const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector(".primary-nav");
const leadForms = Array.from(document.querySelectorAll(".lead-form"));
const heroCarousel = document.querySelector("[data-carousel]");

if (heroCarousel instanceof HTMLElement) {
  const track = heroCarousel.querySelector("[data-carousel-track]");
  const slides = Array.from(heroCarousel.querySelectorAll("[data-carousel-slide]"));
  const thumbs = Array.from(document.querySelectorAll("[data-carousel-thumb]"));
  const prevButton = heroCarousel.querySelector("[data-carousel-prev]");
  const nextButton = heroCarousel.querySelector("[data-carousel-next]");
  let activeIndex = 0;
  let autoplayId = 0;
  let pointerDown = false;
  let startX = 0;
  let dragOffset = 0;

  const updateTrack = (animate = true) => {
    if (!(track instanceof HTMLElement)) return;

    const translateX = (-activeIndex * heroCarousel.clientWidth) + dragOffset;
    track.classList.toggle("is-dragging", !animate);
    track.style.transform = `translateX(${translateX}px)`;

    thumbs.forEach((thumb, thumbIndex) => {
      thumb.classList.toggle("is-active", thumbIndex === activeIndex);
      thumb.setAttribute("aria-pressed", String(thumbIndex === activeIndex));
    });
  };

  const goTo = (index, animate = true) => {
    activeIndex = (index + slides.length) % slides.length;
    dragOffset = 0;
    updateTrack(animate);
  };

  const stopAutoplay = () => {
    window.clearInterval(autoplayId);
  };

  const restartAutoplay = () => {
    stopAutoplay();
    autoplayId = window.setInterval(() => {
      goTo(activeIndex + 1);
    }, 4200);
  };

  const onPointerDown = (event) => {
    pointerDown = true;
    startX = event.clientX;
    dragOffset = 0;
  };

  const onPointerMove = (event) => {
    if (!pointerDown) return;
    dragOffset = event.clientX - startX;
    updateTrack(false);
  };

  const onPointerUp = () => {
    if (!pointerDown) return;

    pointerDown = false;
    const threshold = Math.max(60, heroCarousel.clientWidth * 0.08);

    if (dragOffset <= -threshold) {
      goTo(activeIndex + 1);
    } else if (dragOffset >= threshold) {
      goTo(activeIndex - 1);
    } else {
      goTo(activeIndex);
    }

    restartAutoplay();
  };

  prevButton?.addEventListener("click", () => {
    goTo(activeIndex - 1);
    restartAutoplay();
  });

  nextButton?.addEventListener("click", () => {
    goTo(activeIndex + 1);
    restartAutoplay();
  });

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      goTo(Number(thumb.getAttribute("data-carousel-thumb") || 0));
      restartAutoplay();
    });
  });

  track?.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", () => goTo(activeIndex, false));

  heroCarousel.addEventListener("mouseenter", stopAutoplay);
  heroCarousel.addEventListener("mouseleave", restartAutoplay);

  goTo(0);
  restartAutoplay();
}

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

function handleLaunchFormSubmit(form) {
  const nameInput = form.querySelector("input[name='name']");
  const emailInput = form.querySelector("input[type='email']");
  const companyInput = form.querySelector("input[name='company']");
  const message = form.querySelector(".form-message");

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
    form.reset();
  } catch (error) {
    console.error("Não foi possível salvar o cadastro.", error);
    message.textContent = "Não foi possível salvar seu cadastro agora. Tente novamente em instantes.";
  }
}

function handleContactFormSubmit(form) {
  const nameInput = form.querySelector("input[name='name']");
  const companyInput = form.querySelector("input[name='company']");
  const reasonInput = form.querySelector("select[name='reason']");
  const messageInput = form.querySelector("textarea[name='message']");
  const statusMessage = form.querySelector(".form-message");

  if (
    !(nameInput instanceof HTMLInputElement) ||
    !(companyInput instanceof HTMLInputElement) ||
    !(reasonInput instanceof HTMLSelectElement) ||
    !(messageInput instanceof HTMLTextAreaElement) ||
    !(statusMessage instanceof HTMLElement)
  ) {
    return;
  }

  const name = nameInput.value.trim();
  const company = companyInput.value.trim();
  const reason = reasonInput.value.trim();
  const detail = messageInput.value.trim();

  if (!name) {
    statusMessage.textContent = "Informe seu nome para continuar.";
    nameInput.focus();
    return;
  }

  if (!company) {
    statusMessage.textContent = "Informe sua empresa para continuar.";
    companyInput.focus();
    return;
  }

  if (!reason) {
    statusMessage.textContent = "Selecione o motivo do contato.";
    reasonInput.focus();
    return;
  }

  if (!detail) {
    statusMessage.textContent = "Escreva sua mensagem para continuar.";
    messageInput.focus();
    return;
  }

  if (!window.PerifaCRM?.upsertLead) {
    statusMessage.textContent = "Não foi possível registrar seu contato agora. Tente novamente em instantes.";
    return;
  }

  try {
    window.PerifaCRM.upsertLead({
      name,
      company,
      interest: reason,
      source: "Página de contato",
      status: "Novo",
      notes: `Contato enviado pela página pública. Motivo: ${reason}. Mensagem: ${detail}`
    });

    const formData = new FormData(form);
    const payload = new URLSearchParams();

    formData.forEach((value, key) => {
      if (typeof value === "string") {
        payload.append(key, value);
      }
    });

    fetch("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload.toString()
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Falha no envio: ${response.status}`);
        }

        statusMessage.textContent = "Mensagem enviada com sucesso. Nosso time vai receber seu contato pela Netlify.";
        form.reset();
      })
      .catch((error) => {
        console.error("Não foi possível enviar o contato para a Netlify.", error);
        statusMessage.textContent = "Não foi possível enviar sua mensagem agora. Tente novamente em instantes.";
      });
  } catch (error) {
    console.error("Não foi possível registrar o contato.", error);
    statusMessage.textContent = "Não foi possível registrar seu contato agora. Tente novamente em instantes.";
  }
}

leadForms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formType = form.getAttribute("data-form-type");
    if (formType === "contact") {
      handleContactFormSubmit(form);
      return;
    }

    handleLaunchFormSubmit(form);
  });
});
