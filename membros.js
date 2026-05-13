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

async function carregarMembros() {
  const tbody = document.getElementById("membrosBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (typeof supabaseClient === "undefined") {
    tbody.innerHTML =
      '<tr class="inventory-empty-row"><td colspan="4">Base de dados indisponível.</td></tr>';
    return;
  }

  const { data, error } = await supabaseClient
    .from("membros")
    .select("id,nome,email,role")
    .order("nome");

  if (error) {
    tbody.innerHTML =
      '<tr class="inventory-empty-row"><td colspan="4">Erro ao carregar membros.</td></tr>';
    console.error(error);
    return;
  }

  const membrosLista = data || [];

  if (!membrosLista.length) {
    tbody.innerHTML =
      '<tr class="inventory-empty-row"><td colspan="4">Sem membros registados.</td></tr>';
    return;
  }

  membrosLista.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Nome">${m.nome || ""}</td>
      <td data-label="Email">${m.email || ""}</td>
      <td data-label="Cargo">${roleLabel(m.role)}</td>
      <td data-label="Ações">
        <button type="button" class="inventory-btn-delete" data-action="delete-member" data-id="${m.id}" data-email="${m.email || ""}" data-name="${m.nome || ""}">Remover</button>
      </td>
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
      <td data-label="Nome">${s.nome || ""}</td>
      <td data-label="Email">${s.email || ""}</td>
      <td data-label="Cargo">${roleLabel(s.role)}</td>
      <td data-label="Ações">
        <button type="button" data-action="accept" data-id="${s.id}">Aceitar</button>
        <button type="button" class="inventory-btn-delete" data-action="reject" data-id="${s.id}">Rejeitar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function removerMembro(id, email, nome) {
  const emailLimpo = String(email || "").trim().toLowerCase();
  if (emailLimpo && emailLimpo === window.GMApp?.getCurrentEmail?.()) {
    mostrarToast("Não pode remover a conta que está a usar agora.", "error");
    return;
  }

  const ok = window.confirm(`Tem a certeza que deseja remover o membro "${nome || email}"?`);
  if (!ok) return;

  const { error } = await supabaseClient
    .from("membros")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    mostrarToast("Erro ao remover membro.", "error");
    return;
  }

  window.GMApp?.logAdminAction?.({
    nome: nome || email || `Membro #${id}`,
    acao: "membro removido",
    detalhes: email ? `Email: ${email}` : "",
  });
  mostrarToast("Membro removido.", "success");
  await carregarMembros();
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
  window.GMApp?.logAdminAction?.({
    nome: sol.nome || sol.email,
    acao: "membro aceite",
    detalhes: `Email: ${sol.email} | Função: ${roleLabel(sol.role || "professor")}`,
  });
  await carregarMembros();
  await carregarSolicitacoes();
}

async function rejeitarSolicitacao(id) {
  const { data: sol } = await supabaseClient
    .from("solicitacoes_registo")
    .select("nome,email,role")
    .eq("id", id)
    .maybeSingle();

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
  window.GMApp?.logAdminAction?.({
    nome: sol?.nome || sol?.email || `Solicitação #${id}`,
    acao: "solicitação rejeitada",
    detalhes: sol?.email ? `Email: ${sol.email}` : "",
  });
  await carregarSolicitacoes();
}

document.addEventListener("DOMContentLoaded", async () => {
  window.GMApp?.wireRouteLinks();
  if (!window.GMApp?.redirectUnlessRole("admin")) return;

  window.GMApp?.setupMenuToggle("btnMenuToggle", "mainMenu");

  const tabM = document.getElementById("tabMembros");
  const tabS = document.getElementById("tabSolicitacoes");
  const membrosBody = document.getElementById("membrosBody");
  const solicitacoesBody = document.getElementById("solicitacoesBody");

  if (tabM) tabM.addEventListener("click", () => setActiveTab("membros"));
  if (tabS) tabS.addEventListener("click", () => setActiveTab("solicitacoes"));

  if (membrosBody) {
    membrosBody.addEventListener("click", (e) => {
      const target = e.target;
      if (target?.dataset?.action !== "delete-member") return;
      const id = Number(target.dataset.id);
      if (!id) return;
      removerMembro(id, target.dataset.email || "", target.dataset.name || "");
    });
  }

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
