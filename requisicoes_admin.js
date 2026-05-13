function mostrarToast(texto, tipo = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = texto;
  toast.className = "toast " + tipo + " show";
  if (mostrarToast._timeoutId) clearTimeout(mostrarToast._timeoutId);
  mostrarToast._timeoutId = setTimeout(() => toast.classList.remove("show"), 2500);
}

function leituraBadge(lido) {
  const ok = Boolean(lido);
  return `<span class="${ok ? "status-badge aprovado" : "status-badge pendente"}">${
    ok ? "Lido" : "Não lido"
  }</span>`;
}

async function carregarEquipamentosNomeMap() {
  const { data, error } = await supabaseClient
    .from("equipamentos")
    .select("id,descricao")
    .order("descricao");
  if (error) throw error;
  const map = {};
  (data || []).forEach((e) => {
    map[String(e.id)] = e.descricao || "—";
  });
  return map;
}

async function carregarRequisicoes() {
  const { data, error } = await supabaseClient
    .from("lista")
    .select(
      "id,equipamento_id,quantidade,descricao,pedido_em,status,prof_email,prof_role,lido"
    )
    .order("pedido_em", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function marcarComoLidoPorProfessor(email) {
  const em = String(email || "").trim().toLowerCase();
  if (!em) return;
  const { error } = await supabaseClient
    .from("lista")
    .update({ lido: true })
    .eq("prof_email", em)
    .eq("lido", false);
  if (error) throw error;
}

function parseTempoEDescricao(descricaoRaw) {
  const txt = String(descricaoRaw || "");
  const m = txt.match(/^\[tempo=(\d+)\]\s*(.*)$/i);
  if (!m) return { tempo: "", descricao: txt };
  return { tempo: String(Number(m[1] || 0) || ""), descricao: m[2] || "" };
}

function formatDiaCurto(isoOrDate) {
  const d = new Date(isoOrDate);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(d);
}

function agruparPorProfessor(requisicoes) {
  const grupos = {};
  (requisicoes || []).forEach((r) => {
    const email = String(r.prof_email || "").trim().toLowerCase() || "sem-email";
    if (!grupos[email]) grupos[email] = [];
    grupos[email].push(r);
  });
  return grupos;
}

function renderizarTabela(requisicoes, equipNomeMap, professorEmail) {
  const tbody = document.getElementById("requisicoesAdminBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!professorEmail) {
    const tr = document.createElement("tr");
    tr.className = "inventory-empty-row";
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Selecione um professor para visualizar os registos.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  if (!requisicoes.length) {
    const tr = document.createElement("tr");
    tr.className = "inventory-empty-row";
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Este professor ainda não tem registos na lista.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  let diaAtual = null;
  requisicoes.forEach((r) => {
    const dh = r.pedido_em || r.created_at;
    const dia = formatDiaCurto(dh);

    if (dia !== diaAtual) {
      diaAtual = dia;
      const trDia = document.createElement("tr");
      trDia.className = "listagem-dia-row";
      const tdDia = document.createElement("td");
      tdDia.className = "listagem-dia-cell";
      tdDia.textContent = diaAtual;

      const tdTempoLabel = document.createElement("td");
      tdTempoLabel.className = "listagem-dia-label";
      tdTempoLabel.textContent = "Tempo";

      const tdQtdLabel = document.createElement("td");
      tdQtdLabel.className = "listagem-dia-label";
      tdQtdLabel.textContent = "Qtd.";

      const tdDescLabel = document.createElement("td");
      tdDescLabel.className = "listagem-dia-label";
      tdDescLabel.textContent = "Descrição";

      const tdEstadoLabel = document.createElement("td");
      tdEstadoLabel.className = "listagem-dia-label";
      tdEstadoLabel.textContent = "Estado";

      trDia.appendChild(tdDia);
      trDia.appendChild(tdTempoLabel);
      trDia.appendChild(tdQtdLabel);
      trDia.appendChild(tdDescLabel);
      trDia.appendChild(tdEstadoLabel);
      tbody.appendChild(trDia);
    }

    const tr = document.createElement("tr");

    const tdEq = document.createElement("td");
    tdEq.dataset.label = "Equipamento";
    tdEq.textContent = equipNomeMap[String(r.equipamento_id)] || "—";

    const tdTempo = document.createElement("td");
    tdTempo.dataset.label = "Tempo";
    const parsed = parseTempoEDescricao(r.descricao);
    tdTempo.textContent = parsed.tempo || "—";

    const tdQtd = document.createElement("td");
    tdQtd.dataset.label = "Qtd.";
    tdQtd.textContent = String(r.quantidade);

    const tdDesc = document.createElement("td");
    tdDesc.dataset.label = "Descrição";
    tdDesc.textContent = parsed.descricao || "—";

    const tdStatus = document.createElement("td");
    tdStatus.dataset.label = "Estado";
    tdStatus.innerHTML = leituraBadge(r.lido);

    tr.appendChild(tdEq);
    tr.appendChild(tdTempo);
    tr.appendChild(tdQtd);
    tr.appendChild(tdDesc);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  });
}

function renderizarListaProfessores(grupos, professorAtivo) {
  const wrap = document.getElementById("listaProfessoresAdmin");
  if (!wrap) return;
  wrap.innerHTML = "";

  const emails = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "pt"));
  if (!emails.length) {
    const p = document.createElement("p");
    p.className = "listagem-empty";
    p.textContent = "Ainda não existem professores com listas.";
    wrap.appendChild(p);
    return;
  }

  emails.forEach((email) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "listagem-professor-btn";
    if (email === professorAtivo) btn.classList.add("active");
    btn.dataset.email = email;
    btn.textContent = email;

    const badge = document.createElement("span");
    badge.className = "listagem-professor-count";
    badge.textContent = String((grupos[email] || []).length);
    btn.appendChild(badge);
    wrap.appendChild(btn);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  window.GMApp?.wireRouteLinks();
  window.GMApp?.setupMenuToggle("btnMenuToggle", "mainMenu");

  if (!window.GMApp?.redirectUnlessRole("admin")) return;

  if (typeof supabaseClient === "undefined") {
    mostrarToast("Supabase não disponível.", "error");
    return;
  }

  let equipNomeMap = {};
  let requisicoesTodas = [];
  let gruposPorProfessor = {};
  let professorSelecionado = null;
  const tituloListaProfessor = document.getElementById("tituloListaProfessor");
  const subtituloListaProfessor = document.getElementById("subtituloListaProfessor");

  try {
    equipNomeMap = await carregarEquipamentosNomeMap();
    requisicoesTodas = await carregarRequisicoes();
    gruposPorProfessor = agruparPorProfessor(requisicoesTodas);
    professorSelecionado = Object.keys(gruposPorProfessor).sort((a, b) =>
      a.localeCompare(b, "pt")
    )[0] || null;

    renderizarListaProfessores(gruposPorProfessor, professorSelecionado);
    if (tituloListaProfessor) {
      tituloListaProfessor.textContent = professorSelecionado
        ? `Lista de ${professorSelecionado}`
        : "Selecione um professor";
    }
    if (subtituloListaProfessor) {
      subtituloListaProfessor.textContent = professorSelecionado
        ? "Registos de equipamentos indicados para uso nas aulas."
        : "Clique num professor para ver as listas já criadas.";
    }
    renderizarTabela(
      professorSelecionado ? gruposPorProfessor[professorSelecionado] || [] : [],
      equipNomeMap,
      professorSelecionado
    );

    if (professorSelecionado) {
      await marcarComoLidoPorProfessor(professorSelecionado);
      (gruposPorProfessor[professorSelecionado] || []).forEach((r) => (r.lido = true));
      renderizarTabela(gruposPorProfessor[professorSelecionado] || [], equipNomeMap, professorSelecionado);
    }
  } catch (e) {
    console.error(e);
    mostrarToast(e?.message || "Erro ao carregar lista de uso.", "error");
  }

  const listaProfessoresAdmin = document.getElementById("listaProfessoresAdmin");
  if (listaProfessoresAdmin) {
    listaProfessoresAdmin.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-email]");
      if (!btn) return;
      professorSelecionado = String(btn.dataset.email || "");
      renderizarListaProfessores(gruposPorProfessor, professorSelecionado);
      if (tituloListaProfessor) {
        tituloListaProfessor.textContent = `Lista de ${professorSelecionado}`;
      }
      if (subtituloListaProfessor) {
        subtituloListaProfessor.textContent =
          "Registos de equipamentos indicados para uso nas aulas.";
      }
      renderizarTabela(
        gruposPorProfessor[professorSelecionado] || [],
        equipNomeMap,
        professorSelecionado
      );

      try {
        await marcarComoLidoPorProfessor(professorSelecionado);
        (gruposPorProfessor[professorSelecionado] || []).forEach((r) => (r.lido = true));
        renderizarListaProfessores(gruposPorProfessor, professorSelecionado);
        renderizarTabela(
          gruposPorProfessor[professorSelecionado] || [],
          equipNomeMap,
          professorSelecionado
        );
      } catch (err) {
        console.error(err);
      }
    });
  }
});

