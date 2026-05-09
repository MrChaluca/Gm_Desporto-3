// Inventário em memória + localStorage
const STORAGE_KEY = "gm_desporto_inventario";
const HISTORY_KEY = "gm_desporto_historico";
// Manutenção removida (mantemos o ficheiro compatível sem esta feature)
const MAINT_KEY = "gm_desporto_manutencao_qtd_por_id";

function carregarManutencaoMap() {
  try {
    const raw = localStorage.getItem(MAINT_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function guardarManutencaoMap(map) {
  localStorage.setItem(MAINT_KEY, JSON.stringify(map));
}

// Funções Supabase de manutenção removidas

function carregarInventario() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function carregarHistorico() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function guardarHistorico(lista) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(lista));
}

function guardarInventario(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

async function carregarEquipamentosSupabase() {
  if (typeof supabaseClient === "undefined") return null;

  const { data, error } = await supabaseClient
    .from("equipamentos")
    .select("*")
    .order("descricao");

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    nome: row.descricao,
    quantidade: Number(row.quantidade || 0),
    stock: Number(row.stock || 0),
    manutencaoQtd: 0,
    localizacao: row.local || "",
    marcaModelo: row.empresa_data || "",
    dataAquisicao: "", // not used
    observacoes: row.observacao || "",
    outrasObservacoes: row.outras_observacao || "",
    edfDe: row.edf_de || "EDF",
    estado: row.estado || "",
    estadoBom: row.estado_bom ?? null,
    estadoRazoavel: row.estado_razoavel ?? null,
    estadoMau: row.estado_mau ?? null,
    estadoAbate: row.estado_abate ?? null,
    status: "disponivel",
  }));
}

async function carregarLocaisSupabase() {
  if (typeof supabaseClient === "undefined") return [];

  const { data, error } = await supabaseClient
    .from("locais")
    .select("*")
    .order("nome");

  if (error) {
    console.error("Erro ao carregar locais:", error);
    return [];
  }

  return data || [];
}

