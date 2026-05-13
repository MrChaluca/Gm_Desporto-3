let equipamentosCache = [];
let localFiltroAtual = 'todos';
let escolaFiltroAtual = 'todos';
let termoPesquisaAtual = '';

// Paginação
let currentPage = 1;
const itemsPerPage = 10;

async function carregarEquipamentosSupabase() {
  if (typeof supabaseClient === 'undefined') {
    console.error('Supabase client não disponível');
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from('equipamentos')
      .select('*')
      .order('local')
      .order('descricao');

    if (error) {
      console.error('Erro ao carregar equipamentos:', error);
      throw error;
    }

    equipamentosCache = data || [];
    return equipamentosCache;
  } catch (error) {
    console.error('Erro Supabase:', error);
    mostrarToast('Não foi possível carregar equipamentos.', 'error');
    return [];
  }
}

function formatarData(dataISO) {
  if (!dataISO) return '-';
  try {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-PT');
  } catch {
    return dataISO;
  }
}

async function carregarLocaisSupabase() {
  if (typeof supabaseClient === 'undefined') return [];

  const { data, error } = await supabaseClient
    .from('locais')
    .select('*')
    .order('nome');

  if (error) {
    console.error('Erro ao carregar locais:', error);
    return [];
  }

  return data || [];
}

function filtrarEquipamentos(local = 'todos', termoPesquisa = '', filtroEscola = 'todos') {
  let lista = equipamentosCache;

  if (local !== 'todos') {
    lista = lista.filter(eq => eq.local === local);
  }

  if (filtroEscola !== 'todos') {
    lista = lista.filter(eq => String(eq.escola || '').trim() === filtroEscola);
  }

  const termo = String(termoPesquisa || '').trim().toLowerCase();
  if (!termo) return lista;

  return lista.filter(eq => {
    const descricao = String(eq.descricao || '').toLowerCase();
    const localNome = String(eq.local || '').toLowerCase();
    const observacao = String(eq.observacao || '').toLowerCase();
    const outrasObs = String(eq.outras_observacao || '').toLowerCase();
    const empresaData = String(eq.empresa_data || '').toLowerCase();
    const edfDe = String(eq.edf_de || '').toLowerCase();
    const escola = String(eq.escola || '').toLowerCase();

    return (
      descricao.includes(termo) ||
      localNome.includes(termo) ||
      observacao.includes(termo) ||
      outrasObs.includes(termo) ||
      empresaData.includes(termo) ||
      edfDe.includes(termo) ||
      escola.includes(termo)
    );
  });
}

function mapEstadoLegado(eq, nomeEstado) {
  if (!eq.estado) return '-';
  return eq.estado === nomeEstado ? (eq.quantidade || 0) : '-';
}

function renderizarEquipamentos(local = 'todos', termoPesquisa = '', filtroEscola = 'todos') {
  const tbody = document.getElementById('inventarioProfBody');
  if (!tbody) return;

  const equipamentos = filtrarEquipamentos(local, termoPesquisa, filtroEscola);

  if (equipamentos.length === 0) {
    const temPesquisa = String(termoPesquisa || '').trim().length > 0;
    tbody.innerHTML = `
      <tr class="inventory-empty-row">
        <td colspan="13">${
          temPesquisa
            ? `Nenhum equipamento corresponde à pesquisa "${termoPesquisa}"${local !== 'todos' ? ` no local ${local}` : ''}.`
            : local === 'todos'
              ? 'Ainda não existem equipamentos registados.'
              : `Nenhum equipamento encontrado no local ${local}.`
        }</td>
      </tr>
    `;
    renderPaginationControlsProf(0);
    return;
  }

  // Paginação
  const totalItems = equipamentos.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const itemsToShow = equipamentos.slice(startIndex, startIndex + itemsPerPage);

  tbody.innerHTML = itemsToShow
    .map(eq => `
      <tr class="inventory-row">
        <td data-label="Escola">${eq.escola || 'GM'}</td>
        <td data-label="EDF/DE">${eq.edf_de || '-'}</td>
        <td data-label="Descrição">${eq.descricao || '-'}</td>
        <td data-label="Quantidade" class="text-center">${eq.quantidade || 0}</td>
        <td data-label="Stock" class="text-center">${eq.stock !== null ? eq.stock : 0}</td>
        <td data-label="Empresa/Data">${eq.empresa_data || '-'}</td>
        <td data-label="Bom">${eq.estado_bom ?? mapEstadoLegado(eq, 'Bom')}</td>
        <td data-label="Razoável">${eq.estado_razoavel ?? mapEstadoLegado(eq, 'Razoável')}</td>
        <td data-label="Mau">${eq.estado_mau ?? mapEstadoLegado(eq, 'Mau')}</td>
        <td data-label="Abate">${eq.estado_abate ?? mapEstadoLegado(eq, 'Abate')}</td>
        <td data-label="Local">${eq.local || '-'}</td>
        <td data-label="Observação">${eq.observacao || '-'}</td>
        <td data-label="Outras Observações">${eq.outras_observacao || '-'}</td>
      </tr>
    `)
    .join('');

  renderPaginationControlsProf(totalItems);
}

function goToPageProf(page, totalPages) {
  let nextPage = Number(page);
  if (!Number.isFinite(nextPage)) return;
  if (nextPage < 1) nextPage = 1;
  if (nextPage > totalPages) nextPage = totalPages;
  if (nextPage === currentPage) return;
  currentPage = nextPage;
  renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual, escolaFiltroAtual);
  document.getElementById("inventarioProf").scrollIntoView({ behavior: "smooth" });
}

