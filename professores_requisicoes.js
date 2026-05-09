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

function getEmailAtual() {
  return String(localStorage.getItem("gm_desporto_user_email") || "").toLowerCase();
}

function renderizarEquipamentosSelect(equipamentos) {
  const sel = document.getElementById("reqEquipamento");
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecione um equipamento...</option>';
  equipamentos.forEach((e) => {
    const opt = document.createElement("option");
    opt.value = String(e.id);
    opt.textContent = e.nome;
    sel.appendChild(opt);
  });
}

function resetForm() {
  const form = document.getElementById("reqForm");
  const idInput = document.getElementById("reqEditingId");
  if (idInput) idInput.value = "";
  if (!form) return;
  form.reset();
}

function preencherForm(editItem) {
  const idInput = document.getElementById("reqEditingId");
  if (idInput) idInput.value = String(editItem.id);
  const form = document.getElementById("reqForm");
  if (form) {
    form.dataset.editLocalId =
      editItem.local_id !== undefined && editItem.local_id !== null
        ? String(editItem.local_id)
        : "";
    form.dataset.editEquipamentoId =
      editItem.equipamento_id !== undefined && editItem.equipamento_id !== null
        ? String(editItem.equipamento_id)
        : "";
  }

  const eqSel = document.getElementById("reqEquipamento");
  const qtd = document.getElementById("reqQuantidade");
  const duracaoInput = document.getElementById("reqDuracaoMin");
  const duracaoOutroInput = document.getElementById("reqDuracaoMinOutro");
  const desc = document.getElementById("reqDescricao");
  const parsed = parseDescricaoMetadata(editItem.descricao);

  if (eqSel) eqSel.value = String(editItem.equipamento_id);
  if (qtd) qtd.value = String(editItem.quantidade);
  if (duracaoInput) duracaoInput.value = String(parsed.duracaoMin);
  setTempoOpcaoUi(parsed.duracaoMin);
  if (duracaoOutroInput && ![45, 90].includes(Number(parsed.duracaoMin))) {
    duracaoOutroInput.value = String(parsed.duracaoMin);
  }
  if (desc) desc.value = parsed.descricao || "";
}

function setTempoOpcaoUi(duracaoMin) {
  const m = Number(duracaoMin);
  const radio45 = document.getElementById("reqTempo45");
  const radio90 = document.getElementById("reqTempo90");
  const radioOutro = document.getElementById("reqTempoOutro");
  const outroInput = document.getElementById("reqDuracaoMinOutro");

  if (!radio45 || !radio90 || !radioOutro) return;

  if (m === 45) {
    radio45.checked = true;
  } else if (m === 90) {
    radio90.checked = true;
  } else {
    radioOutro.checked = true;
  }

  toggleTempoOutroVisibility();
}

function toggleTempoOutroVisibility() {
  const outroRadio = document.getElementById("reqTempoOutro");
  const outroInput = document.getElementById("reqDuracaoMinOutro");
  if (!outroRadio || !outroInput) return;
  outroInput.style.display = outroRadio.checked ? "" : "none";
}

function syncDuracaoMinHidden() {
  const hidden = document.getElementById("reqDuracaoMin");
  if (!hidden) return;

  const checked = document.querySelector('input[name="reqTempoOpcao"]:checked');
  const val = checked ? String(checked.value) : "";

  if (val === "45" || val === "90") {
    hidden.value = val;
    return;
  }

  const outroInput = document.getElementById("reqDuracaoMinOutro");
  hidden.value = String(outroInput?.value || "");
}

async function carregarEquipamentos() {
  const { data, error } = await supabaseClient
    .from("equipamentos")
    .select("id,descricao,local,quantidade,stock")
    .order("descricao");
  if (error) throw error;
  return (data || []).map((e) => ({
    id: e.id,
    nome: e.descricao || "—",
    local: e.local || null,
    quantidade: Number(e.quantidade ?? 0),
    stock: e.stock === null || e.stock === undefined ? null : Number(e.stock),
  }));
}

