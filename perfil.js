document.addEventListener("DOMContentLoaded", () => {
  const perfilAvatar      = document.getElementById("perfilAvatar");
  const perfilEmailBadge  = document.getElementById("perfilEmailBadge");
  const perfilNome        = document.getElementById("perfilNome");
  const perfilEmail       = document.getElementById("perfilEmail");
  const perfilSenhaAtual  = document.getElementById("perfilSenhaAtual");
  const perfilForm        = document.getElementById("perfilForm");
  const perfilMsg         = document.getElementById("perfilMsg");
  const btnGuardar        = document.getElementById("btnGuardar");
  const btnTerminarSessao = document.getElementById("btnTerminarSessao");
  const btnVoltar         = document.getElementById("btnVoltar");

  const currentEmail = (localStorage.getItem("gm_desporto_user_email") || "").toLowerCase();

  if (!currentEmail) {
    window.location.href = "index.html";
    return;
  }

  // ─── Botão Voltar ─────────────────────────────────────────────
  if (btnVoltar) {
    btnVoltar.addEventListener("click", (e) => {
      e.preventDefault();
      history.back();
    });
  }

  // ─── Mostrar/ocultar senha ────────────────────────────────────
  document.querySelectorAll(".toggle-pass").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isPass = input.type === "password";
      input.type = isPass ? "text" : "password";
      btn.textContent = isPass ? "🙈" : "👁";
    });
  });

  // ─── Carregar dados do utilizador ─────────────────────────────
  async function carregarPerfil() {
    const inicial = (currentEmail[0] || "?").toUpperCase();
    if (perfilAvatar) perfilAvatar.textContent = inicial;
    if (perfilEmailBadge) perfilEmailBadge.textContent = currentEmail;
    if (perfilEmail) perfilEmail.value = currentEmail;

    if (typeof supabaseClient === "undefined") return;

    try {
      const { data } = await supabaseClient
        .from("membros")
        .select("nome, email")
        .eq("email", currentEmail)
        .maybeSingle();

      if (data) {
        if (perfilNome) perfilNome.value = data.nome || "";
        if (perfilEmail) perfilEmail.value = data.email || currentEmail;
        // Senha: a coluna nao existe em membros, mostrar placeholder
        if (perfilSenhaAtual) perfilSenhaAtual.placeholder = "••••••••";

        const inicialFinal = (data.nome || data.email || "?")[0].toUpperCase();
        if (perfilAvatar) perfilAvatar.textContent = inicialFinal;
        if (perfilEmailBadge) perfilEmailBadge.textContent = data.email || currentEmail;
      }
    } catch (e) {
      console.warn("Não foi possível carregar dados do perfil:", e);
    }
  }

  // ─── Mensagens ────────────────────────────────────────────────
  function mostrarMsg(texto, tipo = "success") {
    if (!perfilMsg) return;
    perfilMsg.textContent = texto;
    perfilMsg.className = "perfil-msg " + tipo;
    setTimeout(() => {
      if (perfilMsg) { perfilMsg.textContent = ""; perfilMsg.className = "perfil-msg"; }
    }, 3500);
  }

  function mostrarToast(texto, tipo = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = texto;
    toast.className = "toast " + tipo + " show";
    setTimeout(() => toast.classList.remove("show"), 2800);
  }

  // ─── Guardar nome e email ─────────────────────────────────────
  if (perfilForm) {
    perfilForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const novoNome  = (perfilNome?.value  || "").trim();
      const novoEmail = (perfilEmail?.value || "").trim().toLowerCase();

      if (!novoEmail || !novoEmail.includes("@")) {
        mostrarMsg("Introduza um email válido.", "error");
        perfilEmail?.focus();
        return;
      }

      if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.textContent = "A guardar…";
      }

      try {
        if (typeof supabaseClient !== "undefined") {
          const payload = { email: novoEmail };
          if (novoNome) payload.nome = novoNome;

          const { error } = await supabaseClient
            .from("membros")
            .update(payload)
            .eq("email", currentEmail);

          if (error) throw error;

          // Actualizar também em solicitacoes_registo se existir
          await supabaseClient
            .from("solicitacoes_registo")
            .update(payload)
            .eq("email", currentEmail);
        }

        localStorage.setItem("gm_desporto_user_email", novoEmail);

        const inicialAtualizada = (novoNome || novoEmail)[0].toUpperCase();
        if (perfilAvatar) perfilAvatar.textContent = inicialAtualizada;
        if (perfilEmailBadge) perfilEmailBadge.textContent = novoEmail;

        mostrarMsg("Perfil actualizado com sucesso!", "success");
        mostrarToast("Perfil actualizado!", "success");

      } catch (err) {
        console.error(err);
        mostrarMsg("Erro ao guardar. Tente novamente.", "error");
      } finally {
        if (btnGuardar) {
          btnGuardar.disabled = false;
          btnGuardar.textContent = "Guardar alterações";
        }
      }
    });
  }

  // ─── Terminar sessão ──────────────────────────────────────────
  if (btnTerminarSessao) {
    btnTerminarSessao.addEventListener("click", () => {
      if (!window.confirm("Tem a certeza que quer terminar a sessão?")) return;
      localStorage.removeItem("gm_desporto_role");
      localStorage.removeItem("gm_desporto_user_email");
      localStorage.removeItem("gm_desporto_dual_role");
      window.location.href = "index.html";
    });
  }

  // ─── Inicializar ──────────────────────────────────────────────
  carregarPerfil();
});
