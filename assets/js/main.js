function createPageLoader() {
  if (!(document.body instanceof HTMLBodyElement)) return null;

  const existingLoader = document.querySelector(".page-loader");
  if (existingLoader instanceof HTMLElement) {
    return existingLoader;
  }

  const loader = document.createElement("div");
  loader.className = "page-loader";
  loader.setAttribute("aria-hidden", "true");
  loader.innerHTML = `
    <div class="page-loader__shell">
      <div class="page-loader__brand">
        <span>Perifa</span>
        <span>Midia</span>
      </div>
      <p class="page-loader__copy">Carregando o Brasil real.</p>
      <span class="page-loader__bar"></span>
    </div>
  `;

  document.body.prepend(loader);
  return loader;
}

function hidePageLoader(loader) {
  if (!(loader instanceof HTMLElement)) return;

  loader.classList.add("is-hidden");
  document.body.classList.remove("page-loading");
}

function shouldHandleLinkWithLoader(link) {
  if (!(link instanceof HTMLAnchorElement)) return false;
  if (!link.href) return false;
  if (link.target && link.target !== "_self") return false;
  if (link.hasAttribute("download")) return false;
  if (link.getAttribute("href")?.startsWith("#")) return false;

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
  if (!/^https?:$/.test(url.protocol)) return false;

  return true;
}

const pageLoader = createPageLoader();
if (pageLoader instanceof HTMLElement) {
  const loaderDelay = 1000;
  document.body.classList.add("page-loading");

  if (document.readyState === "complete") {
    window.setTimeout(() => hidePageLoader(pageLoader), loaderDelay);
  } else {
    window.addEventListener("load", () => {
      window.setTimeout(() => hidePageLoader(pageLoader), loaderDelay);
    }, { once: true });
  }

  window.setTimeout(() => hidePageLoader(pageLoader), 3200);

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target instanceof Element
      ? event.target.closest("a[href]")
      : null;

    if (!(link instanceof HTMLAnchorElement) || !shouldHandleLinkWithLoader(link)) {
      return;
    }

    pageLoader.classList.remove("is-hidden");
    document.body.classList.add("page-loading");
  });
}

const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector(".primary-nav");
const navDropdowns = Array.from(document.querySelectorAll("[data-nav-dropdown]"));
const leadForms = Array.from(document.querySelectorAll(".lead-form"));
const heroCarousel = document.querySelector("[data-carousel]");
if (heroCarousel instanceof HTMLElement) {
  const track = heroCarousel.querySelector("[data-carousel-track]");
  const slides = Array.from(heroCarousel.querySelectorAll("[data-carousel-slide]"));
  const thumbs = Array.from(document.querySelectorAll("[data-carousel-thumb]"));
  const prevButton = heroCarousel.querySelector("[data-carousel-prev]");
  const nextButton = heroCarousel.querySelector("[data-carousel-next]");
  const ctaLink = heroCarousel.querySelector("[data-carousel-cta]");
  const heroEyebrow = document.querySelector("[data-hero-eyebrow]");
  const heroTitle = document.querySelector("[data-hero-title]");
  const heroCopyOne = document.querySelector("[data-hero-copy-one]");
  const heroCopyTwo = document.querySelector("[data-hero-copy-two]");
  let activeIndex = 0;
  let autoplayId = 0;
  let pointerDown = false;
  let startX = 0;
  let dragOffset = 0;

  const updateHeroCopy = (slide) => {
    if (!(slide instanceof HTMLElement)) return;

    if (heroEyebrow instanceof HTMLElement) {
      heroEyebrow.textContent = slide.getAttribute("data-slide-eyebrow") || "";
    }

    if (heroTitle instanceof HTMLElement) {
      const titleLines = (slide.getAttribute("data-slide-title") || "").split("|").filter(Boolean);
      const useMutedLastLine = slide.getAttribute("data-slide-title-muted") === "true";
      heroTitle.replaceChildren();

      titleLines.forEach((line, lineIndex) => {
        const lineElement = document.createElement("span");
        if (lineIndex === 0) {
          lineElement.classList.add("title-category");
        }
        const isLastLine = lineIndex === titleLines.length - 1;
        if (useMutedLastLine && isLastLine) {
          lineElement.className = "title-muted";
          lineElement.textContent = line;
          const period = document.createElement("span");
          period.className = "period";
          period.textContent = ".";
          lineElement.appendChild(period);
        } else {
          lineElement.textContent = line;
        }
        heroTitle.appendChild(lineElement);
      });
    }

    if (heroCopyOne instanceof HTMLElement) {
      heroCopyOne.textContent = slide.getAttribute("data-slide-copy-one") || "";
    }

    if (heroCopyTwo instanceof HTMLElement) {
      heroCopyTwo.textContent = slide.getAttribute("data-slide-copy-two") || "";
    }
  };

  const updateTrack = (animate = true) => {
    if (!(track instanceof HTMLElement)) return;

    const translateX = (-activeIndex * heroCarousel.clientWidth) + dragOffset;
    track.classList.toggle("is-dragging", !animate);
    track.style.transform = `translateX(${translateX}px)`;

    thumbs.forEach((thumb, thumbIndex) => {
      thumb.classList.toggle("is-active", thumbIndex === activeIndex);
      thumb.setAttribute("aria-pressed", String(thumbIndex === activeIndex));
    });

    const activeSlide = slides[activeIndex];
    updateHeroCopy(activeSlide);

    if (ctaLink instanceof HTMLAnchorElement) {
      const href = activeSlide?.getAttribute("data-slide-href") || "./contato.html";
      const label = activeSlide?.getAttribute("data-slide-label") || "esta pagina";
      ctaLink.href = href;
      ctaLink.setAttribute("aria-label", `Saiba mais aqui sobre ${label}`);
    }
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

  if (!isOpen) {
    closeAllNavDropdowns();
  }
}

function setNavDropdownState(dropdown, isOpen) {
  if (!(dropdown instanceof HTMLElement)) return;

  const toggle = dropdown.querySelector(".nav-dropdown-toggle");
  if (!(toggle instanceof HTMLButtonElement)) return;

  dropdown.classList.toggle("is-open", isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));
}