function getMaxQtyForEquipamento(eq) {
  if (!eq) return 0;
  const stock = Number(eq.stock);
  if (Number.isFinite(stock) && stock >= 0) return stock;
  const qtd = Number(eq.quantidade);
  return Number.isFinite(qtd) && qtd >= 0 ? qtd : 0;
}

async function carregarLocais() {
  const { data, error } = await supabaseClient
    .from("locais")
    .select("id,nome")
    .order("nome");
  if (error) throw error;
  return (data || []).map((l) => ({ id: l.id, nome: l.nome || "—" }));
}

function buildLocalNomeToIdMap(locais) {
  const m = {};
  (locais || []).forEach((l) => {
    const nome = String(l.nome || "").trim();
    if (nome) m[nome] = Number(l.id);
  });
  return m;
}

function getLocalIdByEquipamentoId(equipamentos, localNomeToId, equipamentoId) {
  const idNum = Number(equipamentoId);
  const eq = (equipamentos || []).find((e) => Number(e.id) === idNum);
  const localNome = String(eq?.local || "").trim();
  const localId = localNome ? Number(localNomeToId?.[localNome]) : NaN;
  return Number.isFinite(localId) ? localId : null;
}

async function carregarRequisicoes() {
  const email = getEmailAtual();
  if (!email) return [];
  const { data, error } = await supabaseClient
    .from("lista")
    .select(
      "id,equipamento_id,local_id,quantidade,descricao,pedido_em,status,prof_email,lido"
    )
    .eq("prof_email", email)
    .order("pedido_em", { ascending: false });
  if (error) throw error;
  return data || [];
}

function mapStatusToTd(status) {
  return leituraBadge(false);
}

async function carregarEquipamentoNomeMap(equipamentos) {
  const m = {};
  equipamentos.forEach((e) => (m[String(e.id)] = e.nome));
  return m;
}

function parseDescricaoMetadata(descricaoRaw) {
  const txt = String(descricaoRaw || "");
  const m = txt.match(/^\[tempo=(\d+)\]\s*(.*)$/i);
  if (!m) return { duracaoMin: 50, descricao: txt };
  return { duracaoMin: Number(m[1] || 50), descricao: m[2] || "" };
}

function buildDescricao(duracaoMin, descricaoLivre) {
  const desc = String(descricaoLivre || "").trim();
  return `[tempo=${duracaoMin}] ${desc}`.trim();
}

function getFimPrevistoIso(req, duracaoMin) {
  const ini = req.pedido_em || req.created_at;
  if (!ini) return null;
  const t = new Date(ini).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + Number(duracaoMin || 0) * 60000).toISOString();
}

