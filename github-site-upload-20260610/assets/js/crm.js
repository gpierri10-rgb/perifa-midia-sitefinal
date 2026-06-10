const form = document.querySelector("#crm-form");
const tableBody = document.querySelector("[data-leads-body]");
const message = document.querySelector("[data-crm-message]");
const searchInput = document.querySelector("[data-search]");
const statusFilter = document.querySelector("[data-status-filter]");
const interestFilter = document.querySelector("[data-interest-filter]");
const submitButton = document.querySelector("[data-submit]");
const resetButton = document.querySelector("[data-reset]");
const importFileInput = document.querySelector("[data-import-file]");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

let editingId = "";

function setMessage(text) {
  if (message instanceof HTMLElement) {
    message.textContent = text;
  }
}

function fillSelect(select, options) {
  if (!(select instanceof HTMLSelectElement)) return;

  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option;
    select.append(item);
  });
}

function formatDate(value) {
  if (!value) return "Sem data";

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Sem data" : dateFormatter.format(date);
}

function getFormLead() {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

function resetForm() {
  editingId = "";
  form.reset();
  form.querySelector("#lead-id").value = "";
  form.querySelector("#lead-source").value = "CRM";
  form.querySelector("#lead-status").value = "Novo";
  form.querySelector("#lead-interest").value = "Convite lançamento";
  submitButton.textContent = "Salvar lead";
}

function getFilteredLeads() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  const selectedInterest = interestFilter.value;

  return window.PerifaCRM.getLeads()
    .filter((lead) => {
      const matchesStatus = !selectedStatus || lead.status === selectedStatus;
      const matchesInterest = !selectedInterest || lead.interest === selectedInterest;
      const searchable = [
        lead.name,
        lead.company,
        lead.email,
        lead.phone,
        lead.city,
        lead.state,
        lead.interest,
        lead.status,
        lead.notes
      ].join(" ").toLowerCase();

      return matchesStatus && matchesInterest && (!query || searchable.includes(query));
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function renderStats(leads) {
  const openStatuses = new Set(["Novo", "Qualificar", "Contato feito", "Proposta"]);
  const stats = {
    total: leads.length,
    new: leads.filter((lead) => lead.status === "Novo").length,
    open: leads.filter((lead) => openStatuses.has(lead.status)).length,
    won: leads.filter((lead) => lead.status === "Fechado").length,
    value: leads.reduce((sum, lead) => sum + Number(lead.estimatedValue || 0), 0)
  };

  document.querySelector("[data-stat='total']").textContent = stats.total;
  document.querySelector("[data-stat='new']").textContent = stats.new;
  document.querySelector("[data-stat='open']").textContent = stats.open;
  document.querySelector("[data-stat='won']").textContent = stats.won;
  document.querySelector("[data-stat='value']").textContent = currencyFormatter.format(stats.value);
}

function createCell(text, className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
}

function createLeadCell(lead) {
  const cell = document.createElement("td");
  const name = document.createElement("strong");
  const company = document.createElement("span");
  const contact = document.createElement("small");

  name.textContent = lead.name || "Sem nome";
  company.textContent = lead.company || lead.role || "Sem empresa";
  contact.textContent = [lead.email, lead.phone].filter(Boolean).join(" | ") || "Sem contato";

  cell.append(name, company, contact);
  return cell;
}

function createStatusCell(lead) {
  const cell = document.createElement("td");
  const pill = document.createElement("span");
  const slug = lead.status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");

  pill.className = `crm-status crm-status--${slug}`;
  pill.textContent = lead.status;
  cell.append(pill);
  return cell;
}

function createActionCell(lead) {
  const cell = document.createElement("td");
  const actions = document.createElement("div");
  const editButton = document.createElement("button");
  const deleteButton = document.createElement("button");

  actions.className = "crm-row-actions";
  editButton.className = "crm-icon-button";
  editButton.type = "button";
  editButton.dataset.edit = lead.id;
  editButton.textContent = "Editar";

  deleteButton.className = "crm-icon-button crm-icon-button--danger";
  deleteButton.type = "button";
  deleteButton.dataset.delete = lead.id;
  deleteButton.textContent = "Excluir";

  actions.append(editButton, deleteButton);
  cell.append(actions);
  return cell;
}

function renderTable(leads) {
  tableBody.replaceChildren();

  if (!leads.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "crm-empty";
    cell.colSpan = 7;
    cell.textContent = "Nenhum lead encontrado.";
    row.append(cell);
    tableBody.append(row);
    return;
  }

  leads.forEach((lead) => {
    const row = document.createElement("tr");
    row.append(
      createLeadCell(lead),
      createCell(lead.interest),
      createStatusCell(lead),
      createCell([lead.city, lead.state].filter(Boolean).join(" / ") || "Sem local"),
      createCell(formatDate(lead.nextAction)),
      createCell(currencyFormatter.format(Number(lead.estimatedValue || 0))),
      createActionCell(lead)
    );
    tableBody.append(row);
  });
}

function render() {
  const leads = window.PerifaCRM.getLeads();
  renderStats(leads);
  renderTable(getFilteredLeads());
}

function populateForm(lead) {
  editingId = lead.id;

  Object.entries(lead).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
      field.value = value ?? "";
    }
  });

  submitButton.textContent = "Atualizar lead";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toCsv(leads) {
  const headers = [
    "Nome",
    "Empresa",
    "Cargo",
    "E-mail",
    "Telefone",
    "Cidade",
    "UF",
    "Interesse",
    "Status",
    "Origem",
    "Responsável",
    "Próxima ação",
    "Valor estimado",
    "Observações",
    "Criado em",
    "Atualizado em"
  ];

  const rows = leads.map((lead) => [
    lead.name,
    lead.company,
    lead.role,
    lead.email,
    lead.phone,
    lead.city,
    lead.state,
    lead.interest,
    lead.status,
    lead.source,
    lead.owner,
    lead.nextAction,
    lead.estimatedValue,
    lead.notes,
    lead.createdAt,
    lead.updatedAt
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function init() {
  fillSelect(form.querySelector("#lead-interest"), window.PerifaCRM.INTERESTS);
  fillSelect(form.querySelector("#lead-status"), window.PerifaCRM.STATUSES);
  fillSelect(statusFilter, window.PerifaCRM.STATUSES);
  fillSelect(interestFilter, window.PerifaCRM.INTERESTS);
  resetForm();
  render();
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const lead = getFormLead();
  const hasContact = lead.email || lead.phone;

  if (!lead.name?.trim()) {
    setMessage("Informe o nome do lead.");
    form.querySelector("#lead-name").focus();
    return;
  }

  if (!hasContact) {
    setMessage("Informe e-mail ou telefone.");
    form.querySelector("#lead-email").focus();
    return;
  }

  if (editingId) {
    window.PerifaCRM.updateLead(editingId, lead);
    setMessage("Lead atualizado.");
  } else {
    window.PerifaCRM.upsertLead(lead);
    setMessage("Lead salvo.");
  }

  resetForm();
  render();
});

resetButton?.addEventListener("click", resetForm);

[searchInput, statusFilter, interestFilter].forEach((control) => {
  control?.addEventListener("input", render);
  control?.addEventListener("change", render);
});

tableBody?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  if (target.dataset.edit) {
    const lead = window.PerifaCRM.getLeads().find((item) => item.id === target.dataset.edit);
    if (lead) populateForm(lead);
  }

  if (target.dataset.delete) {
    const lead = window.PerifaCRM.getLeads().find((item) => item.id === target.dataset.delete);
    const label = lead?.name || lead?.email || "este lead";

    if (window.confirm(`Excluir ${label}?`)) {
      window.PerifaCRM.removeLead(target.dataset.delete);
      render();
      setMessage("Lead excluído.");
    }
  }
});

document.querySelector("[data-export-csv]")?.addEventListener("click", () => {
  downloadFile("perifa-midia-leads.csv", toCsv(window.PerifaCRM.getLeads()), "text/csv;charset=utf-8");
});

document.querySelector("[data-export-json]")?.addEventListener("click", () => {
  const content = JSON.stringify({ leads: window.PerifaCRM.getLeads() }, null, 2);
  downloadFile("perifa-midia-crm-backup.json", content, "application/json;charset=utf-8");
});

document.querySelector("[data-import-json]")?.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput?.addEventListener("change", async () => {
  const file = importFileInput.files?.[0];
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const leads = Array.isArray(parsed) ? parsed : parsed.leads;
    if (!Array.isArray(leads)) {
      throw new Error("Arquivo sem lista de leads.");
    }
    window.PerifaCRM.importLeads(leads);
    render();
    setMessage("Backup importado.");
  } catch (error) {
    setMessage("Não foi possível importar o arquivo.");
  } finally {
    importFileInput.value = "";
  }
});

document.querySelector("[data-clear]")?.addEventListener("click", () => {
  if (window.confirm("Limpar todos os leads deste navegador?")) {
    window.PerifaCRM.clearLeads();
    resetForm();
    render();
    setMessage("Banco local limpo.");
  }
});

window.addEventListener("perifa-crm:changed", render);

init();
