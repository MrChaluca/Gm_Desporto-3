function mostrarToast(texto, tipo = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = texto;
  toast.className = "toast " + tipo + " show";
  if (mostrarToast._timeoutId) clearTimeout(mostrarToast._timeoutId);
  mostrarToast._timeoutId = setTimeout(() => toast.classList.remove("show"), 2500);
}

function labelTipo(t) {
  const map = {
    danificado: "Danificado",
    desaparecido: "Desaparecido",
    outro: "Outro",
  };
  return map[t] || t || "—";
}

// Nota: existe um campo "status" na BD (visto/negado/positivo),
// mas neste ecrã removemos a coluna visual de "Estado".

async function atualizarEstadoRelato(relId, patch) {
  const { error } = await supabaseClient
    .from("relatos")
    .update(patch)
    .eq("id", relId);
  if (error) throw error;
}

async function executarRetirarDoStock(payload) {
  const { relId, equipId, qtd } = payload;
  const { data: eq, error } = await supabaseClient
    .from("equipamentos")
    .select("quantidade")
    .eq("id", equipId)
    .single();
  if (error) throw error;

  const tirar = Number(qtd);
  const novaQtd = Math.max(0, Number(eq.quantidade) - tirar);

  const { error: errUp } = await supabaseClient
    .from("equipamentos")
    .update({ quantidade: novaQtd })
    .eq("id", equipId);
  if (errUp) throw errUp;

  await atualizarEstadoRelato(relId, { status: "positivo", admin_hidden: true });
}

async function executarColocarEmManutencao(payload) {
  const { relId, equipId, qtd } = payload;
  const { data: eq, error } = await supabaseClient
    .from("equipamentos")
    .select("quantidade")
    .eq("id", equipId)
    .single();
  if (error) throw error;

  const manut = await obterManutencaoAtual(equipId);
  const total = Number(eq.quantidade);
  const disp = Math.max(0, total - manut);
  const pedido = Number(qtd);
  const qtyToAdd = Math.min(pedido, disp);

  if (qtyToAdd <= 0) {
    throw new Error(
      "Não há unidades disponíveis para colocar em manutenção (stock já em manutenção ou quantidade zero)."
    );
  }

  const newManut = manut + qtyToAdd;
  await setManutencaoQuantidadeSupabase(equipId, newManut);
  await atualizarEstadoRelato(relId, { status: "positivo", admin_hidden: true });
}

let pendingExec = null;

function fecharModalConfirm() {
  const modal = document.getElementById("relatadosConfirmModal");
  if (modal) modal.classList.add("hidden");
  pendingExec = null;
}

function abrirModalConfirm(titulo, texto, fn) {
  const modal = document.getElementById("relatadosConfirmModal");
  const titleEl = document.getElementById("relatadosConfirmTitle");
  const textEl = document.getElementById("relatadosConfirmText");
  if (!modal || !textEl) return;
  if (titleEl) titleEl.textContent = titulo;
  textEl.textContent = texto;
  pendingExec = fn;
  modal.classList.remove("hidden");
}