async function inserirEquipamentoSupabase(dados) {
  const { data, error } = await supabaseClient
    .from("equipamentos")
    .insert([
      {
        edf_de: dados.edfDe,
        descricao: dados.nome,
        quantidade: dados.quantidade,
        stock: dados.stock,
        empresa_data: dados.empresaData || null,
        estado: null,
        estado_bom: dados.estadoBom,
        estado_razoavel: dados.estadoRazoavel,
        estado_mau: dados.estadoMau,
        estado_abate: dados.estadoAbate,
        local: dados.localizacao,
        observacao: dados.observacoes || null,
        outras_observacao: dados.outrasObservacoes || null,
      },
    ])
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

async function atualizarEquipamentoSupabase(id, dados) {
  const { error } = await supabaseClient
    .from("equipamentos")
    .update({
      edf_de: dados.edfDe,
      descricao: dados.nome,
      quantidade: dados.quantidade,
      stock: dados.stock,
      empresa_data: dados.empresaData || null,
      estado: null,
      estado_bom: dados.estadoBom,
      estado_razoavel: dados.estadoRazoavel,
      estado_mau: dados.estadoMau,
      estado_abate: dados.estadoAbate,
      local: dados.localizacao,
      observacao: dados.observacoes || null,
      outras_observacao: dados.outrasObservacoes || null,
    })
    .eq("id", id);

  if (error) throw error;
}

async function apagarEquipamentoSupabase(id) {
  const { error } = await supabaseClient.from("equipamentos").delete().eq("id", id);
  if (error) throw error;
}

function normalizarInventario(lista) {
  let alterado = false;
  const out = lista.map((item) => {
    const novo = { ...item };
    if (typeof novo.manutencaoQtd !== "number") {
      novo.manutencaoQtd = novo.estado === "manutencao" ? Number(novo.quantidade) : 0;
      alterado = true;
    }
    // Com manutenção parcial, mantemos o estado base como normal
    if (novo.estado !== "normal") {
      novo.estado = "normal";
      alterado = true;
    }
    if (novo.manutencaoQtd < 0) {
      novo.manutencaoQtd = 0;
      alterado = true;
    }
    if (novo.manutencaoQtd > Number(novo.quantidade)) {
      novo.manutencaoQtd = Number(novo.quantidade);
      alterado = true;
    }
    return novo;
  });

  return { out, alterado };
}

function disponivelQtd(item) {
  // Manutenção removida: disponível = total
  return Math.max(0, Number(item.quantidade || 0));
}

function atualizarDashboard(lista) {
  const total = lista.reduce((acc, e) => acc + Number(e.quantidade || 0), 0);
  const disponiveis = lista.reduce((acc, e) => acc + disponivelQtd(e), 0);

  document.getElementById("totalEquipamentos").textContent = total;
  document.getElementById("totalDisponiveis").textContent = disponiveis;
  const elMan = document.getElementById("totalManutencao");
  if (elMan) elMan.textContent = "0";
}



function mostrarMensagem(tipo, texto) {
  const msg = document.getElementById("formMessage");
  msg.textContent = texto;
  msg.className = "form-message " + tipo;
}

function limparErros() {
  document.querySelectorAll(".input-error").forEach((el) => (el.textContent = ""));
}

function parseQuantidadeForm(val) {
  if (val === undefined || val === null) return NaN;
  const t = String(val).trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function parseOptionalQuantidadeForm(val) {
  if (val === undefined || val === null || String(val).trim() === "") return null;
  const n = parseQuantidadeForm(val);
  return Number.isFinite(n) ? n : NaN;
}

function formatarEstadoResumo(item) {
  const partes = [];
  if (item.estadoBom !== null && item.estadoBom !== undefined) partes.push(`Bom: ${item.estadoBom}`);
  if (item.estadoRazoavel !== null && item.estadoRazoavel !== undefined) partes.push(`Razoável: ${item.estadoRazoavel}`);
  if (item.estadoMau !== null && item.estadoMau !== undefined) partes.push(`Mau: ${item.estadoMau}`);
  if (item.estadoAbate !== null && item.estadoAbate !== undefined) partes.push(`Abate: ${item.estadoAbate}`);
  if (partes.length) return partes.join(" | ");
  return item.estado || "-";
}

function mapEstadoLegado(item, nomeEstado) {
  if (!item.estado) return "-";
  return item.estado === nomeEstado ? item.quantidade : "-";
}

function validarFormulario(form) {
  limparErros();
  let valido = true;

  const camposObrigatorios = [
    "edfDe",
    "nomeEquipamento",
    "quantidade",
    "stock",
    "localizacao",
  ];

  camposObrigatorios.forEach((id) => {
    const input = form.elements[id];
    if (!input || !String(input.value).trim()) {
      const erro = document.querySelector(`[data-error-for="${id}"]`);
      if (erro) erro.textContent = "Campo obrigatório.";
      valido = false;
    }
  });

  const qRaw = form.elements["quantidade"]?.value;
  const q = parseQuantidadeForm(qRaw);
  if (qRaw === undefined || String(qRaw).trim() === "" || !Number.isFinite(q) || q < 0) {
    const erro = document.querySelector('[data-error-for="quantidade"]');
    if (erro) erro.textContent = "Informe um número válido (0 ou mais).";
    valido = false;
  }

  const sRaw = form.elements["stock"]?.value;
  const s = parseQuantidadeForm(sRaw);
  if (sRaw === undefined || String(sRaw).trim() === "" || !Number.isFinite(s) || s < 0) {
    const erro = document.querySelector('[data-error-for="stock"]');
    if (erro) erro.textContent = "Informe um número válido (0 ou mais).";
    valido = false;
  }

  const estados = [
    { key: "estadoBom", label: "Bom" },
    { key: "estadoRazoavel", label: "Razoável" },
    { key: "estadoMau", label: "Mau" },
    { key: "estadoAbate", label: "Abate" },
  ];
  let somaEstados = 0;
  for (const st of estados) {
    const raw = form.elements[st.key]?.value;
    const n = parseOptionalQuantidadeForm(raw);
    if (Number.isNaN(n) || (n !== null && n < 0)) {
      const erro = document.querySelector(`[data-error-for="${st.key}"]`);
      if (erro) erro.textContent = `Valor inválido para ${st.label}.`;
      valido = false;
      continue;
    }
    if (n !== null) somaEstados += n;
  }

  if (Number.isFinite(q) && somaEstados > q) {
    const erro = document.querySelector('[data-error-for="estadoBom"]');
    if (erro) erro.textContent = "Soma dos estados não pode ser maior que a quantidade.";
    valido = false;
  }

  return valido;
}

function configurarImagemPreview() {}

function mostrarToast(texto, tipo = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = texto;
  toast.className = "toast " + tipo + " show";

  if (mostrarToast._timeoutId) {
    clearTimeout(mostrarToast._timeoutId);
  }
  mostrarToast._timeoutId = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

document.addEventListener("DOMContentLoaded", async () => {
  window.GMApp?.wireRouteLinks();
  if (!window.GMApp?.hasAccess("admin")) {
    window.GMApp?.goTo("profReports");
    return;
  }
  const form = document.getElementById("equipForm");
  const btnNovo = document.getElementById("btnNovo");
  const btnInventario = document.getElementById("btnInventario");
  const btnMenuToggle = document.getElementById("btnMenuToggle");
  const mainMenu = document.getElementById("mainMenu");
  const sectionDashboard = document.getElementById("dashboard");
  const sectionCadastro = document.getElementById("cadastro");
  const sectionInventario = document.getElementById("inventario");
  const sectionHistorico = document.getElementById("historico");
  const sectionManutencao = null; // manutenção removida
  const menuLinks = document.querySelectorAll(".main-menu a[data-section]");
  const inventarioBody = document.getElementById("inventarioBody");
  const inventarioMessage = document.getElementById("inventarioMessage");
  const pesquisaInventario = document.getElementById("pesquisaInventario");
  const filtroLocalSelect = document.getElementById("filtroLocal");
  const historicoBody = document.getElementById("historicoBody");
  const pesquisaHistorico = document.getElementById("pesquisaHistorico");
  const manutencaoBody = null;
  const btnManutAdd = null;
  const btnManutRemove = null;
  const manutModal = null;
  const btnManutClose = null;
  const manutModalBody = null;
  const manutModalTitle = null;
  const manutModalSubtitle = null;
  const btnDashSolicitacoes = document.getElementById("btnDashSolicitacoes");
  const btnDashRelatos = document.getElementById("btnDashRelatos");
  const btnDashRequisicoes = document.getElementById("btnDashRequisicoes");
  const dashBadgeSolicitacoes = document.getElementById("dashBadgeSolicitacoes");
  const dashBadgeRelatos = document.getElementById("dashBadgeRelatos");
  const dashBadgeRequisicoes = document.getElementById("dashBadgeRequisicoes");
  const cadastroTitle = document.getElementById("cadastroTitle");
  const cadastroSubtitle = document.getElementById("cadastroSubtitle");

  let inventario = [];
  let categoriasMap = null;
  let historico = carregarHistorico();
  let filtroLocalAtual = "todos";
  let termoPesquisa = "";
  let termoPesquisaHistorico = "";
  let editingId = null;
  let modalMode = "both";

  function setDashBadge(badgeEl, count) {
    if (!badgeEl) return;
    const n = Number(count || 0);
    if (n > 0) {
      badgeEl.style.display = "inline-flex";
      badgeEl.textContent = String(n);
    } else {
      badgeEl.style.display = "none";
      badgeEl.textContent = "";
    }
  }

  async function contarSolicitacoesPendentes() {
    if (typeof supabaseClient === "undefined") return 0;
    const { count, error } = await supabaseClient
      .from("solicitacoes_registo")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return Number(count || 0);
  }

  async function contarRelatosNovosParaAdmin() {
    if (typeof supabaseClient === "undefined") return 0;
    const { count, error } = await supabaseClient
      .from("relatos")
      .select("id", { count: "exact", head: true })
      .eq("status", "nao_visto");
    if (error) throw error;
    return Number(count || 0);
  }

  async function contarListagemUsoNaoLida() {
    if (typeof supabaseClient === "undefined") return 0;
    const { count, error } = await supabaseClient
      .from("lista")
      .select("id", { count: "exact", head: true })
      .eq("lido", false);
    if (error) throw error;
    return Number(count || 0);
  }

  async function atualizarNotificacoesDashboard() {
    try {
      if (
        typeof supabaseClient === "undefined" ||
        !dashBadgeSolicitacoes ||
        !dashBadgeRelatos ||
        !dashBadgeRequisicoes
      )
        return;

      const [pendSol, pendRel, pendReq] = await Promise.all([
        contarSolicitacoesPendentes().catch(() => 0),
        contarRelatosNovosParaAdmin().catch(() => 0),
        contarListagemUsoNaoLida().catch(() => 0),
      ]);

      setDashBadge(dashBadgeSolicitacoes, pendSol);
      setDashBadge(dashBadgeRelatos, pendRel);
      setDashBadge(dashBadgeRequisicoes, pendReq);
    } catch (e) {
      console.warn("Falha ao atualizar badges do dashboard.", e);
    }
  }

  let dashPollingStarted = false;
  function iniciarPollingDashboard() {
    if (dashPollingStarted) return;
    dashPollingStarted = true;

    atualizarNotificacoesDashboard();
    setInterval(atualizarNotificacoesDashboard, 10000);
  }

  async function popularFiltroLocal() {
    if (!filtroLocalSelect) return;
    filtroLocalSelect.innerHTML = '<option value="todos">Todos os locais</option>';

    let locais = [];
    try {
      locais = await carregarLocaisSupabase();
    } catch (e) {
      locais = [];
    }

    const nomesLocais = locais
      .map((local) => local.nome)
      .filter((nome) => nome && nome.trim())
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();

    nomesLocais.forEach((nome) => {
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = nome;
      filtroLocalSelect.appendChild(option);
    });
  }

  async function refreshInventarioFromDb() {
    try {
      if (typeof supabaseClient !== "undefined") {
        const dbInv = await carregarEquipamentosSupabase();
        if (dbInv) inventario = dbInv;
      } else {
        inventario = carregarInventario();
        const { out, alterado } = normalizarInventario(inventario);
        inventario = out;
        if (alterado) guardarInventario(inventario);
      }

      atualizarDashboard(inventario);
      renderizarInventario(inventario, filtroLocalAtual, termoPesquisa);
      // manutenção removida
      atualizarNotificacoesDashboard();
    } catch (e) {
      console.error(e);
      const msg =
        typeof e?.message === "string" && e.message.trim()
          ? e.message
          : "Erro ao carregar dados da base de dados.";
      mostrarToast(msg, "error");
    }
  }

  if (filtroLocalSelect) {
    filtroLocalSelect.addEventListener("change", () => {
      filtroLocalAtual = filtroLocalSelect.value || "todos";
      renderizarInventario(inventario, filtroLocalAtual, termoPesquisa);
    });

    await popularFiltroLocal();
  }

  if (pesquisaInventario) {
    pesquisaInventario.addEventListener("input", () => {
      termoPesquisa = pesquisaInventario.value.trim();
      renderizarInventario(inventario, filtroLocalAtual, termoPesquisa);
    });
  }

  if (pesquisaHistorico) {
    pesquisaHistorico.addEventListener("input", () => {
      termoPesquisaHistorico = pesquisaHistorico.value.trim();
      renderizarHistorico(termoPesquisaHistorico);
    });
  }

  refreshInventarioFromDb();
  renderizarHistorico(termoPesquisaHistorico);
  iniciarPollingDashboard();

  window.GMApp?.setupMenuToggle("btnMenuToggle", "mainMenu");

  if (btnDashSolicitacoes) {
    btnDashSolicitacoes.addEventListener("click", () => {
      window.GMApp?.goTo("adminMembers", "#solicitacoes");
    });
  }
  if (btnDashRelatos) {
    btnDashRelatos.addEventListener("click", () => {
      window.GMApp?.goTo("adminReports");
    });
  }
  if (btnDashRequisicoes) {
    btnDashRequisicoes.addEventListener("click", () => {
      window.GMApp?.goTo("adminUsage");
    });
  }

  configurarImagemPreview();

  function setModoCadastro(modo) {
    if (!cadastroTitle) return;
    if (modo === "editar") {
      cadastroTitle.textContent = "Editar equipamento";
      if (cadastroSubtitle) {
        cadastroSubtitle.textContent =
          "Atualize os dados do equipamento selecionado.";
      }
    } else {
      cadastroTitle.textContent = "Adicionar equipamento";
      if (cadastroSubtitle) {
        cadastroSubtitle.textContent =
          "Preencha o formulário para registar novo material no inventário.";
      }
    }
  }

  setModoCadastro("adicionar");

  function renderizarInventario(lista, filtroLocal = 'todos', pesquisa = '') {
    if (!inventarioBody) return;
    inventarioBody.innerHTML = "";

    let listaFiltrada = lista;

    // Filtrar por local se não for 'todos'
    if (filtroLocal !== 'todos') {
      listaFiltrada = listaFiltrada.filter(item => item.localizacao === filtroLocal);
    }

    // Filtrar pelo termo de pesquisa
    const termo = String(pesquisa || "").trim().toLowerCase();
    if (termo) {
      listaFiltrada = listaFiltrada.filter((item) => {
        const edfDe = String(item.edfDe || "").toLowerCase();
        const nome = String(item.nome || "").toLowerCase();
        const localizacao = String(item.localizacao || "").toLowerCase();
        const observacoes = String(item.observacoes || "").toLowerCase();
        const outrasObservacoes = String(item.outrasObservacoes || "").toLowerCase();
        const marcaModelo = String(item.marcaModelo || "").toLowerCase();

        return (
          edfDe.includes(termo) ||
          nome.includes(termo) ||
          localizacao.includes(termo) ||
          observacoes.includes(termo) ||
          outrasObservacoes.includes(termo) ||
          marcaModelo.includes(termo)
        );
      });
    }

    if (!listaFiltrada.length) {
      const row = document.createElement("tr");
      row.className = "inventory-empty-row";
      const cell = document.createElement("td");
      cell.colSpan = 13;
      if (termo) {
        cell.textContent = `Nenhum equipamento corresponde à pesquisa "${pesquisa}"${filtroLocal !== 'todos' ? ` no local ${filtroLocal}` : ''}.`;
      } else {
        cell.textContent = filtroLocal === 'todos' 
          ? "Ainda não existem equipamentos registados." 
          : `Nenhum equipamento encontrado no local ${filtroLocal}.`;
      }
      row.appendChild(cell);
      inventarioBody.appendChild(row);
      return;
    }

    listaFiltrada.forEach((item) => {
      const disp = disponivelQtd(item);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.edfDe || "-"}</td>
        <td>${item.nome}</td>
        <td>${item.marcaModelo || ""}</td>
        <td>${item.quantidade}</td>
        <td>${disp}</td>
        <td>${item.estadoBom ?? mapEstadoLegado(item, "Bom")}</td>
        <td>${item.estadoRazoavel ?? mapEstadoLegado(item, "Razoável")}</td>
        <td>${item.estadoMau ?? mapEstadoLegado(item, "Mau")}</td>
        <td>${item.estadoAbate ?? mapEstadoLegado(item, "Abate")}</td>
        <td>${item.localizacao}</td>
        <td>${item.observacoes || "-"}</td>
        <td>${item.outrasObservacoes || "-"}</td>
        <td>
          <button
            type="button"
            class="inventory-btn-edit"
            data-action="edit"
            data-id="${item.id}"
          >
            Editar
          </button>
          <button
            type="button"
            class="inventory-btn-delete"
            data-action="delete"
            data-id="${item.id}"
          >
            Apagar
          </button>
        </td>
      `;
      inventarioBody.appendChild(row);
    });
  }

  function renderizarHistorico(pesquisa = "") {
    if (!historicoBody) return;
    historicoBody.innerHTML = "";

    let listaHistorico = historico.slice().sort((a, b) => {
      return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
    });

    const termo = String(pesquisa || "").trim().toLowerCase();
    if (termo) {
      listaHistorico = listaHistorico.filter((item) => {
        const nome = String(item.nome || "").toLowerCase();
        const acao = String(item.acao || "").toLowerCase();
        const detalhes = String(item.detalhes || "").toLowerCase();
        return nome.includes(termo) || acao.includes(termo) || detalhes.includes(termo);
      });
    }

    if (!listaHistorico.length) {
      const row = document.createElement("tr");
      row.className = "inventory-empty-row";
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent = termo
        ? `Nenhum registo corresponde à pesquisa "${pesquisa}".`
        : "Ainda não há registos de histórico.";
      row.appendChild(cell);
      historicoBody.appendChild(row);
      return;
    }

    listaHistorico.forEach((item) => {
      const row = document.createElement("tr");
      const data = new Date(item.dataHora);
      const dataTexto = Number.isFinite(data.getTime())
        ? data.toLocaleString("pt-PT")
        : item.dataHora || "-";

      row.innerHTML = `
        <td>${dataTexto}</td>
        <td>${item.nome || "-"}</td>
        <td>${item.acao || "-"}</td>
        <td>${item.detalhes || "-"}</td>
      `;
      historicoBody.appendChild(row);
    });
  }

  // manutenção removida

  function mostrarSecao(sec) {
    if (sectionDashboard) {
      sectionDashboard.style.display = sec === "dashboard" ? "" : "none";
    }
    if (sectionCadastro) {
      sectionCadastro.style.display = sec === "cadastro" ? "" : "none";
    }
    if (sectionInventario) {
      sectionInventario.style.display = sec === "inventario" ? "" : "none";
    }
    if (sectionHistorico) {
      sectionHistorico.style.display = sec === "historico" ? "" : "none";
      if (sec === "historico") {
        renderizarHistorico(termoPesquisaHistorico);
      }
    }
    // manutenção removida
  }

  function mostrarPorHash() {
    const hash = (window.location.hash || "").replace("#", "");
    if (hash === "dashboard" || hash === "cadastro" || hash === "inventario" || hash === "historico") {
      mostrarSecao(hash);
      return true;
    }
    return false;
  }

  // Mostrar secção baseada no #hash (ex.: principal.html#inventario)
  if (!mostrarPorHash()) {
    mostrarSecao("dashboard");
  }

  window.addEventListener("hashchange", () => {
    mostrarPorHash();
  });

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validarFormulario(form)) {
        mostrarMensagem("error", "Verifique os campos obrigatórios.");
        return;
      }

      const qtdNum = parseQuantidadeForm(form.quantidade.value);
      const dados = {
        id: editingId !== null ? editingId : Date.now(),
        nome: form.nomeEquipamento.value.trim(),
        quantidade: qtdNum,
        localizacao: form.localizacao.value.trim(),
        empresaData: form.empresaData.value.trim(),
        observacoes: form.observacoes.value.trim(),
        edfDe: form.edfDe.value,
        stock: parseInt(form.stock.value) || 0,
        estadoBom: parseOptionalQuantidadeForm(form.estadoBom.value),
        estadoRazoavel: parseOptionalQuantidadeForm(form.estadoRazoavel.value),
        estadoMau: parseOptionalQuantidadeForm(form.estadoMau.value),
        estadoAbate: parseOptionalQuantidadeForm(form.estadoAbate.value),
        estado: "",
        outrasObservacoes: form.outrasObservacoes.value.trim(),
        status: "disponivel",
      };

      const eraEdicao = editingId !== null;

      (async () => {
        try {
          if (typeof supabaseClient !== "undefined") {
            if (eraEdicao) {
              await atualizarEquipamentoSupabase(editingId, dados);
            } else {
              await inserirEquipamentoSupabase(dados);
              historico.push({
                id: Date.now(),
                nome: dados.nome,
                acao: "adicionado",
                dataHora: new Date().toISOString(),
              });
              guardarHistorico(historico);
            }
            editingId = null;
            await refreshInventarioFromDb();
            renderizarHistorico(termoPesquisaHistorico);
          } else {
            // fallback localStorage
            if (eraEdicao) {
              const idx = inventario.findIndex((item) => item.id === editingId);
              if (idx !== -1) {
                const antes = inventario[idx];
                dados.manutencaoQtd = Math.min(
                  Number(antes.manutencaoQtd || 0),
                  Number(dados.quantidade)
                );
                inventario[idx] = dados;
              }
              editingId = null;
            } else {
              const existenteIndex = inventario.findIndex(
                (item) =>
                  item.nome.toLowerCase() === dados.nome.toLowerCase()
              );

              if (existenteIndex !== -1) {
                inventario[existenteIndex].quantidade += dados.quantidade;
                inventario[existenteIndex].localizacao = dados.localizacao;
                inventario[existenteIndex].marcaModelo = dados.marcaModelo;
                inventario[existenteIndex].dataAquisicao = dados.dataAquisicao;
                inventario[existenteIndex].observacoes = dados.observacoes;
              } else {
                inventario.push(dados);
              }

              historico.push({
                id: Date.now(),
                nome: dados.nome,
                acao: "adicionado",
                dataHora: new Date().toISOString(),
              });
            }

            guardarInventario(inventario);
            guardarHistorico(historico);
            atualizarDashboard(inventario);
            renderizarInventario(inventario);
            renderizarHistorico(termoPesquisaHistorico);
          }
          
          form.reset();
          limparErros();

          mostrarSecao("inventario");
          if (inventarioMessage) {
            inventarioMessage.textContent = "";
          }
          if (eraEdicao) {
            mostrarToast("Equipamento editado com sucesso", "success");
          } else {
            mostrarToast("Equipamento adicinado com sucesso", "success");
          }
        } catch (e) {
          console.error(e);
          mostrarToast("Não foi possível guardar. Tente novamente.", "error");
        }
      })();
    });
  }

  if (btnNovo) {
    btnNovo.addEventListener("click", () => {
      if (!form) return;
      form.reset();
      limparErros();
      mostrarMensagem("success", "");
      editingId = null;
      setModoCadastro("adicionar");
    });
  }

  if (menuLinks.length > 0) {
    menuLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const sec = link.dataset.section;
        if (!sec) return;
        if (sec === "dashboard" || sec === "cadastro" || sec === "inventario" || sec === "historico") {
          e.preventDefault();
          if (sec === "cadastro" && form) {
            form.reset();
            limparErros();
            editingId = null;
            setModoCadastro("adicionar");
          }
          mostrarSecao(sec);
        }
      });
    });
  }

  if (btnInventario) {
    btnInventario.addEventListener("click", () => {
      mostrarSecao("inventario");
    });
  }

  if (inventarioBody) {
    inventarioBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || !target.dataset) return;
      const action = target.dataset.action;
      const id = Number(target.dataset.id);
      if (!action || !id) return;

      const idx = inventario.findIndex((item) => item.id === id);
      if (idx === -1) return;

      if (action === "delete") {
        const item = inventario[idx];
        (async () => {
          try {
            if (typeof supabaseClient !== "undefined") {
              await apagarEquipamentoSupabase(id);
              historico.push({
                id: Date.now(),
                nome: item.nome,
                acao: "apagado",
                dataHora: new Date().toISOString(),
                detalhes: item.localizacao ? `Local: ${item.localizacao}` : "",
              });
              guardarHistorico(historico);
              await refreshInventarioFromDb();
              renderizarHistorico(termoPesquisaHistorico);
            } else {
              inventario.splice(idx, 1);
              guardarInventario(inventario);
              historico.push({
                id: Date.now(),
                nome: item.nome,
                acao: "apagado",
                dataHora: new Date().toISOString(),
                detalhes: item.localizacao ? `Local: ${item.localizacao}` : "",
              });
              guardarHistorico(historico);
              atualizarDashboard(inventario);
              renderizarInventario(inventario);
              renderizarHistorico(termoPesquisaHistorico);
            }
            mostrarToast("Equipamento apagado.", "success");
          } catch (e) {
            console.error(e);
            mostrarToast("Erro ao apagar na base de dados.", "error");
          }
        })();
      } else if (action === "edit" && form) {
        const item = inventario[idx];
        editingId = item.id;
        form.edfDe.value = item.edfDe || "EDF";
        form.nomeEquipamento.value = item.nome;
        form.quantidade.value = item.quantidade;
        form.stock.value = item.stock || item.quantidade;
        form.localizacao.value = item.localizacao;
        form.estadoBom.value = item.estadoBom ?? "";
        form.estadoRazoavel.value = item.estadoRazoavel ?? "";
        form.estadoMau.value = item.estadoMau ?? "";
        form.estadoAbate.value = item.estadoAbate ?? "";
        form.empresaData.value = item.marcaModelo || "";
        form.observacoes.value = item.observacoes || "";
        form.outrasObservacoes.value = item.outrasObservacoes || "";
        limparErros();
        mostrarSecao("cadastro");
        setModoCadastro("editar");
      }
    });
  }



  // listeners de manutenção removidos
});

