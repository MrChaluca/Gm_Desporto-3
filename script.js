// Inventário em memória + localStorage
const STORAGE_KEY = "gm_desporto_inventario";
const HISTORY_KEY = "gm_desporto_historico";

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
  sincronizarHistoricoSupabase(lista);
}

async function sincronizarHistoricoSupabase(lista) {
  if (typeof supabaseClient === "undefined" || !Array.isArray(lista) || !lista.length) return;
  const rows = lista.map((item) => ({
    client_id: String(item.client_id || item.id || `${item.dataHora || Date.now()}-${item.nome || ""}-${item.acao || ""}`),
    nome_item: item.nome_item || item.nome || "Admin",
    acao: item.acao || "ação",
    detalhes: item.detalhes || "",
    admin_email: item.admin_email || item.adminEmail || window.GMApp?.getCurrentEmail?.() || null,
    data_hora: item.data_hora || item.dataHora || new Date().toISOString(),
  }));

  try {
    const { error } = await supabaseClient
      .from("historico_acoes")
      .upsert(rows, { onConflict: "client_id" });
    if (error) console.warn("Histórico na BD indisponível.", error);
  } catch (e) {
    console.warn("Não foi possível sincronizar histórico com a BD.", e);
  }
}

async function carregarHistoricoSupabase() {
  if (typeof supabaseClient === "undefined") return null;
  try {
    const { data, error } = await supabaseClient
      .from("historico_acoes")
      .select("id,client_id,nome_item,acao,detalhes,admin_email,data_hora")
      .order("data_hora", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.client_id || row.id,
      nome: row.nome_item,
      nome_item: row.nome_item,
      acao: row.acao,
      detalhes: row.detalhes || "",
      adminEmail: row.admin_email || "",
      admin_email: row.admin_email || "",
      dataHora: row.data_hora,
    }));
  } catch (e) {
    console.warn("Histórico na BD indisponível. A usar histórico local.", e);
    return null;
  }
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
    escola: row.escola || "GM",
    nome: row.descricao,
    quantidade: Number(row.quantidade || 0),
    stock: Number(row.stock || 0),
    localizacao: row.local || "",
    marcaModelo: row.empresa_data || "",
    dataAquisicao: "", // not used
    observacoes: row.observacao || "",
    outrasObservacoes: row.outras_observacao || "",
    edfDe: row.edf_de || "EDF",
    estado: "",
    estadoBom: row.estado_bom ?? null,
    estadoRazoavel: row.estado_razoavel ?? null,
    estadoMau: row.estado_mau ?? null,
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
        estado_bom: dados.estadoBom || null,
        estado_razoavel: dados.estadoRazoavel || null,
        estado_mau: dados.estadoMau || null,
        estado_abate: dados.estadoAbate || null,
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
      estado_bom: dados.estadoBom || null,
      estado_razoavel: dados.estadoRazoavel || null,
      estado_mau: dados.estadoMau || null,
      estado_abate: dados.estadoAbate || null,
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
    if (novo.estado !== "normal") {
      novo.estado = "normal";
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
  const abates = lista.reduce((acc, e) => acc + Number(e.estadoAbate || 0), 0);

  document.getElementById("totalEquipamentos").textContent = total;
  
  const elAbates = document.getElementById("totalAbates");
  if (elAbates) elAbates.textContent = abates;
}