async function carregarRelatados() {
  const tbody = document.getElementById("relatadosAdminBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (typeof supabaseClient === "undefined") {
    tbody.innerHTML =
      '<tr class="inventory-empty-row"><td colspan="6">Supabase não disponível.</td></tr>';
    return;
  }

  const { data, error } = await supabaseClient
    .from("relatos")
    .select(
      "id,equipamento_id,nome_equipamento,tipo_ocorrencia,quantidade,descricao,data_hora,created_at,status,admin_hidden"
    )
    .eq("admin_hidden", false)
    .order("data_hora", { ascending: false });

  if (error) {
    console.error(error);
    tbody.innerHTML =
      '<tr class="inventory-empty-row"><td colspan="6">Relatos indisponíveis no momento.</td></tr>';
    mostrarToast("Não foi possível carregar relatos.", "error");
    return;
  }

  if (!data || !data.length) {
    tbody.innerHTML =
      '<tr class="inventory-empty-row"><td colspan="6">Ainda não existem relatos na base de dados.</td></tr>';
    return;
  }

  // Ao admin ver a lista, marcamos "nao_visto" como "visto"
  const idsToMarkSeen = data
    .filter((r) => String(r.status || "nao_visto") === "nao_visto")
    .map((r) => r.id);
  if (idsToMarkSeen.length) {
    try {
      const { error: errSeen } = await supabaseClient
        .from("relatos")
        .update({ status: "visto" })
        .in("id", idsToMarkSeen);
      if (errSeen) throw errSeen;
      data.forEach((r) => {
        if (idsToMarkSeen.includes(r.id)) r.status = "visto";
      });
    } catch (e) {
      console.warn("Não foi possível marcar como visto.", e);
    }
  }

  data.forEach((r) => {
    const tr = document.createElement("tr");
    const dh = r.data_hora || r.created_at;
    const td0 = document.createElement("td");
    td0.textContent = dh ? new Date(dh).toLocaleString("pt-PT") : "—";
    const td1 = document.createElement("td");
    td1.textContent = r.nome_equipamento || "—";
    const td2 = document.createElement("td");
    td2.textContent = labelTipo(r.tipo_ocorrencia);
    const td3 = document.createElement("td");
    td3.textContent = String(r.quantidade ?? "—");
    const td4 = document.createElement("td");
    td4.textContent = (r.descricao || "").trim() || "—";

    const td5 = document.createElement("td");
    const eqId = r.equipamento_id != null ? Number(r.equipamento_id) : null;

    if (eqId && Number(r.quantidade) > 0) {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "0.35rem";

      const btnRet = document.createElement("button");
      btnRet.type = "button";
      btnRet.className = "btn-secondary small";
      btnRet.textContent = "Retirar do stock";
      btnRet.dataset.acao = "retirar";
      btnRet.dataset.relId = String(r.id);
      btnRet.dataset.equipId = String(eqId);
      btnRet.dataset.qtd = String(r.quantidade);

      const btnRem = document.createElement("button");
      btnRem.type = "button";
      btnRem.className = "inventory-btn-delete";
      btnRem.textContent = "Negar";
      btnRem.dataset.acao = "remover-relato";
      btnRem.dataset.relId = String(r.id);

      wrap.appendChild(btnRet);
      wrap.appendChild(btnRem);
      td5.appendChild(wrap);
    } else {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "0.35rem";
      const btnRem = document.createElement("button");
      btnRem.type = "button";
      btnRem.className = "inventory-btn-delete";
      btnRem.textContent = "Negar";
      btnRem.dataset.acao = "remover-relato";
      btnRem.dataset.relId = String(r.id);
      wrap.appendChild(btnRem);
      if (!eqId) {
        const info = document.createElement("span");
        info.textContent = "sem ID do equipamento";
        info.style.fontSize = "0.78rem";
        info.style.color = "#666";
        wrap.appendChild(info);
      }
      td5.appendChild(wrap);
    }

    tr.appendChild(td0);
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);
    tr.appendChild(td5);
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  window.GMApp?.wireRouteLinks();
  if (!window.GMApp?.hasAccess("admin")) {
    window.GMApp?.goTo("profReports");
    return;
  }

  window.GMApp?.setupMenuToggle("btnMenuToggleRelatados", "mainMenu");

  const modal = document.getElementById("relatadosConfirmModal");
  const btnOk = document.getElementById("relatadosConfirmOk");
  const btnCancel = document.getElementById("relatadosConfirmCancel");
  const btnClose = document.getElementById("relatadosConfirmClose");

  function wireModalClose() {
    fecharModalConfirm();
  }

  if (btnCancel) btnCancel.addEventListener("click", wireModalClose);
  if (btnClose) btnClose.addEventListener("click", wireModalClose);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) wireModalClose();
    });
  }

  if (btnOk) {
    btnOk.addEventListener("click", async () => {
      if (!pendingExec) {
        fecharModalConfirm();
        return;
      }
      const fn = pendingExec;
      fecharModalConfirm();
      try {
        await fn();
        mostrarToast("Ação concluída com sucesso.", "success");
        await carregarRelatados();
      } catch (err) {
        console.error(err);
        mostrarToast(err.message || "Erro ao executar a ação.", "error");
      }
    });
  }

  const tbody = document.getElementById("relatadosAdminBody");
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-acao]");
      if (!btn || !btn.dataset.acao) return;

      const acao = btn.dataset.acao;
      const relId = Number(btn.dataset.relId);
      const equipId = Number(btn.dataset.equipId);
      const qtd = Number(btn.dataset.qtd);
      const nome = btn.closest("tr")?.children[1]?.textContent?.trim() || "equipamento";

      if (!relId) return;

      if (acao === "retirar") {
        if (!equipId || !qtd) return;
        const payload = { relId, equipId, qtd };
        abrirModalConfirm(
          "Retirar do stock",
          `Tem a certeza que quer retirar ${qtd} unidade(s) do stock total de «${nome}»? Esta quantidade será descontada do inventário.`,
          () => executarRetirarDoStock(payload)
        );
      } else if (acao === "remover-relato") {
        abrirModalConfirm(
          "Negar relato",
          `Tem a certeza que quer negar este relato de «${nome}»? (Vai ficar a vermelho no professor e não aparece mais no admin.)`,
          () => atualizarEstadoRelato(relId, { status: "negado", admin_hidden: true })
        );
      }
    });
  }

  await carregarRelatados();
});