function closeAllNavDropdowns() {
  navDropdowns.forEach((dropdown) => setNavDropdownState(dropdown, false));
}

navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  setMenuState(!isOpen);
});

navDropdowns.forEach((dropdown) => {
  const toggle = dropdown.querySelector(".nav-dropdown-toggle");
  if (!(toggle instanceof HTMLButtonElement)) return;

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = toggle.getAttribute("aria-expanded") === "true";

    closeAllNavDropdowns();
    setNavDropdownState(dropdown, !isOpen);
  });
});

primaryNav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    closeAllNavDropdowns();
    setMenuState(false);
  }
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest("[data-nav-dropdown]")) return;

  closeAllNavDropdowns();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllNavDropdowns();
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
  const emailInput = form.querySelector("input[name='email']");
  const companyInput = form.querySelector("input[name='company']");
  const reasonInput = form.querySelector("select[name='reason']");
  const messageInput = form.querySelector("textarea[name='message']");
  const statusMessage = form.querySelector(".form-message");
  const submitButton = form.querySelector("button[type='submit']");
  const accessKeyInput = form.querySelector("input[name='access_key']");

  if (
    !(nameInput instanceof HTMLInputElement) ||
    !(emailInput instanceof HTMLInputElement) ||
    !(companyInput instanceof HTMLInputElement) ||
    !(reasonInput instanceof HTMLSelectElement) ||
    !(messageInput instanceof HTMLTextAreaElement) ||
    !(statusMessage instanceof HTMLElement) ||
    !(submitButton instanceof HTMLButtonElement) ||
    !(accessKeyInput instanceof HTMLInputElement)
  ) {
    return;
  }

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const company = companyInput.value.trim();
  const reason = reasonInput.value.trim();
  const detail = messageInput.value.trim();
  const botFieldInput = form.querySelector("input[name='botcheck']");
  const setStatusMessage = (text, state = "error") => {
    statusMessage.textContent = text;
    statusMessage.dataset.state = text ? state : "";
  };

  if (!name) {
    setStatusMessage("Informe seu nome para continuar.");
    nameInput.focus();
    return;
  }

  if (!email || !emailInput.checkValidity()) {
    setStatusMessage("Informe um e-mail valido para continuar.");
    emailInput.focus();
    return;
  }

  if (!company) {
    setStatusMessage("Informe sua empresa para continuar.");
    companyInput.focus();
    return;
  }

  if (!reason) {
    setStatusMessage("Selecione o motivo do contato.");
    reasonInput.focus();
    return;
  }

  if (!detail) {
    setStatusMessage("Escreva sua mensagem para continuar.");
    messageInput.focus();
    return;
  }

  try {
    if (botFieldInput instanceof HTMLInputElement && botFieldInput.value.trim()) {
      form.reset();
      setStatusMessage("Recebemos sua mensagem. Nosso time retorna em breve.", "success");
      return;
    }

    if (window.PerifaCRM?.upsertLead) {
      window.PerifaCRM.upsertLead({
        name,
        email,
        company,
        interest: reason,
        source: "Página de contato",
        status: "Novo",
        notes: `Contato enviado pela pagina publica. Motivo: ${reason}. Mensagem: ${detail}`
      });
    }

    const payload = {
      access_key: accessKeyInput.value,
      subject: form.querySelector("input[name='subject']")?.value || "Novo contato do site - Perifa Mídia",
      from_name: form.querySelector("input[name='from_name']")?.value || "Site Perifa Mídia",
      name,
      email,
      company,
      reason,
      message: detail,
      botcheck: botFieldInput instanceof HTMLInputElement ? botFieldInput.checked : false
    };

    setStatusMessage("", "success");
    submitButton.disabled = true;

    fetch(form.action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success === false) {
          throw new Error(data.message || `Falha no envio: ${response.status}`);
        }

        form.reset();
        window.location.href = "./obrigado.html";
      })
      .catch((error) => {
        console.error("Nao foi possivel enviar o contato para o Web3Forms.", error);
        setStatusMessage(
          "Nao foi possivel enviar sua mensagem agora. Tente novamente em instantes."
        );
      })
      .finally(() => {
        submitButton.disabled = false;
      });
  } catch (error) {
    console.error("Nao foi possivel registrar o contato.", error);
    setStatusMessage("Nao foi possivel registrar seu contato agora. Tente novamente em instantes.");
    submitButton.disabled = false;
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
