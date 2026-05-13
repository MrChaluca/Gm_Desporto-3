window.GMApp = (() => {
  const DUAL_ROLE_EMAILS = ["profadimin@gmail.com", "profadmin@gmail.com"];
  const DUAL_ROLE_FLAG_KEY = "gm_desporto_dual_role";

  const routes = {
    login: "index.html",
    adminInventory: "principal.html",
    adminMembers: "membros.html",
    adminUsage: "relatados.html",
    adminReports: "relatos.html",
    adminLocations: "locais.html",
    adminAbates: "abates.html",
    profReports: "professores.html",
    profUsage: "professores_relatados.html",
    profInventory: "professores_inventario.html",
    profLocations: "professores_locais.html",
    userProfile: "perfil.html",
  };

  function route(key) {
    return routes[key] || routes.login;
  }

  function goTo(key, hash = "") {
    const target = route(key);
    window.location.href = hash ? `${target}${hash}` : target;
  }

  function setupMenuToggle(buttonId, menuId) {
    const button = document.getElementById(buttonId);
    const menu = document.getElementById(menuId);
    if (!button || !menu) return;

    menu.classList.add("hidden");
    button.setAttribute("aria-expanded", "false");
    if (button.dataset.menuBound === "1") return;

    button.dataset.menuBound = "1";
    button.addEventListener("click", () => {
      menu.classList.toggle("hidden");
      const isOpen = !menu.classList.contains("hidden");
      button.classList.toggle("is-menu-open", isOpen);
      button.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) markActiveLink();
    });

    markActiveLink();
    window.addEventListener("hashchange", markActiveLink);

    mountRoleSwitchButton();
    mountProfileButton();
  }

  /**
   * Evita ciclo principal.html ↔ professores.html quando não há sessão
   * (email/papel em falta): envia para index em vez de alternar entre áreas.
   */
  function redirectUnlessRole(requiredRole) {
    if (hasAccess(requiredRole)) return true;
    if (requiredRole === "admin") {
      if (hasAccess("professor")) {
        goTo("profReports");
        return false;
      }
      window.location.href = routes.login;
      return false;
    }
    if (requiredRole === "professor") {
      if (hasAccess("admin")) {
        goTo("adminInventory");
        return false;
      }
      window.location.href = routes.login;
      return false;
    }
    window.location.href = routes.login;
    return false;
  }

  function requireRole(expectedRole, redirectRouteKey) {
    if (!hasAccess(expectedRole)) {
      goTo(redirectRouteKey);
      return false;
    }
    return true;
  }

  function redirectIfRole(roleToRedirect, routeKey) {
    if (hasAccess(roleToRedirect)) {
      goTo(routeKey);
      return true;
    }
    return false;
  }

  function getCurrentRole() {
    return String(localStorage.getItem("gm_desporto_role") || "");
  }

  function getCurrentEmail() {
    return String(localStorage.getItem("gm_desporto_user_email") || "").toLowerCase();
  }

  function setDualRole(enabled) {
    localStorage.setItem(DUAL_ROLE_FLAG_KEY, enabled ? "1" : "0");
  }

  function getDualRoleFlag() {
    return localStorage.getItem(DUAL_ROLE_FLAG_KEY) === "1";
  }

  function isDualRoleAccount(email = getCurrentEmail()) {
    const safeEmail = String(email || "").toLowerCase();
    return getDualRoleFlag() || getCurrentRole() === "admin" || DUAL_ROLE_EMAILS.includes(safeEmail);
  }

  function hasAccess(role) {
    const currentRole = getCurrentRole();
    if (currentRole === role) return true;
    if (!isDualRoleAccount()) return false;
    return role === "admin" || role === "professor";
  }

  function getDefaultRouteForRole(role) {
    return role === "admin" ? "adminInventory" : "profReports";
  }

  function switchRole(nextRole) {
    const role = nextRole === "admin" ? "admin" : "professor";
    localStorage.setItem("gm_desporto_role", role);
    goTo(getDefaultRouteForRole(role));
  }

  function mountRoleSwitchButton() {
    if (!isDualRoleAccount()) return;

    const topRight = document.querySelector(".top-right");
    if (!topRight) return;

    if (topRight.querySelector('[data-role-switch="1"]')) return;

    const currentRole = getCurrentRole();
    const nextRole = currentRole === "admin" ? "professor" : "admin";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-back-top";
    btn.dataset.roleSwitch = "1";
    btn.textContent = nextRole === "admin" ? "Alternar para Admin" : "Alternar para Professor";
    btn.addEventListener("click", () => switchRole(nextRole));

    topRight.insertBefore(btn, topRight.firstChild);
  }

  async function editProfile() {
    const currentEmail = getCurrentEmail();
    if (!currentEmail) {
      window.alert("Não foi possível identificar a conta atual.");
      return;
    }

    const newName = window.prompt("Novo nome (opcional):", "") ?? "";
    const newEmailRaw = window.prompt("Novo email da conta:", currentEmail);
    if (newEmailRaw === null) return;

    const newEmail = String(newEmailRaw || "").trim().toLowerCase();
    if (!newEmail || !newEmail.includes("@")) {
      window.alert("Email inválido.");
      return;
    }

    try {
      if (typeof supabaseClient !== "undefined") {
        const updatePayload = { email: newEmail };
        if (String(newName || "").trim()) updatePayload.nome = String(newName).trim();

        await supabaseClient.from("membros").update(updatePayload).eq("email", currentEmail);
        await supabaseClient
          .from("solicitacoes_registo")
          .update(updatePayload)
          .eq("email", currentEmail);
      }

      localStorage.setItem("gm_desporto_user_email", newEmail);
      window.alert("Perfil atualizado com sucesso.");
    } catch (e) {
      console.error(e);
      window.alert("Não foi possível atualizar o perfil.");
    }
  }

  function mountProfileButton() {
    if (window.location.pathname.endsWith("index.html")) return;
    if (window.location.pathname.endsWith("perfil.html")) return;
    if (!getCurrentEmail()) return;

    const topRight = document.querySelector(".top-right");
    if (!topRight) return;
    if (topRight.querySelector('[data-profile-edit="1"]')) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-back-top";
    btn.dataset.profileEdit = "1";
    btn.textContent = "Editar perfil";
    btn.addEventListener("click", () => {
      window.location.href = routes.userProfile;
    });

    topRight.insertBefore(btn, topRight.firstChild);
  }

  function wireRouteLinks(root = document) {
    root.querySelectorAll("[data-route]").forEach((el) => {
      const key = el.dataset.route;
      const hash = el.dataset.hash || "";
      if (!key || !routes[key]) return;
      const href = hash ? `${routes[key]}${hash}` : routes[key];
      if (el.tagName === "A") el.setAttribute("href", href);
    });
  }

  function markActiveLink() {
    const fullPath = window.location.pathname;
    const currentPath = fullPath.split("/").pop() || "index.html";
    const currentHash = window.location.hash || "";

    document.querySelectorAll(".main-menu a").forEach((link) => {
      const href = link.getAttribute("href") || "";
      link.classList.remove("active");

      // Se estivermos na principal.html, prioridade ao hash
      if (currentPath === "principal.html") {
        if (currentHash) {
          if (href.includes(currentHash)) {
            link.classList.add("active");
          }
        } else {
          // Se não houver hash na URL, o link do dashboard é o ativo por defeito
          if (href === "#dashboard" || href === "principal.html#dashboard") {
            link.classList.add("active");
          }
        }
      } else {
        // Em outras páginas, comparamos o nome do ficheiro
        if (href.includes(currentPath) && !href.includes("#")) {
          link.classList.add("active");
        }
      }
    });
  }

  function logAdminAction({ nome = "", acao = "", detalhes = "" } = {}) {
    try {
      const key = "gm_desporto_historico";
      const raw = localStorage.getItem(key);
      const historico = raw ? JSON.parse(raw) : [];
      const lista = Array.isArray(historico) ? historico : [];
      const registo = {
        id: Date.now(),
        nome: nome || "Admin",
        nome_item: nome || "Admin",
        acao: acao || "ação",
        detalhes: detalhes || "",
        adminEmail: getCurrentEmail(),
        admin_email: getCurrentEmail(),
        dataHora: new Date().toISOString(),
      };
      lista.push(registo);
      localStorage.setItem(key, JSON.stringify(lista));

      if (typeof supabaseClient !== "undefined") {
        supabaseClient
          .from("historico_acoes")
          .insert([
            {
              client_id: String(registo.id),
              nome_item: registo.nome_item,
              acao: registo.acao,
              detalhes: registo.detalhes,
              admin_email: registo.admin_email || null,
              data_hora: registo.dataHora,
            },
          ])
          .then(({ error }) => {
            if (error) console.warn("Histórico na BD indisponível.", error);
          });
      }
    } catch (e) {
      console.warn("Não foi possível registar no histórico.", e);
    }
  }

  return {
    routes,
    route,
    goTo,
    setupMenuToggle,
    hasAccess,
    isDualRoleAccount,
    setDualRole,
    switchRole,
    mountRoleSwitchButton,
    mountProfileButton,
    editProfile,
    getCurrentEmail,
    getCurrentRole,
    requireRole,
    redirectIfRole,
    redirectUnlessRole,
    wireRouteLinks,
    markActiveLink,
    logAdminAction,
  };
})();
