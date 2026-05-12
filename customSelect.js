function renderCustomSelect(selectEl) {
  if (selectEl.dataset.customized === "true") return;
  selectEl.dataset.customized = "true";

  // Esconder visualmente o select original mas manter acessível para validação
  selectEl.style.position = "absolute";
  selectEl.style.opacity = "0";
  selectEl.style.pointerEvents = "none";
  selectEl.style.width = "1px";
  selectEl.style.height = "1px";
  selectEl.style.border = "none";
  selectEl.style.margin = "0";
  selectEl.style.padding = "0";
  selectEl.tabIndex = -1;

  const wrapper = document.createElement("div");
  wrapper.className = "custom-select-wrapper";
  wrapper.style.position = "relative";
  wrapper.style.width = "100%";

  const displayValue = document.createElement("div");
  displayValue.className = "custom-select-display";

  const dropdown = document.createElement("div");
  dropdown.className = "autocomplete-list hidden";

  wrapper.appendChild(displayValue);
  wrapper.appendChild(dropdown);

  // Inserir o novo wrapper imediatamente após o select nativo
  selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);

  // Atualizar o display baseado no valor original
  function updateDisplay() {
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    if (selectedOption) {
      displayValue.textContent = selectedOption.text;
      if (selectEl.value) {
        displayValue.style.color = "#8b0000";
        displayValue.style.fontWeight = "600";
      } else {
        displayValue.style.color = "";
        displayValue.style.fontWeight = "";
      }
    } else {
      displayValue.textContent = "Selecione...";
      displayValue.style.color = "";
      displayValue.style.fontWeight = "";
    }
  }

  // Renderizar as opções dentro do dropdown
  function renderOptions() {
    dropdown.innerHTML = "";
    Array.from(selectEl.options).forEach((opt, index) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = opt.text;
      div.addEventListener("click", (e) => {
        e.stopPropagation();
        selectEl.selectedIndex = index;
        updateDisplay();
        selectEl.dispatchEvent(new Event("change"));
        dropdown.classList.add("hidden");
      });
      dropdown.appendChild(div);
    });
  }

  renderOptions();
  updateDisplay();

  // Abrir e fechar
  displayValue.addEventListener("click", (e) => {
    e.stopPropagation();
    // Fecha todos os outros abertos na página
    document.querySelectorAll(".custom-select-wrapper .autocomplete-list").forEach(el => {
      if (el !== dropdown) el.classList.add("hidden");
    });
    dropdown.classList.toggle("hidden");
  });

  // Fechar ao clicar fora
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  // Reagir a mudanças feitas via JS no select original
  selectEl.addEventListener("change", () => {
    updateDisplay();
  });

  // Observar mudanças no DOM (quando options são inseridas dinamicamente)
  const observer = new MutationObserver(() => {
    renderOptions();
    updateDisplay();
  });
  observer.observe(selectEl, { childList: true });
}

function initAllCustomSelects() {
  document.querySelectorAll("select").forEach(sel => {
    renderCustomSelect(sel);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAllCustomSelects();
});
