window.GMApp = (() => {
  const DUAL_ROLE_EMAILS = ["profadimin@gmail.com"];
  const DUAL_ROLE_FLAG_KEY = "gm_desporto_dual_role";

  const routes = {
    login: "index.html",
    adminInventory: "principal.html",
    adminMembers: "membros.html",
    adminUsage: "relatados.html",
    adminReports: "relatos.html",
    adminLocations: "locais.html",
    profReports: "professores.html",
    profUsage: "professores_relatados.html",
    profInventory: "professores_inventario.html",
    profLocations: "professores_locais.html",
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
    });

    mountRoleSwitchButton();
    mountProfileButton();
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
      editProfile();
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
    wireRouteLinks,
  };
})();
