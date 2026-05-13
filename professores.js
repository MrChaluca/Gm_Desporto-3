const STORAGE_KEY = "gm_desporto_inventario";
const HISTORY_KEY = "gm_desporto_historico";
const MAINT_KEY = "gm_desporto_manutencao_qtd_por_id";

function carregarJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function guardarJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

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

async function carregarManutencaoSupabaseMap() {
  // Tabela 'manutencao' nao existe no schema da BD.
  // Retorna mapa vazio para nao quebrar o carregamento do inventario.
  return {};
}

function disponivelQtd(item) {
  const stock = Number(item.stock);
  if (Number.isFinite(stock)) return Math.max(0, stock);
  return Math.max(0, Number(item.quantidade || 0));
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

document.addEventListener("DOMContentLoaded", () => {
  window.GMApp?.wireRouteLinks();
  const currentUserEmail = (
    localStorage.getItem("gm_desporto_user_email") || ""
  ).toLowerCase();
  if (!window.GMApp?.redirectUnlessRole("professor")) return;

  let inventario = carregarJSON(STORAGE_KEY);
  let historico = carregarJSON(HISTORY_KEY);

  const inventarioProfBody = document.getElementById("inventarioProfBody");
  const manutencaoProfBody = document.getElementById("manutencaoProfBody");
  const relatadosProfBody = document.getElementById("relatadosProfBody");
  const relatarForm = document.getElementById("relatarForm");
  const relatarPesquisa = document.getElementById("relatarPesquisa");
  const relatarEquipamento = document.getElementById("relatarEquipamento");
  const relatarAutocomplete = document.getElementById("relatarAutocomplete");
  const relatarQuantidade = document.getElementById("relatarQuantidade");
  const relatarTipo = document.getElementById("relatarTipo");
  const relatarDescricao = document.getElementById("relatarDescricao");
  const relatarMessage = document.getElementById("relatarMessage");
  const relatarLimpar = document.getElementById("relatarLimpar");
  const btnMenuToggleProf = document.getElementById("btnMenuToggleProf");
  const mainMenuProf = document.getElementById("mainMenuProf");

  if (relatarMessage) {
    relatarMessage.textContent = "";
    relatarMessage.className = "form-message";
  }

  function limparErros() {
    document
      .querySelectorAll(".input-error")
      .forEach((el) => (el.textContent = ""));
  }

  function renderizarInventarioProf() {
    if (!inventarioProfBody) return;
    inventarioProfBody.innerHTML = "";

    if (!inventario.length) {
      const row = document.createElement("tr");
      row.className = "inventory-empty-row";
      const cell = document.createElement("td");
      cell.colSpan = 12;
      cell.textContent = "Ainda não existem equipamentos registados.";
      row.appendChild(cell);
      inventarioProfBody.appendChild(row);
      return;
    }

    inventario.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="Categoria">${item.categoria || "-"}</td>
        <td data-label="Nome">${item.nome || "-"}</td>
        <td data-label="Quantidade">${item.quantidade}</td>
        <td data-label="Disponível">${disponivelQtd(item)}</td>
        <td data-label="Marca/Modelo">${item.marcaModelo || "-"}</td>
        <td data-label="Bom">${item.estadoBom ?? mapEstadoLegado(item, "Bom")}</td>
        <td data-label="Razoável">${item.estadoRazoavel ?? mapEstadoLegado(item, "Razoável")}</td>
        <td data-label="Mau">${item.estadoMau ?? mapEstadoLegado(item, "Mau")}</td>
        <td data-label="Abate">${item.estadoAbate ?? mapEstadoLegado(item, "Abate")}</td>
        <td data-label="Localização">${item.localizacao || "-"}</td>
        <td data-label="Observações">${item.observacoes || "-"}</td>
        <td data-label="Outras Obs.">${item.outrasObservacoes || "-"}</td>
      `;
      inventarioProfBody.appendChild(row);
    });
  }

  function renderizarManutencaoProf() {
    if (!manutencaoProfBody) return;
    manutencaoProfBody.innerHTML = "";
    
    // Funcionalidade de manutenção foi removida
    const row = document.createElement("tr");
    row.className = "inventory-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "A funcionalidade de manutenção foi descontinuada.";
    row.appendChild(cell);
    manutencaoProfBody.appendChild(row);
  }

  function renderizarRelatadosProfLocal() {
    if (!relatadosProfBody) return;
    relatadosProfBody.innerHTML = "";

    const labelTipo = (v) => {
      const map = {
        danificado: "Danificado",
        desaparecido: "Desaparecido",
        outro: "Outro",
      };
      return map[v] || v;
    };

    const relatos = historico
      .filter(
        (h) =>
          h &&
          typeof h.acao === "string" &&
          h.acao.startsWith("RELATO PROFESSOR")
      )
      .sort(
        (a, b) =>
          new Date(b.dataHora || 0).getTime() -
          new Date(a.dataHora || 0).getTime()
      );

    if (!relatos.length) {
      const row = document.createElement("tr");
      row.className = "inventory-empty-row";
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = "Ainda não existem relatórios enviados por si.";
      row.appendChild(cell);
      relatadosProfBody.appendChild(row);
      return;
    }

    relatos.forEach((item) => {
      const row = document.createElement("tr");
      const m = (item.acao || "").match(
        /RELATO PROFESSOR:\s*([^\s(]+)\s*\(x(\d+)\)/
      );
      const tipoRaw = m ? m[1] : "";
      const qtdStr = m ? m[2] : "—";

      const tdData = document.createElement("td");
      tdData.textContent = item.dataHora
        ? new Date(item.dataHora).toLocaleString("pt-PT")
        : "—";

      const tdNome = document.createElement("td");
      tdNome.textContent = item.nome || "—";

      const tdTipo = document.createElement("td");
      tdTipo.textContent = tipoRaw ? labelTipo(tipoRaw) : "—";

      const tdQtd = document.createElement("td");
      tdQtd.textContent = qtdStr;

      const tdDesc = document.createElement("td");
      tdDesc.textContent = (item.descricao || "").trim() || "—";
      const tdAcao = document.createElement("td");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "inventory-btn-delete";
      btn.dataset.action = "remove-relato-local";
      btn.dataset.id = String(item.id);
      btn.textContent = "Remover";
      tdAcao.appendChild(btn);

      row.appendChild(tdData);
      row.appendChild(tdNome);
      row.appendChild(tdTipo);
      row.appendChild(tdQtd);
      row.appendChild(tdDesc);
      row.appendChild(tdAcao);
      relatadosProfBody.appendChild(row);
    });
  }

  async function renderizarRelatadosProfSupabase() {
    if (!relatadosProfBody) return;
    if (typeof supabaseClient === "undefined" || !currentUserEmail) {
      renderizarRelatadosProfLocal();
      return;
    }

    relatadosProfBody.innerHTML = "";
    const { data, error } = await supabaseClient
      .from("relatos")
      .select(
        "id,nome_equipamento,tipo_ocorrencia,quantidade,descricao,data_hora,created_at,prof_email,status"
      )
      .eq("prof_role", "professor")
      .or(`prof_email.eq.${currentUserEmail},prof_email.is.null`)
      .order("data_hora", { ascending: false });

    if (error) {
      console.error(error);
      renderizarRelatadosProfLocal();
      return;
    }

    if (!data || !data.length) {
      const row = document.createElement("tr");
      row.className = "inventory-empty-row";
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.textContent = "Ainda não existem relatórios enviados por si.";
      row.appendChild(cell);
      relatadosProfBody.appendChild(row);
      return;
    }

    const labelTipo = (v) => {
      const map = {
        danificado: "Danificado",
        desaparecido: "Desaparecido",
        outro: "Outro",
      };
      return map[v] || v || "—";
    };

    data.forEach((item) => {
      const row = document.createElement("tr");
      const tdData = document.createElement("td");
      tdData.textContent = item.data_hora
        ? new Date(item.data_hora).toLocaleString("pt-PT")
        : item.created_at
          ? new Date(item.created_at).toLocaleString("pt-PT")
          : "—";

      const tdNome = document.createElement("td");
      tdNome.textContent = item.nome_equipamento || "—";

      const tdTipo = document.createElement("td");
      tdTipo.textContent = labelTipo(item.tipo_ocorrencia);

      const tdQtd = document.createElement("td");
      tdQtd.textContent = String(item.quantidade ?? "—");

      const tdDesc = document.createElement("td");
      tdDesc.textContent = (item.descricao || "").trim() || "—";

      const tdAcao = document.createElement("td");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "inventory-btn-delete";
      btn.dataset.action = "remove-relato-prof";
      btn.dataset.id = String(item.id);
      btn.textContent = "Remover";
      tdAcao.appendChild(btn);

      tdData.dataset.label = "Data e hora";
      tdNome.dataset.label = "Equipamento";
      tdTipo.dataset.label = "Tipo";
      tdQtd.dataset.label = "Qtd.";
      tdDesc.dataset.label = "Descrição";
      tdAcao.dataset.label = "Ações";

      row.appendChild(tdData);
      row.appendChild(tdNome);
      row.appendChild(tdTipo);
      row.appendChild(tdQtd);
      row.appendChild(tdDesc);
      row.appendChild(tdAcao);
      relatadosProfBody.appendChild(row);
    });
  }

  function preencherSelectEquipamentos() {
    if (!relatarPesquisa || !relatarAutocomplete) return;
    
    function renderizarAutocomplete(termo = "") {
      relatarAutocomplete.innerHTML = "";
      
      if (!inventario.length) {
        relatarAutocomplete.innerHTML = '<div class="autocomplete-item" style="color:#666;">A carregar...</div>';
        relatarAutocomplete.classList.remove("hidden");
        return;
      }

      const termoBaixo = termo.toLowerCase().trim();
      let filtrados = inventario;

      if (termoBaixo) {
        filtrados = inventario.filter(eq => {
          const texto = `${eq.nome || ""} (${eq.categoria || ''})`.toLowerCase();
          return texto.includes(termoBaixo);
        });
      }

      if (filtrados.length === 0) {
        relatarAutocomplete.innerHTML = '<div class="autocomplete-item" style="color:#666;">Nenhum equipamento encontrado.</div>';
        relatarAutocomplete.classList.remove("hidden");
        return;
      }

      filtrados.slice(0, 50).forEach(eq => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.textContent = `${eq.categoria ? eq.categoria + ' - ' : ''}${eq.nome} (Stock: ${disponivelQtd(eq)})`;
        div.addEventListener("click", () => {
          relatarPesquisa.value = div.textContent;
          relatarPesquisa.style.color = "#8b0000";
          relatarPesquisa.style.fontWeight = "600";
          relatarEquipamento.value = eq.id;
          if (relatarQuantidade) {
            relatarQuantidade.max = String(disponivelQtd(eq));
            relatarQuantidade.placeholder = `Máx.: ${disponivelQtd(eq)}`;
          }
          relatarAutocomplete.classList.add("hidden");
        });
        relatarAutocomplete.appendChild(div);
      });

      relatarAutocomplete.classList.remove("hidden");
    }

    relatarPesquisa.addEventListener("input", (e) => {
      relatarPesquisa.style.color = "";
      relatarPesquisa.style.fontWeight = "";
      relatarEquipamento.value = ""; // Limpa a seleção
      renderizarAutocomplete(e.target.value);
    });

    relatarPesquisa.addEventListener("focus", () => {
      renderizarAutocomplete(relatarPesquisa.value);
    });

    document.addEventListener("click", (e) => {
      if (!relatarPesquisa.contains(e.target) && !relatarAutocomplete.contains(e.target)) {
        relatarAutocomplete.classList.add("hidden");
      }
    });
  }

  function validarRelatar() {
    limparErros();
    let valido = true;

    if (!relatarEquipamento.value) {
      const err = document.querySelector(
        '[data-error-for="relatarEquipamento"]'
      );
      if (err) err.textContent = "Selecione um equipamento.";
      valido = false;
    }

    const qtd = Number(relatarQuantidade.value);
    if (!relatarQuantidade.value || isNaN(qtd) || qtd <= 0) {
      const err = document.querySelector(
        '[data-error-for="relatarQuantidade"]'
      );
      if (err) err.textContent = "Informe uma quantidade válida.";
      valido = false;
    }

    if (!relatarTipo.value) {
      const err = document.querySelector('[data-error-for="relatarTipo"]');
      if (err) err.textContent = "Selecione o tipo de ocorrência.";
      valido = false;
    }

    return valido;
  }

  async function refreshFromSupabaseIfPossible() {
    if (typeof supabaseClient === "undefined") return;

    // 1) Equipamentos primeiro (é o essencial para o professor ver a lista)
    const { data, error } = await supabaseClient
      .from("equipamentos")
      .select("id,edf_de,descricao,quantidade,stock,empresa_data,estado_bom,estado_razoavel,estado_mau,estado_abate,local,observacao,outras_observacao")
      .order("descricao");
    if (error) throw error;

    // 2) Manutenção à parte: se RLS bloquear só esta tabela, ainda mostramos o inventário
    let maintMap = carregarManutencaoMap();
    try {
      const fromDb = await carregarManutencaoSupabaseMap();
      if (fromDb) maintMap = fromDb;
    } catch (e) {
      console.warn("Manutenção (Supabase) indisponível — a usar localStorage ou 0.", e);
    }

    inventario = data.map((row) => ({
      id: row.id,
      nome: row.descricao || "",
      categoria: row.edf_de || "",
      quantidade: Number(row.quantidade || 0),
      stock: Number(row.stock || 0),
      manutencaoQtd: Number(maintMap[row.id] || 0),
      localizacao: row.local || "",
      marcaModelo: row.empresa_data || "",
      estado: "",
      estadoBom: row.estado_bom ?? null,
      estadoRazoavel: row.estado_razoavel ?? null,
      estadoMau: row.estado_mau ?? null,
      estadoAbate: row.estado_abate ?? null,
      observacoes: row.observacao || "",
      outrasObservacoes: row.outras_observacao || "",
    }));
  }

  renderizarInventarioProf();
  renderizarManutencaoProf();
  renderizarRelatadosProfLocal();
  preencherSelectEquipamentos();

  (async () => {
    try {
      // Teste rápido para mostrar erros reais de ligação/RLS
      if (typeof supabaseClient === "undefined") {
        mostrarToast("Supabase não carregou (verifique a internet/CDN).", "error");
        return;
      }
      const ping = await supabaseClient
        .from("equipamentos")
        .select("id")
        .limit(1);
      if (ping.error) throw ping.error;

      await refreshFromSupabaseIfPossible();
      renderizarInventarioProf();
      renderizarManutencaoProf();
      await renderizarRelatadosProfSupabase();
      preencherSelectEquipamentos();
    } catch (e) {
      console.error(e);
      const message = e?.message || String(e) || "Erro desconhecido";
      mostrarToast(`Servidor indisponível: ${message}`, "error");
    }
  })();

  window.GMApp?.setupMenuToggle("btnMenuToggleProf", "mainMenuProf");

  if (relatarForm) {
    relatarForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validarRelatar()) {
        if (relatarMessage) {
          relatarMessage.textContent =
            "Verifique os campos obrigatórios antes de enviar.";
          relatarMessage.className = "form-message error";
        }
        return;
      }

      const equipamento = inventario.find(
        (it) => String(it.id) === relatarEquipamento.value
      );
      if (!equipamento) {
        mostrarToast("Equipamento inválido.", "error");
        return;
      }

      const tipoOcorrencia = relatarTipo.value;
      const qtdRelato = Number(relatarQuantidade.value);
      const maxRelato = disponivelQtd(equipamento);
      if (qtdRelato > maxRelato) {
        mostrarToast(
          `Quantidade inválida. Máximo disponível para "${equipamento.nome}": ${maxRelato}.`,
          "error"
        );
        if (relatarQuantidade) relatarQuantidade.value = String(maxRelato);
        return;
      }
      const descRelato = relatarDescricao
        ? String(relatarDescricao.value).trim()
        : "";

      const registro = {
        id: Date.now(),
        nome: equipamento.nome,
        acao: `RELATO PROFESSOR: ${tipoOcorrencia} (x${qtdRelato})`,
        descricao: descRelato,
        dataHora: new Date().toISOString(),
      };

      historico.push(registro);
      guardarJSON(HISTORY_KEY, historico);
      renderizarRelatadosProfLocal();

      mostrarToast("Relatório enviado aos responsáveis.", "success");

      relatarForm.reset();
      if (relatarPesquisa) {
        relatarPesquisa.value = "";
        relatarPesquisa.style.color = "";
        relatarPesquisa.style.fontWeight = "";
      }
      if (relatarEquipamento) relatarEquipamento.value = "";
      limparErros();

      (async () => {
        if (typeof supabaseClient === "undefined") return;
        const { error } = await supabaseClient.from("relatos").insert([
          {
            equipamento_id: equipamento.id,
            nome_equipamento: equipamento.nome,
            tipo_ocorrencia: tipoOcorrencia,
            quantidade: qtdRelato,
            descricao: descRelato || null,
            data_hora: registro.dataHora,
            prof_email: currentUserEmail || null,
            prof_role: "professor",
          },
        ]);
        if (error) {
          console.error(error);
          mostrarToast(
            "Relatório guardado neste dispositivo. Erro ao gravar no servidor.",
            "error"
          );
        }
        await renderizarRelatadosProfSupabase();
      })();
    });
  }

  if (relatadosProfBody) {
    relatadosProfBody.addEventListener("click", async (e) => {
      const btn = e.target.closest('button[data-action="remove-relato-prof"]');
      const btnLocal = e.target.closest('button[data-action="remove-relato-local"]');
      if (!btn && !btnLocal) return;
      const id = Number((btn || btnLocal).dataset.id);
      if (!id) return;

      const ok = window.confirm(
        "Tem a certeza que quer remover este relato?"
      );
      if (!ok) return;

      if (btnLocal) {
        historico = historico.filter((h) => Number(h.id) !== id);
        guardarJSON(HISTORY_KEY, historico);
        renderizarRelatadosProfLocal();
        mostrarToast("Relato removido.", "success");
        return;
      }

      if (typeof supabaseClient === "undefined") {
        mostrarToast("Supabase não está disponível.", "error");
        return;
      }

      // Em vez de apagar na BD, marcamos como negado (vermelho) mas continua visível ao professor
      const { error } = await supabaseClient
        .from("relatos")
        .update({ status: "negado" })
        .eq("id", id)
        .eq("prof_email", currentUserEmail);

      if (error) {
        console.error(error);
        mostrarToast("Erro ao remover relato.", "error");
        return;
      }

      mostrarToast("Relato removido.", "success");
      await renderizarRelatadosProfSupabase();
    });
  }

  if (relatarLimpar) {
    relatarLimpar.addEventListener("click", () => {
      if (!relatarForm) return;
      relatarForm.reset();
      if (relatarPesquisa) {
        relatarPesquisa.value = "";
        relatarPesquisa.style.color = "";
        relatarPesquisa.style.fontWeight = "";
      }
      if (relatarEquipamento) relatarEquipamento.value = "";
      limparErros();
      if (relatarMessage) {

        relatarMessage.textContent = "";
        relatarMessage.className = "form-message";
      }
    });
  }
});