function renderPaginationControlsProf(totalItems) {
  const container = document.getElementById("paginationControls");
  if (!container) return;
  container.innerHTML = "";

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return;

  const btnPrev = document.createElement("button");
  btnPrev.className = "pagination-btn";
  btnPrev.textContent = "Anterior";
  btnPrev.disabled = currentPage === 1;
  btnPrev.onclick = () => goToPageProf(currentPage - 1, totalPages);
  container.appendChild(btnPrev);

  const info = document.createElement("span");
  info.className = "pagination-info";
  info.textContent = `Página ${currentPage} de ${totalPages}`;
  container.appendChild(info);

  const jumpWrapper = document.createElement("span");
  jumpWrapper.className = "pagination-jump";

  const pageInput = document.createElement("input");
  pageInput.type = "number";
  pageInput.min = "1";
  pageInput.max = String(totalPages);
  pageInput.value = String(currentPage);
  pageInput.className = "pagination-input";
  pageInput.title = "Ir para página";
  pageInput.setAttribute("aria-label", "Número da página");

  const btnGo = document.createElement("button");
  btnGo.type = "button";
  btnGo.className = "pagination-btn";
  btnGo.textContent = "Ir";
  btnGo.onclick = () => goToPageProf(pageInput.value, totalPages);

  jumpWrapper.appendChild(pageInput);
  jumpWrapper.appendChild(btnGo);
  container.appendChild(jumpWrapper);

  const btnNext = document.createElement("button");
  btnNext.className = "pagination-btn";
  btnNext.textContent = "Próxima";
  btnNext.disabled = currentPage === totalPages;
  btnNext.onclick = () => goToPageProf(currentPage + 1, totalPages);
  container.appendChild(btnNext);
}

function mostrarToast(texto, tipo = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = texto;
  toast.className = 'toast ' + tipo + ' show';

  if (mostrarToast._timeoutId) {
    clearTimeout(mostrarToast._timeoutId);
  }
  mostrarToast._timeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

async function popularFiltroLocalProfessor() {
  const filtroLocal = document.getElementById('filtroLocalProf');
  if (!filtroLocal) return;

  filtroLocal.innerHTML = '<option value="todos">Todos os locais</option>';

  let locais = [];
  try {
    locais = await carregarLocaisSupabase();
  } catch {
    locais = [];
  }

  const nomesLocais = locais
    .map(local => local.nome)
    .filter(nome => nome && nome.trim())
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort();

  nomesLocais.forEach(nome => {
    const option = document.createElement('option');
    option.value = nome;
    option.textContent = nome;
    filtroLocal.appendChild(option);
  });
}

async function popularFiltroEscolaProfessor() {
  const filtroEscola = document.getElementById('filtroEscolaProf');
  if (!filtroEscola) return;

  filtroEscola.innerHTML = '<option value="todos">Todas as escolas</option>';

  if (equipamentosCache.length === 0) {
    await carregarEquipamentosSupabase();
  }

  const nomesEscolas = (equipamentosCache || [])
    .map(item => item.escola)
    .filter(escola => escola && escola.trim())
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort();

  nomesEscolas.forEach(escola => {
    const option = document.createElement('option');
    option.value = escola;
    option.textContent = escola;
    filtroEscola.appendChild(option);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  window.GMApp?.wireRouteLinks();

  // Se não tiver acesso professor, redireciona
  if (!window.GMApp?.redirectUnlessRole('professor')) return;

  // Setup botões de menu
  const btnMenuToggleProf = document.getElementById('btnMenuToggleProf');
  const mainMenuProf = document.getElementById('mainMenuProf');

  window.GMApp?.setupMenuToggle('btnMenuToggleProf', 'mainMenuProf');
  if (btnMenuToggleProf && mainMenuProf) {
    // Fechar menu ao clicar num link
    mainMenuProf.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mainMenuProf.classList.add('hidden');
        btnMenuToggleProf.classList.remove('is-menu-open');
        btnMenuToggleProf.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const pesquisaInventarioProf = document.getElementById('pesquisaInventarioProf');
  const filtroLocalProf = document.getElementById('filtroLocalProf');

  if (filtroLocalProf) {
    filtroLocalProf.addEventListener('change', () => {
      localFiltroAtual = filtroLocalProf.value || 'todos';
      currentPage = 1; // Reset para a primeira página ao filtrar
      renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual, escolaFiltroAtual);
    });
  }

  const filtroEscolaProf = document.getElementById('filtroEscolaProf');
  if (filtroEscolaProf) {
    filtroEscolaProf.addEventListener('change', () => {
      escolaFiltroAtual = filtroEscolaProf.value || 'todos';
      currentPage = 1; // Reset para a primeira página ao filtrar
      renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual, escolaFiltroAtual);
    });
  }

  if (pesquisaInventarioProf) {
    pesquisaInventarioProf.addEventListener('input', () => {
      termoPesquisaAtual = pesquisaInventarioProf.value.trim();
      currentPage = 1; // Reset para a primeira página ao pesquisar
      renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual, escolaFiltroAtual);
    });
  }

  await popularFiltroLocalProfessor();
  await popularFiltroEscolaProfessor();

  // Renderizar equipamentos com filtros padrão
  renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual, escolaFiltroAtual);
});
