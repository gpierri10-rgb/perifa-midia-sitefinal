(() => {
  const STORAGE_KEY = "perifaMidia.crm.leads.v1";

  const STATUSES = [
    "Novo",
    "Qualificar",
    "Contato feito",
    "Proposta",
    "Fechado",
    "Perdido"
  ];

  const INTERESTS = [
    "Convite lançamento",
    "OOH Periférico",
    "Perifa Praça",
    "Dados & Inteligência",
    "Cultura",
    "Mobilidade",
    "Criadores",
    "Parceria",
    "Outro"
  ];

  const emptyToFallback = (value, fallback = "") => {
    const text = String(value ?? "").trim();
    return text || fallback;
  };

  const normalizeEmail = (value) => emptyToFallback(value).toLowerCase();

  const createId = () => {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const parseMoney = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    const text = emptyToFallback(value);
    if (!text) return 0;

    const normalized = text
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normalizeLead = (lead = {}, previous = {}, options = {}) => {
    const now = new Date().toISOString();
    const status = STATUSES.includes(lead.status) ? lead.status : emptyToFallback(previous.status, "Novo");
    const interest = INTERESTS.includes(lead.interest)
      ? lead.interest
      : emptyToFallback(previous.interest, "Convite lançamento");

    return {
      id: emptyToFallback(previous.id || lead.id, createId()),
      name: emptyToFallback(lead.name, previous.name),
      company: emptyToFallback(lead.company, previous.company),
      role: emptyToFallback(lead.role, previous.role),
      email: normalizeEmail(lead.email || previous.email),
      phone: emptyToFallback(lead.phone, previous.phone),
      city: emptyToFallback(lead.city, previous.city),
      state: emptyToFallback(lead.state, previous.state).toUpperCase().slice(0, 2),
      interest,
      source: emptyToFallback(lead.source, previous.source || "CRM"),
      status,
      owner: emptyToFallback(lead.owner, previous.owner),
      nextAction: emptyToFallback(lead.nextAction, previous.nextAction),
      estimatedValue: parseMoney(lead.estimatedValue ?? previous.estimatedValue),
      notes: emptyToFallback(lead.notes, previous.notes),
      createdAt: previous.createdAt || lead.createdAt || now,
      updatedAt: options.touch ? now : lead.updatedAt || previous.updatedAt || now
    };
  };

  const readLeads = () => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const leads = JSON.parse(stored || "[]");

      if (!Array.isArray(leads)) {
        return [];
      }

      return leads.map((lead) => normalizeLead(lead, lead));
    } catch (error) {
      console.warn("Não foi possível ler o banco local do CRM.", error);
      return [];
    }
  };

  const writeLeads = (leads) => {
    const normalized = leads.map((lead) => normalizeLead(lead, lead));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("perifa-crm:changed", { detail: normalized }));
    return normalized;
  };

  const getLeadIndex = (leads, lead) => {
    const email = normalizeEmail(lead.email);
    if (email) {
      const byEmail = leads.findIndex((item) => normalizeEmail(item.email) === email);
      if (byEmail >= 0) return byEmail;
    }

    return leads.findIndex((item) => item.id === lead.id);
  };

  const upsertLead = (lead) => {
    const leads = readLeads();
    const index = getLeadIndex(leads, lead);
    const created = index < 0;
    const nextLead = normalizeLead(lead, created ? {} : leads[index], { touch: true });

    if (created) {
      leads.unshift(nextLead);
    } else {
      leads[index] = nextLead;
    }

    writeLeads(leads);
    return { lead: nextLead, created };
  };

  const updateLead = (id, patch) => {
    const leads = readLeads();
    const index = leads.findIndex((lead) => lead.id === id);
    if (index < 0) return null;

    const nextLead = normalizeLead({ ...leads[index], ...patch, id }, leads[index], { touch: true });
    leads[index] = nextLead;
    writeLeads(leads);
    return nextLead;
  };

  const removeLead = (id) => {
    const leads = readLeads();
    const nextLeads = leads.filter((lead) => lead.id !== id);
    writeLeads(nextLeads);
    return nextLeads.length !== leads.length;
  };

  const importLeads = (incomingLeads) => {
    const leads = readLeads();
    const imported = Array.isArray(incomingLeads) ? incomingLeads : [];

    imported.forEach((lead) => {
      const index = getLeadIndex(leads, lead);
      const nextLead = normalizeLead(lead, index >= 0 ? leads[index] : {});

      if (index >= 0) {
        leads[index] = nextLead;
      } else {
        leads.unshift(nextLead);
      }
    });

    return writeLeads(leads);
  };

  window.PerifaCRM = {
    STORAGE_KEY,
    STATUSES,
    INTERESTS,
    getLeads: readLeads,
    saveLeads: writeLeads,
    upsertLead,
    updateLead,
    removeLead,
    importLeads,
    clearLeads: () => writeLeads([])
  };
})();
