/* ============================================
   PERIFA MÍDIA — Comportamento
   - Formulário com WhatsApp via Web API (number preenchido)
   - Webhook Google Sheets / Apps Script para planilha
   - Meta Pixel Lead event
   ============================================ */

(function () {
  'use strict';

  const form = document.getElementById('leadForm');
  if (!form) return;

  const successBox = document.getElementById('formSuccess');

  // ---------- WhatsApp mask ----------
  const whatsappInput = document.getElementById('whatsapp');
  whatsappInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
    if (v.length > 10) v = v.slice(0, 10) + '-' + v.slice(10);
    else if (v.length > 9) v = v.slice(0, 9) + '-' + v.slice(9);
    e.target.value = v;
  });

  // ---------- Submit ----------
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const data = {
      nome: form.nome.value.trim(),
      email: form.email.value.trim(),
      whatsapp: form.whatsapp.value.trim(),
      createdAt: new Date().toISOString(),
      source: 'landing-perifa-midIA',
    };

    if (!data.nome || !data.email || !data.whatsapp) {
      return;
    }

    // Bloqueia duplo submit
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.style.opacity = '0.6';
    button.querySelector('span').textContent = 'Enviando...';

    try {
      // 1) Envia para o webhook do Google Apps Script / Sheets
      //    Crie um Apps Script com doPost() que escreve na planilha
      //    e cole a URL pública aqui:
      const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx7fXEG-lM8MRritJpEibxzMKl5jCCZ0PiX6SpuSDMa9agmIl4NSJT50aP64RvXyErH/exec';

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script exige no-cors para Web App
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      // 2) Dispara o evento Lead no Meta Pixel
      if (typeof fbq !== 'undefined') {
        fbq('track', 'Lead', {
          content_name: 'Landing Perifa Mídia',
          nome: data.nome,
        });
      }

      // 3) Dispara evento no GA
      if (typeof gtag !== 'undefined') {
        gtag('event', 'generate_lead', {
          method: 'landing-page',
          nome: data.nome,
        });
      }

      // 4) Feedback visual
      form.style.display = 'none';
      successBox.hidden = false;

      // 5) Opcional: redireciona para WhatsApp com mensagem pré-preenchida
      const whatsLink = `https://wa.me/5511982613323?text=${encodeURIComponent(
        `Olá, sou ${data.nome}. Vim pelo site da Perifa Mídia e gostaria de conversar sobre mídia OOH.`
      )}`;

      // descomente a linha abaixo se quiser redirecionar após o envio:
      // window.location.href = whatsLink;
    } catch (err) {
      console.error('[Perifa Lead]', err);
      button.disabled = false;
      button.style.opacity = '1';
      button.querySelector('span').textContent = 'Fale Conosco';
    }
  });
})();
