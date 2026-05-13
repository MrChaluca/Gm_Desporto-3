document.addEventListener("DOMContentLoaded", async () => {
  window.GMApp?.wireRouteLinks();
  if (!window.GMApp?.redirectUnlessRole("admin")) return;

  window.GMApp?.setupMenuToggle("btnMenuToggle", "mainMenu");

  const abateForm = document.getElementById("abateForm");
  const abatesBody = document.getElementById("abatesBody");
  const inputPesquisa = document.getElementById("equipamentoPesquisa");
  const inputId = document.getElementById("equipamentoId");
  const autocompleteList = document.getElementById("equipamentoAutocomplete");
  const tipoRetiradaSelect = document.getElementById("tipoRetirada");
  const registoAbateSection = document.getElementById("registoAbate");
  const historicoAbatesSection = document.getElementById("historicoAbates");
  const tabNovoAbate = document.getElementById("tabNovoAbate");
  const tabHistoricoAbates = document.getElementById("tabHistoricoAbates");

  let equipamentosCache = [];

  function mostrarPainelAbates(painel) {
    const mostrarHistorico = painel === "historico";
    if (abateForm) abateForm.style.display = mostrarHistorico ? "none" : "";
    if (historicoAbatesSection) historicoAbatesSection.style.display = mostrarHistorico ? "" : "none";
    if (tabNovoAbate) tabNovoAbate.classList.toggle("active", !mostrarHistorico);
    if (tabHistoricoAbates) tabHistoricoAbates.classList.toggle("active", mostrarHistorico);
    if (registoAbateSection && mostrarHistorico) registoAbateSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (tabNovoAbate) tabNovoAbate.addEventListener("click", () => mostrarPainelAbates("novo"));
  if (tabHistoricoAbates) tabHistoricoAbates.addEventListener("click", () => mostrarPainelAbates("historico"));
  mostrarPainelAbates("novo");

  function mostrarToast(texto, tipo = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = texto;
    toast.className = "toast " + tipo + " show";
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  async function carregarEquipamentos() {
    try {
      const { data, error } = await supabaseClient
        .from("equipamentos")
        .select("id, descricao, stock, quantidade, edf_de, estado_bom, estado_razoavel, estado_mau, estado_abate")
        .order("descricao");

      if (error) throw error;
      equipamentosCache = data || [];
      // Autocomplete replaces the select population
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
      mostrarToast("Erro ao carregar equipamentos.", "error");
    }
  }

  function getTipoRetirada() {
    return tipoRetiradaSelect?.value === "quantidade" ? "quantidade" : "stock";
  }

  function getValorDisponivel(eq, tipo = getTipoRetirada()) {
    if (!eq) return 0;
    const valor = tipo === "quantidade" ? Number(eq.quantidade || 0) : Number(eq.stock || 0);
    return Number.isFinite(valor) && valor > 0 ? valor : 0;
  }

  function getLabelDisponivel(tipo = getTipoRetirada()) {
    return tipo === "quantidade" ? "Quantidade" : "Stock";
  }

  function getEquipamentoTexto(eq, tipo = getTipoRetirada()) {
    const prefix = eq.edf_de ? `${eq.edf_de} - ` : "";
    return `${prefix}${eq.descricao} (${getLabelDisponivel(tipo)}: ${getValorDisponivel(eq, tipo)})`;
  }

  function getEquipamentoSelecionado() {
    return equipamentosCache.find(eq => String(eq.id) === String(inputId?.value || ""));
  }

  function atualizarEquipamentoSelecionado() {
    const eq = getEquipamentoSelecionado();
    const tipo = getTipoRetirada();
    const erroQtd = document.querySelector('[data-error-for="quantidade"]');
    const qtdInput = abateForm?.quantidade;
    if (erroQtd) erroQtd.textContent = "";

    if (!eq) {
      if (qtdInput) {
        qtdInput.removeAttribute("max");
        qtdInput.placeholder = "Ex.: 2";
      }
      return;
    }

    const max = getValorDisponivel(eq, tipo);
    inputPesquisa.value = getEquipamentoTexto(eq, tipo);
    inputPesquisa.style.color = "#8b0000";
    inputPesquisa.style.fontWeight = "600";

    if (qtdInput) {
      qtdInput.max = String(max);
      qtdInput.placeholder = `Máx.: ${max}`;
      if (Number(qtdInput.value) > max) qtdInput.value = String(max);
    }
  }

  function renderizarAutocomplete(termo = "") {
    autocompleteList.innerHTML = "";
    
    if (!equipamentosCache.length) {
      autocompleteList.innerHTML = '<div class="autocomplete-item" style="color:#666;">A carregar...</div>';
      autocompleteList.classList.remove("hidden");
      return;
    }

    const termoBaixo = termo.toLowerCase().trim();
    let filtrados = equipamentosCache;

    if (termoBaixo) {
      filtrados = equipamentosCache.filter(eq => {
        const texto = `${eq.edf_de ? eq.edf_de + ' - ' : ''}${eq.descricao || ""}`.toLowerCase();
        return texto.includes(termoBaixo);
      });
    }

    if (filtrados.length === 0) {
      autocompleteList.innerHTML = '<div class="autocomplete-item" style="color:#666;">Nenhum equipamento encontrado.</div>';
      autocompleteList.classList.remove("hidden");
      return;
    }

    // Limit to 50 results to keep the DOM light
    filtrados.slice(0, 50).forEach(eq => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = getEquipamentoTexto(eq);
      div.addEventListener("click", () => {
        if (inputId) {
          inputId.value = eq.id;
          inputId.dispatchEvent(new Event("change"));
        }
        atualizarEquipamentoSelecionado();
        autocompleteList.classList.add("hidden");
      });
      autocompleteList.appendChild(div);
    });

    autocompleteList.classList.remove("hidden");
  }

  inputPesquisa.addEventListener("input", (e) => {
    inputPesquisa.style.color = "";
    inputPesquisa.style.fontWeight = "";
    if (inputId) inputId.value = "";
    const qtdInput = abateForm?.quantidade;
    if (qtdInput) {
      qtdInput.removeAttribute("max");
      qtdInput.placeholder = "Ex.: 2";
    }
    renderizarAutocomplete(e.target.value);
  });

  inputPesquisa.addEventListener("focus", () => {
    renderizarAutocomplete(inputPesquisa.value);
  });

  document.addEventListener("click", (e) => {
    if (!inputPesquisa.contains(e.target) && !autocompleteList.contains(e.target)) {
      autocompleteList.classList.add("hidden");
    }
  });

  if (inputId) inputId.addEventListener("change", atualizarEquipamentoSelecionado);
  if (tipoRetiradaSelect) tipoRetiradaSelect.addEventListener("change", atualizarEquipamentoSelecionado);

  async function carregarAbates() {
    try {
      abatesBody.innerHTML = '<tr><td colspan="5">A carregar...</td></tr>';
      const { data, error } = await supabaseClient
        .from("abates")
        .select(`
          id,
          quantidade,
          motivo,
          data_abate,
          utilizador,
          equipamentos (
            descricao,
            edf_de
          )
        `)
        .order("data_abate", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        abatesBody.innerHTML = '<tr class="inventory-empty-row"><td colspan="5">Nenhum abate registado.</td></tr>';
        return;
      }

      abatesBody.innerHTML = "";
      data.forEach((abate) => {
        const row = document.createElement("tr");
        const dataStr = new Date(abate.data_abate).toLocaleString("pt-PT");
        const nomeEq = abate.equipamentos ? `${abate.equipamentos.edf_de ? abate.equipamentos.edf_de + ' - ' : ''}${abate.equipamentos.descricao}` : "Equipamento Apagado";
        
        row.innerHTML = `
          <td data-label="Data e hora">${dataStr}</td>
          <td data-label="Equipamento">${nomeEq}</td>
          <td data-label="Quantidade">${abate.quantidade}</td>
          <td data-label="Motivo">${abate.motivo || "-"}</td>
          <td data-label="Utilizador">${abate.utilizador || "-"}</td>
        `;
        abatesBody.appendChild(row);
      });
    } catch (error) {
      console.error("Erro ao carregar abates:", error);
      abatesBody.innerHTML = '<tr class="inventory-empty-row"><td colspan="5">Erro ao carregar histórico.</td></tr>';
    }
  }

  abateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    document.querySelectorAll(".input-error").forEach((el) => (el.textContent = ""));

    const equipId = abateForm.equipamentoId.value;
    const quantidade = parseInt(abateForm.quantidade.value, 10);
    const tipoRetirada = getTipoRetirada();
    const motivo = abateForm.motivo.value.trim();

    let valido = true;
    if (!equipId) {
      document.querySelector('[data-error-for="equipamentoId"]').textContent = "Selecione um equipamento.";
      valido = false;
    }
    if (isNaN(quantidade) || quantidade <= 0) {
      document.querySelector('[data-error-for="quantidade"]').textContent = "Quantidade deve ser maior que 0.";
      valido = false;
    }

    if (!valido) return;

    const equipamento = equipamentosCache.find(eq => String(eq.id) === String(equipId));
    const maxDisponivel = equipamento
      ? getValorDisponivel(equipamento, tipoRetirada)
      : 0;
    if (equipamento && quantidade > maxDisponivel) {
      const alvo = tipoRetirada === "quantidade" ? "na quantidade total" : "em stock";
      document.querySelector('[data-error-for="quantidade"]').textContent = `Apenas tem ${maxDisponivel} ${alvo}. Não pode abater mais do que existe.`;
      return;
    }

    const utilizador = window.GMApp?.getCurrentEmail() || "admin";

    try {
      // 1. Inserir abate
      const { error: insertError } = await supabaseClient
        .from("abates")
        .insert([{
          equipamento_id: equipId,
          quantidade: quantidade,
          motivo: motivo,
          utilizador: utilizador
        }]);

      if (insertError) throw insertError;

      // 2. Subtrair no campo escolhido
      if (equipamento) {
        const novaQtd =
          tipoRetirada === "quantidade"
            ? Math.max(0, Number(equipamento.quantidade || 0) - quantidade)
            : Number(equipamento.quantidade || 0);
        const novoStock =
          tipoRetirada === "stock"
            ? Math.max(0, Number(equipamento.stock || 0) - quantidade)
            : Math.min(Number(equipamento.stock || 0), novaQtd);
        const patch = {
          stock: novoStock,
          quantidade: novaQtd,
        };

        patch.estado_bom = 0;
        patch.estado_razoavel = 0;
        patch.estado_mau = 0;
        patch.estado_abate = 0;

        const { error: updateError } = await supabaseClient
          .from("equipamentos")
          .update(patch)
          .eq("id", equipId);

        if (updateError) throw updateError;
      }

      mostrarToast("Abate registado com sucesso.");
      window.GMApp?.logAdminAction?.({
        nome: equipamento?.descricao || `Equipamento #${equipId}`,
        acao: "abate registado",
        detalhes: `Retirou ${quantidade} de ${tipoRetirada === "quantidade" ? "quantidade total" : "stock"}${motivo ? ` | Motivo: ${motivo}` : ""}`,
      });
      abateForm.reset();
      inputId.value = "";
      await carregarEquipamentos(); // Refresh para atualizar o stock no dropdown
      await carregarAbates();
      mostrarPainelAbates("historico");
    } catch (error) {
      console.error("Erro ao registar abate:", error);
      mostrarToast("Ocorreu um erro ao registar o abate.", "error");
    }
  });

  // Inicializar
  carregarEquipamentos();
  carregarAbates();
});
