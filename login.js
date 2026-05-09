function setRole(role) {
  localStorage.setItem("gm_desporto_role", role);
}

function setUserEmail(email) {
  localStorage.setItem("gm_desporto_user_email", String(email || "").toLowerCase());
}

function validarSenhaEspecial(email, senha) {
  const safeEmail = String(email || "").trim().toLowerCase();
  const safeSenha = String(senha || "");
  if (safeEmail !== "profadimin@gmail.com") return true;
  return safeSenha === "124567";
}

document.addEventListener("DOMContentLoaded", () => {
  window.GMApp?.wireRouteLinks();
  const form = document.getElementById("loginForm");
  const registroForm = document.getElementById("registroForm");
  const recoverForm = document.getElementById("recoverForm");
  const userInput = document.getElementById("username");
  const passInput = document.getElementById("password");
  const msg = document.getElementById("loginMessage");
  const registroMsg = document.getElementById("registroMessage");
  const recoverMsg = document.getElementById("recoverMessage");
  const loginTitle = document.getElementById("loginTitle");
  const tabProfessor = document.getElementById("tabProfessor");
  const tabAdmin = document.getElementById("tabAdmin");
  const loginTabs = document.querySelector(".login-tabs");
  const btnToggleRegistro = document.getElementById("btnToggleRegistro");
  const btnToggleRecover = document.getElementById("btnToggleRecover");

  let selectedRole = "professor";
  let currentMode = "login";

  function setTab(role) {
    selectedRole = role;
    const isProf = role === "professor";

    if (tabProfessor) {
      tabProfessor.classList.toggle("active", isProf);
      tabProfessor.setAttribute("aria-selected", String(isProf));
    }
    if (tabAdmin) {
      tabAdmin.classList.toggle("active", !isProf);
      tabAdmin.setAttribute("aria-selected", String(!isProf));
    }
    if (loginTitle) {
      loginTitle.textContent = isProf ? "ACESSO PROFESSOR" : "ACESSO ADMIN";
    }
    if (msg) {
      msg.textContent = "";
      msg.className = "form-message";
    }
  }

  function updateMode(mode) {
    currentMode = mode;
    const isLogin = mode === "login";
    const isRegistro = mode === "register";
    const isRecover = mode === "recover";

    if (form) form.style.display = isLogin ? "" : "none";
    if (registroForm) registroForm.style.display = isRegistro ? "" : "none";
    if (recoverForm) recoverForm.style.display = isRecover ? "" : "none";
    if (loginTabs) loginTabs.style.display = isLogin ? "" : "none";

    if (loginTitle) {
      if (isRegistro) loginTitle.textContent = "REGISTO";
      else if (isRecover) loginTitle.textContent = "RECUPERAR CONTA";
      else loginTitle.textContent = selectedRole === "professor" ? "ACESSO PROFESSOR" : "ACESSO ADMIN";
    }

    if (btnToggleRegistro) {
      btnToggleRegistro.textContent = isRegistro ? "Já tem conta? Entrar" : "Não tem conta? Registar-se";
    }
    if (btnToggleRecover) {
      btnToggleRecover.textContent = isRecover ? "Já tem conta? Entrar" : "Recuperar conta";
    }
  }

  function toggleRegistro() {
    updateMode(currentMode === "register" ? "login" : "register");
  }

  function toggleRecover() {
    updateMode(currentMode === "recover" ? "login" : "recover");
  }

  async function enviarEmailConta(email) {
    if (!email || typeof supabaseClient === "undefined") return false;
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/index.html`,
      });
      return !error;
    } catch {
      return false;
    }
  }

  if (!form || !userInput || !passInput) return;

  if (tabProfessor) tabProfessor.addEventListener("click", () => setTab("professor"));
  if (tabAdmin) tabAdmin.addEventListener("click", () => setTab("admin"));
  if (btnToggleRegistro) btnToggleRegistro.addEventListener("click", toggleRegistro);
  if (btnToggleRecover) btnToggleRecover.addEventListener("click", toggleRecover);
  setTab("professor");
  updateMode("login");

  async function isAdminByEmail(email) {
    if (!email || typeof supabaseClient === "undefined") return false;
    try {
      const { data, error } = await supabaseClient
        .from("membros")
        .select("role")
        .eq("email", email)
        .limit(1)
        .maybeSingle();
      if (error) return false;
      return String(data?.role || "").toLowerCase() === "admin";
    } catch {
      return false;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Modo prático temporário: sem validação de conta/palavra-passe.
    // A aba selecionada define o tipo de acesso.
    const emailDigitado = userInput.value.trim().toLowerCase();
    const senhaDigitada = passInput.value || "";
    const emailFallback =
      selectedRole === "admin" ? "admin@gmdesporto.pt" : "prof@gmdesporto.pt";
    const emailFinal = emailDigitado || emailFallback;

    if (!validarSenhaEspecial(emailFinal, senhaDigitada)) {
      if (msg) {
        msg.textContent = "Palavra-passe incorreta para esta conta.";
        msg.className = "form-message error";
      }
      return;
    }

    const isDualByEmail = emailFinal === "profadimin@gmail.com";
    const isAdminAccount = selectedRole === "admin" || (await isAdminByEmail(emailFinal));
    window.GMApp?.setDualRole(Boolean(isDualByEmail || isAdminAccount));

    setRole(selectedRole);
    setUserEmail(emailFinal);

    if (selectedRole === "admin") {
      window.GMApp?.goTo("adminInventory");
    } else {
      window.GMApp?.goTo("profReports");
    }
  });

  if (registroForm) {
    registroForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = document.getElementById("regNome").value.trim();
      const email = document.getElementById("regEmail").value.trim().toLowerCase();
      const role = document.getElementById("regRole").value;

      if (!nome || !email || !role) {
        if (registroMsg) {
          registroMsg.textContent = "Preencha todos os campos.";
          registroMsg.className = "form-message error";
        }
        return;
      }

      try {
        const { error } = await supabaseClient.from("solicitacoes_registo").insert([
          { nome, email, role }
        ]);

        if (error) {
          console.error(error);
          if (registroMsg) {
            registroMsg.textContent = "Erro ao solicitar registo. Tente novamente.";
            registroMsg.className = "form-message error";
          }
        } else {
          const emailEnviado = await enviarEmailConta(email);
          if (registroMsg) {
            registroMsg.textContent = emailEnviado
              ? "Solicitação enviada com sucesso. Foi enviado um email de confirmação."
              : "Solicitação enviada com sucesso. Se o email estiver disponível, receberá confirmação.";
            registroMsg.className = "form-message success";
          }
          registroForm.reset();
        }
      } catch (err) {
        console.error(err);
        if (registroMsg) {
          registroMsg.textContent = "Erro de conexão.";
          registroMsg.className = "form-message error";
        }
      }
    });
  }

  if (recoverForm) {
    recoverForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("recoverEmail")?.value?.trim().toLowerCase() || "";
      if (!email) {
        if (recoverMsg) {
          recoverMsg.textContent = "Informe o email da conta.";
          recoverMsg.className = "form-message error";
        }
        return;
      }

      const enviado = await enviarEmailConta(email);
      if (recoverMsg) {
        recoverMsg.textContent = enviado
          ? "Email de recuperação enviado. Verifique a sua caixa de entrada."
          : "Pedido recebido. Se o email existir, receberá instruções de recuperação.";
        recoverMsg.className = "form-message success";
      }
    });
  }
});

