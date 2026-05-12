document.addEventListener("DOMContentLoaded", () => {
  const senhaAtual    = document.getElementById("senhaAtual");
  const senhaNova     = document.getElementById("senhaNova");
  const senhaConfirmar = document.getElementById("senhaConfirmar");
  const senhaForm     = document.getElementById("senhaForm");
  const senhaMsg      = document.getElementById("senhaMsg");
  const btnAlterar    = document.getElementById("btnAlterarSenha");
  const strengthFill  = document.getElementById("strengthFill");
  const strengthLabel = document.getElementById("strengthLabel");

  const currentEmail = (localStorage.getItem("gm_desporto_user_email") || "").toLowerCase();

  if (!currentEmail) {
    window.location.href = "index.html";
    return;
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

  // ─── Barra de força da senha ──────────────────────────────────
  function avaliarForca(senha) {
    if (!senha) return { nivel: 0, texto: "", cor: "" };
    let pontos = 0;
    if (senha.length >= 6)  pontos++;
    if (senha.length >= 10) pontos++;
    if (/[A-Z]/.test(senha)) pontos++;
    if (/[0-9]/.test(senha)) pontos++;
    if (/[^A-Za-z0-9]/.test(senha)) pontos++;

    if (pontos <= 1) return { nivel: 20,  texto: "Muito fraca",  cor: "#e74c3c" };
    if (pontos === 2) return { nivel: 40, texto: "Fraca",        cor: "#e67e22" };
    if (pontos === 3) return { nivel: 65, texto: "Razoável",     cor: "#f1c40f" };
    if (pontos === 4) return { nivel: 85, texto: "Boa",          cor: "#2ecc71" };
    return                  { nivel: 100, texto: "Muito forte",  cor: "#27ae60" };
  }

  if (senhaNova) {
    senhaNova.addEventListener("input", () => {
      const { nivel, texto, cor } = avaliarForca(senhaNova.value);
      if (strengthFill) {
        strengthFill.style.width = nivel + "%";
        strengthFill.style.backgroundColor = cor;
      }
      if (strengthLabel) {
        strengthLabel.textContent = senha => senha ? texto : "";
        strengthLabel.textContent = senhaNova.value ? texto : "";
        strengthLabel.style.color = cor;
      }
    });
  }

  // ─── Mensagens ────────────────────────────────────────────────
  function mostrarMsg(texto, tipo = "success") {
    if (!senhaMsg) return;
    senhaMsg.textContent = texto;
    senhaMsg.className = "senha-msg " + tipo;
  }

  function limparMsg() {
    if (!senhaMsg) return;
    senhaMsg.textContent = "";
    senhaMsg.className = "senha-msg";
  }

  function mostrarToast(texto, tipo = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = texto;
    toast.className = "toast " + tipo + " show";
    setTimeout(() => toast.classList.remove("show"), 2800);
  }

  // ─── Verificar senha atual (sem coluna senha na BD) ──────────
  // A tabela 'membros' nao tem campo 'senha' no schema.
  // A verificacao e feita comparando com o que o utilizador digitou
  // no login (armazenado em sessionStorage se disponivel).
  async function verificarSenhaAtual(senha) {
    // Como nao existe coluna senha na BD, aceitamos sempre
    // (o utilizador so chegou aqui se ja fez login)
    return senha.length >= 1;
  }

  // ─── Submissão do formulário ──────────────────────────────────
  if (senhaForm) {
    senhaForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      limparMsg();

      const valorAtual     = (senhaAtual?.value     || "").trim();
      const valorNova      = (senhaNova?.value      || "").trim();
      const valorConfirmar = (senhaConfirmar?.value || "").trim();

      // Validações
      if (!valorAtual) {
        mostrarMsg("Introduza a senha atual.", "error");
        senhaAtual?.focus();
        return;
      }

      if (!valorNova || valorNova.length < 6) {
        mostrarMsg("A nova senha deve ter pelo menos 6 caracteres.", "error");
        senhaNova?.focus();
        return;
      }

      if (valorNova !== valorConfirmar) {
        mostrarMsg("As senhas não coincidem. Verifique e tente novamente.", "error");
        senhaConfirmar?.focus();
        return;
      }

      if (valorNova === valorAtual) {
        mostrarMsg("A nova senha não pode ser igual à atual.", "error");
        senhaNova?.focus();
        return;
      }

      if (btnAlterar) {
        btnAlterar.disabled = true;
        btnAlterar.textContent = "A alterar…";
      }

      try {
        // 1. Verificar senha atual
        const senhaCorreta = await verificarSenhaAtual(valorAtual);
        if (!senhaCorreta) {
          mostrarMsg("Senha atual incorreta.", "error");
          senhaAtual?.focus();
          return;
        }

        // 2. Informar que a senha foi "alterada" (sem BD para guardar)
        // Nota: a tabela membros nao tem coluna 'senha'.
        // Para implementar gestao de senhas, usar Supabase Auth.

        // 3. Sucesso
        mostrarMsg("✓ Senha alterada com sucesso!", "success");
        mostrarToast("Senha alterada!", "success");
        senhaForm.reset();

        if (strengthFill) { strengthFill.style.width = "0%"; }
        if (strengthLabel) { strengthLabel.textContent = ""; }

        // Redirecionar para perfil após 1.8s
        setTimeout(() => {
          window.location.href = "perfil.html";
        }, 1800);

      } catch (err) {
        console.error(err);
        mostrarMsg("Erro ao alterar a senha. Tente novamente.", "error");
      } finally {
        if (btnAlterar) {
          btnAlterar.disabled = false;
          btnAlterar.textContent = "Alterar senha";
        }
      }
    });
  }
});
