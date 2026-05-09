function mostrarToast(texto, tipo = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = texto;
  toast.className = "toast " + tipo + " show";

  if (mostrarToast._timeoutId) clearTimeout(mostrarToast._timeoutId);
  mostrarToast._timeoutId = setTimeout(() => toast.classList.remove("show"), 2500);
}

function setActiveTab(tab) {
  const tabM = document.getElementById("tabMembros");
  const tabS = document.getElementById("tabSolicitacoes");
  const panelM = document.getElementById("panelMembros");
  const panelS = document.getElementById("panelSolicitacoes");

  const isMembros = tab === "membros";
  if (tabM) tabM.classList.toggle("active", isMembros);
  if (tabS) tabS.classList.toggle("active", !isMembros);
  if (panelM) panelM.style.display = isMembros ? "" : "none";
  if (panelS) panelS.style.display = isMembros ? "none" : "";
}

function roleLabel(role) {
  if (role === "admin") return "Admin + Professor";
  if (role === "professor") return "Professor";
  return role || "";
}

function ensureDualMemberVisible(members) {
  const list = Array.isArray(members) ? [...members] : [];
  const dualEmail = "profadimin@gmail.com";
  const exists = list.some(
    (m) => String(m?.email || "").trim().toLowerCase() === dualEmail
  );

  if (!exists) {
    list.unshift({
      nome: "Profadimin",
      email: dualEmail,
      role: "admin",
    });
  }

  return list;
}

async function carregarMembros() {
  const tbody = document.getElementById("membrosBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("membros")
    .select("id,nome,email,role")
    .order("nome");

  if (error) {
    tbody.innerHTML =
      '<tr class="inventory-empty-row"><td colspan="3">Erro ao carregar membros.</td></tr>';
    console.error(error);
    return;
  }

  const membrosLista = ensureDualMemberVisible(data || []);

  if (!membrosLista.length) {
    tbody.innerHTML =
      '<tr class="inventory-empty-row"><td colspan="3">Sem membros registados.</td></tr>';
    return;
  }

  membrosLista.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.nome || ""}</td>
      <td>${m.email || ""}</td>
      <td>${roleLabel(m.role)}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function carregarSolicitacoes() {
  const tabS = document.getElementById("tabSolicitacoes");
  const panelS = document.getElementById("panelSolicitacoes");
  if (!window.GMApp?.hasAccess("admin")) {
    if (tabS) tabS.style.display = "none";
    if (panelS) panelS.style.display = "none";
    return;
  }

  const tbody = document.getElementById("solicitacoesBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("solicitacoes_registo")
    .select("id,nome,email,role,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML =
      '<tr class="inventory-empty-row"><td colspan="4">Erro ao carregar solicitações.</td></tr>';
    console.error(error);
    return;
  }

  if (!data.length) {
    tbody.innerHTML =
      '<tr class="inventory-empty-row"><td colspan="4">Sem solicitações pendentes.</td></tr>';
    return;
  }

  data.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.nome || ""}</td>
      <td>${s.email || ""}</td>
      <td>${roleLabel(s.role)}</td>
      <td>
        <button type="button" data-action="accept" data-id="${s.id}">Aceitar</button>
        <button type="button" class="inventory-btn-delete" data-action="reject" data-id="${s.id}">Rejeitar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function aceitarSolicitacao(id) {
  const msg = document.getElementById("solicitacoesMsg");
  if (msg) msg.textContent = "";

  const { data: sol, error: errSol } = await supabaseClient
    .from("solicitacoes_registo")
    .select("id,nome,email,role")
    .eq("id", id)
    .single();

  if (errSol) {
    console.error(errSol);
    mostrarToast("Erro ao aceitar solicitação.", "error");
    return;
  }

  const { error: errIns } = await supabaseClient.from("membros").insert([
    {
      nome: sol.nome,
      email: sol.email,
      role: sol.role || "professor",
    },
  ]);

  if (errIns) {
    console.error(errIns);
    mostrarToast("Erro ao adicionar membro.", "error");
    return;
  }

  const { error: errDel } = await supabaseClient
    .from("solicitacoes_registo")
    .delete()
    .eq("id", id);

  if (errDel) {
    console.error(errDel);
    mostrarToast("Membro criado, mas falhou remover solicitação.", "error");
    return;
  }

  mostrarToast("Solicitação aceite.", "success");
  await carregarMembros();
  await carregarSolicitacoes();
}

async function rejeitarSolicitacao(id) {
  const { error } = await supabaseClient
    .from("solicitacoes_registo")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    mostrarToast("Erro ao rejeitar solicitação.", "error");
    return;
  }

  mostrarToast("Solicitação rejeitada.", "success");
  await carregarSolicitacoes();
}

document.addEventListener("DOMContentLoaded", async () => {
  window.GMApp?.wireRouteLinks();
  if (!window.GMApp?.hasAccess("admin")) {
    window.GMApp?.goTo("profReports");
    return;
  }

  window.GMApp?.setupMenuToggle("btnMenuToggleMembros", "mainMenu");

  const tabM = document.getElementById("tabMembros");
  const tabS = document.getElementById("tabSolicitacoes");
  const solicitacoesBody = document.getElementById("solicitacoesBody");

  if (tabM) tabM.addEventListener("click", () => setActiveTab("membros"));
  if (tabS) tabS.addEventListener("click", () => setActiveTab("solicitacoes"));

  if (solicitacoesBody) {
    solicitacoesBody.addEventListener("click", (e) => {
      const target = e.target;
      if (!target?.dataset?.action) return;
      const id = Number(target.dataset.id);
      if (!id) return;
      if (target.dataset.action === "accept") aceitarSolicitacao(id);
      if (target.dataset.action === "reject") rejeitarSolicitacao(id);
    });
  }

  const hash = (window.location.hash || "").replace("#", "");
  const tabInicial = hash === "solicitacoes" ? "solicitacoes" : "membros";
  setActiveTab(tabInicial);
  await carregarMembros();
  await carregarSolicitacoes();
});