async function atualizarTotalAbatesDashboard() {
  const elAbates = document.getElementById("totalAbates");
  if (!elAbates || typeof supabaseClient === "undefined") return;

  try {
    const { count, error } = await supabaseClient
      .from("abates")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    elAbates.textContent = String(count || 0);
  } catch (e) {
    console.warn("Não foi possível carregar o total de abates.", e);
  }
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

  const limiteEstados = (Number.isFinite(q) ? q : 0) + (Number.isFinite(s) ? s : 0);
  if (somaEstados > limiteEstados) {
    const erro = document.querySelector('[data-error-for="estadoBom"]');
    if (erro) erro.textContent = "Soma dos estados não pode ser maior que quantidade + stock.";
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
  if (!window.GMApp?.redirectUnlessRole("admin")) return;
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
  const filtroEscolaSelect = document.getElementById("filtroEscola");
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
  let filtroEscolaAtual = "todos";
  let termoPesquisa = "";
  let termoPesquisaHistorico = "";
  let editingId = null;
  let modalMode = "both";

  // Paginação
  let currentPage = 1;
  const itemsPerPage = 10;

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

  function popularFiltroEscolas(lista = []) {
    if (!filtroEscolaSelect) return;
    filtroEscolaSelect.innerHTML = '<option value="todos">Todas as escolas</option>';

    const nomesEscolas = lista
      .map((item) => String(item.escola || "").trim())
      .filter((nome) => nome)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));

    nomesEscolas.forEach((nome) => {
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = nome;
      filtroEscolaSelect.appendChild(option);
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
      await atualizarTotalAbatesDashboard();
      popularFiltroEscolas(inventario);
      renderizarInventario(inventario, filtroLocalAtual, termoPesquisa, filtroEscolaAtual);
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
      currentPage = 1; // Reset para a primeira página ao filtrar
      renderizarInventario(inventario, filtroLocalAtual, termoPesquisa, filtroEscolaAtual);
    });

    await popularFiltroLocal();
  }

  if (filtroEscolaSelect) {
    filtroEscolaSelect.addEventListener("change", () => {
      filtroEscolaAtual = filtroEscolaSelect.value || "todos";
      currentPage = 1; // Reset para a primeira página ao filtrar
      renderizarInventario(inventario, filtroLocalAtual, termoPesquisa, filtroEscolaAtual);
    });
  }

  if (pesquisaInventario) {
    pesquisaInventario.addEventListener("input", () => {
      termoPesquisa = pesquisaInventario.value.trim();
      currentPage = 1; // Reset para a primeira página ao pesquisar
      renderizarInventario(inventario, filtroLocalAtual, termoPesquisa, filtroEscolaAtual);
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
  atualizarTotalAbatesDashboard();
  (async () => {
    const historicoDb = await carregarHistoricoSupabase();
    if (historicoDb) {
      historico = historicoDb;
      guardarHistorico(historico);
      renderizarHistorico(termoPesquisaHistorico);
    }
  })();
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

  function renderizarInventario(lista, filtroLocal = 'todos', pesquisa = '', filtroEscola = 'todos') {
    if (!inventarioBody) return;
    inventarioBody.innerHTML = "";

    let listaFiltrada = lista;

    // Filtrar por local se não for 'todos'
    if (filtroLocal !== 'todos') {
      listaFiltrada = listaFiltrada.filter(item => item.localizacao === filtroLocal);
    }

    // Filtrar por escola se não for 'todos'
    if (filtroEscola !== 'todos') {
      listaFiltrada = listaFiltrada.filter(item => String(item.escola || '').trim() === filtroEscola);
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
        const escola = String(item.escola || "").toLowerCase();

        return (
          edfDe.includes(termo) ||
          nome.includes(termo) ||
          localizacao.includes(termo) ||
          observacoes.includes(termo) ||
          outrasObservacoes.includes(termo) ||
          marcaModelo.includes(termo) ||
          escola.includes(termo)
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
      renderPaginationControls(0);
      return;
    }

    // Paginação
    const totalItems = listaFiltrada.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const itemsToShow = listaFiltrada.slice(startIndex, startIndex + itemsPerPage);

    itemsToShow.forEach((item) => {
      const disp = disponivelQtd(item);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="Escola">${item.escola || "GM"}</td>
        <td data-label="EDF/DE">${item.edfDe || "-"}</td>
        <td data-label="Descrição">${item.nome}</td>
        <td data-label="Quantidade">${item.quantidade}</td>
        <td data-label="Stock">${disp}</td>
        <td data-label="Empresa / Data">${item.marcaModelo || ""}</td>
        <td data-label="Bom">${item.estadoBom ?? mapEstadoLegado(item, "Bom")}</td>
        <td data-label="Razoável">${item.estadoRazoavel ?? mapEstadoLegado(item, "Razoável")}</td>
        <td data-label="Mau">${item.estadoMau ?? mapEstadoLegado(item, "Mau")}</td>
        <td data-label="Localização">${item.localizacao}</td>
        <td data-label="Observação">${item.observacoes || "-"}</td>
        <td data-label="Outras observações">${item.outrasObservacoes || "-"}</td>
        <td data-label="Ações">
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

    renderPaginationControls(totalItems);
  }

  function goToPage(page, totalPages) {
    let nextPage = Number(page);
    if (!Number.isFinite(nextPage)) return;
    if (nextPage < 1) nextPage = 1;
    if (nextPage > totalPages) nextPage = totalPages;
    if (nextPage === currentPage) return;
    currentPage = nextPage;
    renderizarInventario(inventario, filtroLocalAtual, termoPesquisa);
    document.getElementById("inventario").scrollIntoView({ behavior: "smooth" });
  }

  function renderPaginationControls(totalItems) {
    const container = document.getElementById("paginationControls");
    if (!container) return;
    container.innerHTML = "";

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const btnPrev = document.createElement("button");
    btnPrev.className = "pagination-btn";
    btnPrev.textContent = "Anterior";
    btnPrev.disabled = currentPage === 1;
    btnPrev.onclick = () => goToPage(currentPage - 1, totalPages);
    container.appendChild(btnPrev);

    const info = document.createElement("span");
    info.className = "pagination-info";
    info.textContent = `Página ${currentPage} de ${totalPages}`;
    container.appendChild(info);

    const jumpWrapper = document.createElement("span");
    jumpWrapper.className = "pagination-jump";

    const pageInput = document.createElement("input");
    pageInput.type = "number";
    pageInput.min = "1";
    pageInput.max = String(totalPages);
    pageInput.value = String(currentPage);
    pageInput.className = "pagination-input";
    pageInput.title = "Ir para página";
    pageInput.setAttribute("aria-label", "Número da página");

    const btnGo = document.createElement("button");
    btnGo.type = "button";
    btnGo.className = "pagination-btn";
    btnGo.textContent = "Ir";
    btnGo.onclick = () => goToPage(pageInput.value, totalPages);

    jumpWrapper.appendChild(pageInput);
    jumpWrapper.appendChild(btnGo);
    container.appendChild(jumpWrapper);

    const btnNext = document.createElement("button");
    btnNext.className = "pagination-btn";
    btnNext.textContent = "Próxima";
    btnNext.disabled = currentPage === totalPages;
    btnNext.onclick = () => goToPage(currentPage + 1, totalPages);
    container.appendChild(btnNext);
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
    console.log("[GM Desporto] A tentar mostrar secção:", sec);
    
    // Tenta obter as referências novamente se necessário
    const sDash = sectionDashboard || document.getElementById("dashboard");
    const sCad = sectionCadastro || document.getElementById("cadastro");
    const sInv = sectionInventario || document.getElementById("inventario");
    const sHist = sectionHistorico || document.getElementById("historico");

    const sections = {
      dashboard: sDash,
      cadastro: sCad,
      inventario: sInv,
      historico: sHist
    };

    Object.keys(sections).forEach((key) => {
      const el = sections[key];
      if (el) {
        el.style.setProperty("display", key === sec ? "block" : "none", "important");
      }
    });

    if (sec === "historico") {
      renderizarHistorico(termoPesquisaHistorico);
    }

    // Fechar menu ao mudar de secção no telemóvel
    if (mainMenu && !mainMenu.classList.contains("hidden")) {
      mainMenu.classList.add("hidden");
    }
    const toggleBtn = document.getElementById("btnMenuToggle");
    if (toggleBtn) {
      toggleBtn.classList.remove("is-menu-open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  }

  function syncPrincipalFromHash() {
    const raw = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
    const allowed = ["dashboard", "cadastro", "inventario", "historico"];
    const sec = allowed.includes(raw) ? raw : "dashboard";
    mostrarSecao(sec);
    window.GMApp?.markActiveLink?.();
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validarFormulario(form)) {
        mostrarMensagem("error", "Verifique os campos assinalados.");
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
              historico.push({
                id: Date.now(),
                nome: dados.nome,
                acao: "equipamento editado",
                detalhes: `Qtd: ${dados.quantidade} | Stock: ${dados.stock} | Local: ${dados.localizacao}`,
                dataHora: new Date().toISOString(),
              });
              guardarHistorico(historico);
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
          if (window.location.hash !== "#inventario") {
            window.location.hash = "inventario";
          }
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

        if (["dashboard", "cadastro", "inventario", "historico"].includes(sec)) {
          e.preventDefault();
          mostrarSecao(sec);
          const next = `#${sec}`;
          if (window.location.hash !== next) {
            window.location.hash = sec;
          } else {
            window.GMApp?.markActiveLink?.();
          }
        }
      });
    });
  }

  if (btnInventario) {
    btnInventario.addEventListener("click", () => {
      mostrarSecao("inventario");
      if (window.location.hash !== "#inventario") {
        window.location.hash = "inventario";
      }
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
        form.empresaData.value = item.marcaModelo || "";
        form.observacoes.value = item.observacoes || "";
        form.outrasObservacoes.value = item.outrasObservacoes || "";
        limparErros();
        mostrarSecao("cadastro");
        if (window.location.hash !== "#cadastro") {
          window.location.hash = "cadastro";
        }
        setModoCadastro("editar");
      }
    });
  }



  // listeners de manutenção removidos

  window.addEventListener("hashchange", () => {
    syncPrincipalFromHash();
  });
  syncPrincipalFromHash();
  requestAnimationFrame(() => {
    syncPrincipalFromHash();
    requestAnimationFrame(syncPrincipalFromHash);
  });
  window.addEventListener("load", syncPrincipalFromHash);
  window.addEventListener("pageshow", syncPrincipalFromHash);
});
