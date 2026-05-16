function setRole(role) {
  localStorage.setItem("gm_desporto_role", role);
}

function setUserEmail(email) {
  localStorage.setItem("gm_desporto_user_email", String(email || "").toLowerCase());
}

function validarSenhaEspecial(email, senha) {
  const safeEmail = String(email || "").trim().toLowerCase();
  const safeSenha = String(senha || "");
  return ["profadimin@gmail.com", "profadmin@gmail.com"].includes(safeEmail) && safeSenha === "123456";
}

async function guardarAdminEspecial(email) {
  if (!email || typeof supabaseClient === "undefined") return;
  try {
    await supabaseClient.from("membros").upsert(
      [{ nome: "Profadmin", email, role: "admin" }],
      { onConflict: "email" }
    );
  } catch (err) {
    console.warn("Não foi possível guardar o admin especial na BD.", err);
  }
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
  const btnToggleRegistro = document.getElementById("btnToggleRegistro");
  const btnToggleRecover = document.getElementById("btnToggleRecover");

  let currentMode = "login";



  function updateMode(mode) {
    currentMode = mode;
    const isLogin = mode === "login";
    const isRegistro = mode === "register";
    const isRecover = mode === "recover";

    if (form) form.style.display = isLogin ? "" : "none";
    if (registroForm) registroForm.style.display = isRegistro ? "" : "none";
    if (recoverForm) recoverForm.style.display = isRecover ? "" : "none";

    if (loginTitle) {
      if (isRegistro) loginTitle.textContent = "REGISTO";
      else if (isRecover) loginTitle.textContent = "RECUPERAR CONTA";
      else loginTitle.textContent = "ACESSO";
    }

    if (btnToggleRegistro) {
      btnToggleRegistro.textContent = isRegistro ? "Entrar" : "Criar conta";
    }
    if (btnToggleRecover) {
      btnToggleRecover.textContent = isRecover ? "Entrar" : "Recuperar conta";
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

  if (btnToggleRegistro) btnToggleRegistro.addEventListener("click", toggleRegistro);
  if (btnToggleRecover) btnToggleRecover.addEventListener("click", toggleRecover);
  updateMode("login");

  async function getMemberByEmail(email) {
    if (!email || typeof supabaseClient === "undefined") return null;
    try {
      const { data, error } = await supabaseClient
        .from("membros")
        .select("role")
        .eq("email", email)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data || null;
    } catch {
      return null;
    }
  }

  function entrarComoMembro(email, membro) {
    const userRole = String(membro?.role || "professor").toLowerCase() === "admin" ? "admin" : "professor";
    window.GMApp?.setDualRole(userRole === "admin");
    setRole(userRole);
    setUserEmail(email);

    const dest =
      userRole === "admin"
        ? window.GMApp?.routes?.adminInventory || "principal.html"
        : window.GMApp?.routes?.profReports || "professores.html";
    window.location.href = dest;
  }

  async function tentarCriarLoginParaMembroAprovado(email, password) {
    const membro = await getMemberByEmail(email);
    if (!membro) return { created: false, member: null };

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: membro.role || "professor",
        },
      },
    });

    if (error) return { created: false, member: membro };
    return { created: true, member: membro };
  }

  function erroDeEmailPorConfirmar(error) {
    const texto = String(error?.message || error?.name || "").toLowerCase();
    return texto.includes("confirm") || texto.includes("verified") || texto.includes("email not confirmed");
  }

  function erroDeEmailJaRegistado(error) {
    const texto = String(error?.message || error?.name || "").toLowerCase();
    return texto.includes("already") || texto.includes("registered") || texto.includes("exists");
  }

  function mensagemErroRegisto(error) {
    const texto = String(error?.message || "").toLowerCase();
    if (texto.includes("password") || texto.includes("weak")) {
      return "A palavra-passe é demasiado fraca. Use pelo menos 6 caracteres.";
    }
    if (texto.includes("email")) {
      return "Verifique se o email está correto.";
    }
    return "Não foi possível criar a conta. Tente novamente.";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailDigitado = userInput.value.trim().toLowerCase();
    const senhaDigitada = passInput.value || "";

    if (!emailDigitado || !senhaDigitada) {
      if (msg) {
        msg.textContent = "Preencha todos os campos.";
        msg.className = "form-message error";
      }
      return;
    }

    if (msg) {
      msg.textContent = "A iniciar sessão...";
      msg.className = "form-message";
    }

    // 1. Bypass para a conta de Admin fixo
    if (validarSenhaEspecial(emailDigitado, senhaDigitada)) {
      await guardarAdminEspecial(emailDigitado);
      window.GMApp?.setDualRole(true);
      setRole("admin");
      setUserEmail(emailDigitado);
      window.location.href = window.GMApp?.routes?.adminInventory || "principal.html";
      return;
    }

    // 2. Autenticação real pelo Supabase Auth
    if (typeof supabaseClient === "undefined") {
      if (msg) {
        msg.textContent = "Erro de conexão à base de dados.";
        msg.className = "form-message error";
      }
      return;
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: emailDigitado,
        password: senhaDigitada,
      });

      if (error) {
        const membroAprovado = await getMemberByEmail(emailDigitado);
        if (membroAprovado && erroDeEmailPorConfirmar(error)) {
          entrarComoMembro(emailDigitado, membroAprovado);
          return;
        }

        const criado = await tentarCriarLoginParaMembroAprovado(emailDigitado, senhaDigitada);
        if (criado.created && criado.member) {
          entrarComoMembro(emailDigitado, criado.member);
          return;
        }

        if (msg) {
          msg.textContent = criado.member
            ? "Conta aprovada, mas a palavra-passe não corresponde. Use recuperar conta ou tente outra senha."
            : "Acesso negado: Email ou palavra-passe incorretos.";
          msg.className = "form-message error";
        }
        return;
      }

      // 3. Login com sucesso. Só deixa entrar se o admin já aceitou o pedido.
      const membro = await getMemberByEmail(emailDigitado);
      if (!membro) {
        await supabaseClient.auth.signOut();
        if (msg) {
          msg.textContent = "A conta ainda aguarda aprovação do admin.";
          msg.className = "form-message error";
        }
        return;
      }

      entrarComoMembro(emailDigitado, membro);

    } catch (err) {
      console.error(err);
      if (msg) {
        msg.textContent = "Ocorreu um erro inesperado no login.";
        msg.className = "form-message error";
      }
    }
  });

  if (registroForm) {
    registroForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = document.getElementById("regNome").value.trim();
      const email = document.getElementById("regEmail").value.trim().toLowerCase();
      const password = document.getElementById("regPassword")?.value || "";
      const passwordConfirm = document.getElementById("regPasswordConfirm")?.value || "";
      const role = document.getElementById("regRole").value;

      if (!nome || !email || !password || !passwordConfirm || !role) {
        if (registroMsg) {
          registroMsg.textContent = "Preencha todos os campos.";
          registroMsg.className = "form-message error";
        }
        return;
      }

      if (password.length < 6) {
        if (registroMsg) {
          registroMsg.textContent = "A palavra-passe deve ter pelo menos 6 caracteres.";
          registroMsg.className = "form-message error";
        }
        return;
      }

      if (password !== passwordConfirm) {
        if (registroMsg) {
          registroMsg.textContent = "As palavras-passe não coincidem.";
          registroMsg.className = "form-message error";
        }
        return;
      }

      try {
        const membroExistente = await getMemberByEmail(email);
        if (membroExistente) {
          if (registroMsg) {
            registroMsg.textContent = "Este email já está aprovado. Entre ou use recuperar conta.";
            registroMsg.className = "form-message error";
          }
          return;
        }

        const { error: authError } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome,
              role,
            },
          },
        });

        if (authError && !erroDeEmailJaRegistado(authError)) {
          console.error(authError);
          if (registroMsg) {
            registroMsg.textContent = mensagemErroRegisto(authError);
            registroMsg.className = "form-message error";
          }
          return;
        }

        const { error } = await supabaseClient
          .from("solicitacoes_registo")
          .upsert([{ nome, email, role }], { onConflict: "email" });

        if (error) {
          console.error(error);
          if (registroMsg) {
            registroMsg.textContent = "Erro ao solicitar registo. Tente novamente.";
            registroMsg.className = "form-message error";
          }
        } else {
          await supabaseClient.auth.signOut();
          if (registroMsg) {
            registroMsg.textContent = authError
              ? "Pedido enviado. Aguarde a aprovação do admin."
              : "Conta criada e pedido enviado. Aguarde a aprovação do admin.";
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
