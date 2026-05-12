let equipamentosCache = [];
let localFiltroAtual = 'todos';
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

function filtrarEquipamentos(local = 'todos', termoPesquisa = '') {
  let lista = equipamentosCache;

  if (local !== 'todos') {
    lista = lista.filter(eq => eq.local === local);
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

function renderizarEquipamentos(local = 'todos', termoPesquisa = '') {
  const tbody = document.getElementById('inventarioProfBody');
  if (!tbody) return;

  const equipamentos = filtrarEquipamentos(local, termoPesquisa);

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
  btnPrev.onclick = () => {
    currentPage--;
    renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual);
    document.getElementById("inventarioProf").scrollIntoView({ behavior: "smooth" });
  };
  container.appendChild(btnPrev);

  const info = document.createElement("span");
  info.className = "pagination-info";
  info.textContent = `Página ${currentPage} de ${totalPages}`;
  container.appendChild(info);

  const btnNext = document.createElement("button");
  btnNext.className = "pagination-btn";
  btnNext.textContent = "Próxima";
  btnNext.disabled = currentPage === totalPages;
  btnNext.onclick = () => {
    currentPage++;
    renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual);
    document.getElementById("inventarioProf").scrollIntoView({ behavior: "smooth" });
  };
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

document.addEventListener('DOMContentLoaded', async () => {
  window.GMApp?.wireRouteLinks();

  // Se não tiver acesso professor, redireciona
  if (!window.GMApp?.hasAccess('professor')) {
    window.GMApp?.goTo('adminInventory');
    return;
  }

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
      renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual);
    });
  }

  if (pesquisaInventarioProf) {
    pesquisaInventarioProf.addEventListener('input', () => {
      termoPesquisaAtual = pesquisaInventarioProf.value.trim();
      currentPage = 1; // Reset para a primeira página ao pesquisar
      renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual);
    });
  }

  await popularFiltroLocalProfessor();

  // Carregar equipamentos
  await carregarEquipamentosSupabase();

  // Renderizar equipamentos com filtros padrão
  renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual);
});