function renderizarTabela(requisicoes, equipNomeMap) {
  const tbody = document.getElementById("requisicoesProfBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!requisicoes.length) {
    const tr = document.createElement("tr");
    tr.className = "inventory-empty-row";
    const td = document.createElement("td");
    td.colSpan = 7;
      td.textContent = "Ainda não existem equipamentos listados por si.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  requisicoes.forEach((r) => {
    const tr = document.createElement("tr");
    const dh = r.pedido_em || r.created_at;
    const st = String(r.status || "pendente").toLowerCase().trim();

    const tdData = document.createElement("td");
    tdData.textContent = dh ? new Date(dh).toLocaleString("pt-PT") : "—";

    const tdEq = document.createElement("td");
    tdEq.textContent = equipNomeMap[String(r.equipamento_id)] || "—";

    const tdQtd = document.createElement("td");
    tdQtd.textContent = String(r.quantidade);

    const parsed = parseDescricaoMetadata(r.descricao);
    const tdTempo = document.createElement("td");
    tdTempo.textContent = `${Number(parsed.duracaoMin)}min`;

    const tdDesc = document.createElement("td");
    tdDesc.textContent = parsed.descricao || "—";

    const tdStatus = document.createElement("td");
    tdStatus.innerHTML = leituraBadge(r.lido);

    const tdAcao = document.createElement("td");

    if (st === "pendente" || st === "listado") {
      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "inventory-btn-edit";
      btnEdit.textContent = "✏️";
      btnEdit.dataset.action = "edit";
      btnEdit.dataset.id = String(r.id);

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "inventory-btn-delete";
      btnDel.textContent = "Apagar";
      btnDel.dataset.action = "delete_item";
      btnDel.dataset.id = String(r.id);

      tdAcao.appendChild(btnEdit);
      tdAcao.appendChild(btnDel);
    } else {
      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "inventory-btn-delete";
      btnDel.textContent = "Apagar";
      btnDel.dataset.action = "delete_item";
      btnDel.dataset.id = String(r.id);
      tdAcao.appendChild(btnDel);
    }

    tr.appendChild(tdData);
    tr.appendChild(tdEq);
    tr.appendChild(tdQtd);
    tr.appendChild(tdTempo);
    tr.appendChild(tdDesc);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAcao);

    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  window.GMApp?.wireRouteLinks();
  window.GMApp?.setupMenuToggle("btnMenuToggleProf", "mainMenuProf");

  if (!window.GMApp?.hasAccess("professor")) {
    window.GMApp?.goTo("adminUsage");
    return;
  }

  if (typeof supabaseClient === "undefined") {
    mostrarToast("Supabase não disponível.", "error");
    return;
  }

  const novaBtn = document.getElementById("btnNovaRequisicao");
  const tabRequisicoes = document.getElementById("tabRequisicoes");
  const panelNova = document.getElementById("panelNovaRequisicao");
  const panelLista = document.getElementById("panelRequisicoes");
  const form = document.getElementById("reqForm");
  const editarPanel = document.getElementById("requisicaoFormPanel");
  const submitBtn = document.getElementById("reqSubmitBtn");

  let equipamentos = [];
  let locais = [];
  let localNomeToId = {};
  let equipNomeMap = {};

  const eqSelEl = document.getElementById("reqEquipamento");
  const qtdEl = document.getElementById("reqQuantidade");

  function aplicarLimiteQuantidade() {
    if (!eqSelEl || !qtdEl) return;
    const eqId = Number(eqSelEl.value);
    const eq = (equipamentos || []).find((e) => Number(e.id) === eqId);
    const max = getMaxQtyForEquipamento(eq);

    qtdEl.max = String(Math.max(0, Number(max || 0)));

    if (max > 0) {
      qtdEl.placeholder = `Máx.: ${max}`;
      qtdEl.title = `Quantidade máxima disponível: ${max}`;
    } else if (eqSelEl.value) {
      qtdEl.placeholder = "Sem stock";
      qtdEl.title = "Sem stock disponível para este equipamento.";
    } else {
      qtdEl.placeholder = "Ex.: 1";
      qtdEl.title = "";
    }
  }

  function setActiveTab(tab) {
    if (!panelNova || !panelLista || !novaBtn || !tabRequisicoes) return;
    const isNova = tab === "nova";
    panelNova.style.display = isNova ? "" : "none";
    panelLista.style.display = isNova ? "none" : "";
    novaBtn.classList.toggle("active", isNova);
    tabRequisicoes.classList.toggle("active", !isNova);
    novaBtn.setAttribute("aria-selected", String(isNova));
    tabRequisicoes.setAttribute("aria-selected", String(!isNova));
  }

  try {
    equipamentos = await carregarEquipamentos();
    equipNomeMap = await carregarEquipamentoNomeMap(equipamentos);
    renderizarEquipamentosSelect(equipamentos);
    locais = await carregarLocais();
    localNomeToId = buildLocalNomeToIdMap(locais);
    aplicarLimiteQuantidade();
  } catch (e) {
    console.error(e);
    mostrarToast("Erro ao carregar dados do formulário.", "error");
    return;
  }

  let requisicoes = [];
  try {
    requisicoes = await carregarRequisicoes();
    renderizarTabela(requisicoes, equipNomeMap);
  } catch (e) {
    console.error(e);
    mostrarToast("Erro ao carregar as suas requisições.", "error");
  }

  setActiveTab("requisicoes");

  if (eqSelEl) {
    eqSelEl.addEventListener("change", () => {
      aplicarLimiteQuantidade();
      if (!qtdEl) return;
      const eqId = Number(eqSelEl.value);
      const eq = (equipamentos || []).find((e) => Number(e.id) === eqId);
      const max = getMaxQtyForEquipamento(eq);
      const current = Number(qtdEl.value);
      if (Number.isFinite(current) && max >= 0 && current > max) {
        qtdEl.value = String(max);
        mostrarToast(`A quantidade máxima deste equipamento é ${max}.`, "error");
      }
    });
  }

  if (novaBtn) {
    novaBtn.addEventListener("click", () => {
      resetForm();
      const idInput = document.getElementById("reqEditingId");
      if (idInput) idInput.value = "";
      const duracaoInput = document.getElementById("reqDuracaoMin");
      if (duracaoInput) duracaoInput.value = "";
      const duracaoOutroInput = document.getElementById("reqDuracaoMinOutro");
      if (duracaoOutroInput) duracaoOutroInput.value = "";
      const radio45 = document.getElementById("reqTempo45");
      if (radio45) radio45.checked = false;
      const radio90 = document.getElementById("reqTempo90");
      if (radio90) radio90.checked = false;
      const radioOutro = document.getElementById("reqTempoOutro");
      if (radioOutro) radioOutro.checked = false;
      toggleTempoOutroVisibility();
      const eqSel = document.getElementById("reqEquipamento");
      if (eqSel) eqSel.value = "";
      if (submitBtn) submitBtn.textContent = "Guardar na lista";
      setActiveTab("nova");
      window.scrollTo(0, 0);
    });
  }

  if (tabRequisicoes) {
    tabRequisicoes.addEventListener("click", () => {
      setActiveTab("requisicoes");
      window.scrollTo(0, 0);
    });
  }

  const tbody = document.getElementById("requisicoesProfBody");
  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn || !btn.dataset || !btn.dataset.action) return;

      const action = btn.dataset.action;
      const id = Number(btn.dataset.id);
      if (!id) return;

      if (action === "edit") {
        const item = requisicoes.find((r) => Number(r.id) === id);
        if (!item) return;
        if (
          !["pendente", "listado"].includes(
            String(item.status || "pendente").toLowerCase().trim()
          )
        )
          return;
        preencherForm(item);
        if (submitBtn) submitBtn.textContent = "Guardar alterações";
        setActiveTab("nova");
        window.scrollTo(0, 0);
      }

      if (action === "delete_item") {
        const item = requisicoes.find((r) => Number(r.id) === id);
        if (!item) return;
        const ok = window.confirm("Tem a certeza que quer apagar este item da lista?");
        if (!ok) return;

        const email = getEmailAtual();
        const { error } = await supabaseClient
          .from("lista")
          .delete()
          .eq("id", id)
          .eq("prof_email", email);
        if (error) {
          console.error(error);
          mostrarToast(error.message || "Erro ao apagar item.", "error");
          return;
        }

        requisicoes = await carregarRequisicoes();
        renderizarTabela(requisicoes, equipNomeMap);
        mostrarToast("Item apagado da lista.", "success");
        resetForm();
        if (submitBtn) submitBtn.textContent = "Guardar na lista";
        setActiveTab("requisicoes");
      }
    });
  }

  const tempoRadios = document.querySelectorAll('input[name="reqTempoOpcao"]');
  tempoRadios.forEach((r) => {
    r.addEventListener("change", () => {
      toggleTempoOutroVisibility();
      syncDuracaoMinHidden();
    });
  });

  const duracaoOutroInput = document.getElementById("reqDuracaoMinOutro");
  if (duracaoOutroInput) {
    duracaoOutroInput.addEventListener("input", () => {
      syncDuracaoMinHidden();
    });
  }

  // garante que o hidden acompanha o estado inicial do formulário
  toggleTempoOutroVisibility();
  syncDuracaoMinHidden();

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (typeof supabaseClient === "undefined") return;

      const editingId = document.getElementById("reqEditingId")?.value;
      const email = getEmailAtual();
      const equipamento_id = document.getElementById("reqEquipamento")?.value;
      const quantidade = Number(document.getElementById("reqQuantidade")?.value);
      syncDuracaoMinHidden();
      const duracaoMin = Number(document.getElementById("reqDuracaoMin")?.value);
      const descricao = document.getElementById("reqDescricao")?.value || "";
      const formEl = document.getElementById("reqForm");
      const local_id = getLocalIdByEquipamentoId(
        equipamentos,
        localNomeToId,
        equipamento_id
      );

      // Impedir que o professor coloque mais do que existe (ex.: stock=3 → máximo 3).
      const eqIdNum = Number(equipamento_id);
      const eqSel = (equipamentos || []).find((e) => Number(e.id) === eqIdNum);
      const maxPermitido = getMaxQtyForEquipamento(eqSel);
      if (Number.isFinite(quantidade) && quantidade > maxPermitido) {
        mostrarToast(
          `Quantidade inválida. Máximo para "${eqSel?.nome || "equipamento"}": ${maxPermitido}.`,
          "error"
        );
        if (qtdEl) qtdEl.value = String(maxPermitido);
        aplicarLimiteQuantidade();
        return;
      }

      if (
        !email ||
        !equipamento_id ||
        !Number.isFinite(quantidade) ||
        quantidade <= 0 ||
        !Number.isFinite(duracaoMin) ||
        duracaoMin <= 0
      ) {
        mostrarToast("Preencha os campos obrigatórios.", "error");
        return;
      }

      let localIdFinal = local_id;
      if (!localIdFinal && editingId && formEl) {
        const prevLocalId = Number(formEl.dataset.editLocalId);
        if (Number.isFinite(prevLocalId) && prevLocalId > 0) {
          // Se o mapeamento por nome falhar (locais renomeados/alterados),
          // preservamos o local_id original do registo.
          localIdFinal = prevLocalId;
        }
      }

      if (!localIdFinal) {
        mostrarToast("Não foi possível determinar o local do equipamento.", "error");
        return;
      }

      try {
        if (editingId) {
          const { error } = await supabaseClient
            .from("lista")
            .update({
              equipamento_id: Number(equipamento_id),
              local_id: Number(localIdFinal),
              quantidade,
              descricao: buildDescricao(duracaoMin, descricao),
              pedido_em: new Date().toISOString(),
            })
            .eq("id", Number(editingId))
            .eq("prof_email", email)
            .in("status", ["pendente", "listado"]);
          if (error) throw error;
          mostrarToast("Item da lista editado.", "success");
        } else {
          const { error } = await supabaseClient.from("lista").insert([
            {
              equipamento_id: Number(equipamento_id),
              local_id: Number(localIdFinal),
              estado_id: null,
              quantidade,
              descricao: buildDescricao(duracaoMin, descricao),
              pedido_em: new Date().toISOString(),
              prof_email: email,
              prof_role: "professor",
              status: "listado",
              lido: false,
            },
          ]);
          if (error) throw error;
          mostrarToast("Equipamento adicionado à lista.", "success");
        }

        requisicoes = await carregarRequisicoes();
        renderizarTabela(requisicoes, equipNomeMap);
        resetForm();
        if (submitBtn) submitBtn.textContent = "Guardar na lista";
        setActiveTab("requisicoes");
      } catch (err) {
        console.error(err);
        const msg =
          typeof err?.message === "string" && err.message.trim()
            ? err.message
            : "Erro ao guardar item da lista.";
        mostrarToast(msg, "error");
      }
    });
  }
});

