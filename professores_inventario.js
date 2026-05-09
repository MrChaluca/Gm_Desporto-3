let equipamentosCache = [];
let localFiltroAtual = 'todos';
let termoPesquisaAtual = '';

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

    return (
      descricao.includes(termo) ||
      localNome.includes(termo) ||
      observacao.includes(termo) ||
      outrasObs.includes(termo) ||
      empresaData.includes(termo) ||
      edfDe.includes(termo)
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
        <td colspan="12">${
          temPesquisa
            ? `Nenhum equipamento corresponde à pesquisa "${termoPesquisa}"${local !== 'todos' ? ` no local ${local}` : ''}.`
            : local === 'todos'
              ? 'Ainda não existem equipamentos registados.'
              : `Nenhum equipamento encontrado no local ${local}.`
        }</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = equipamentos
    .map(eq => `
      <tr class="inventory-row">
        <td>${eq.edf_de || '-'}</td>
        <td>${eq.descricao || '-'}</td>
        <td class="text-center">${eq.quantidade || 0}</td>
        <td class="text-center">${eq.stock !== null ? eq.stock : 0}</td>
        <td>${eq.empresa_data || '-'}</td>
        <td>${eq.estado_bom ?? mapEstadoLegado(eq, 'Bom')}</td>
        <td>${eq.estado_razoavel ?? mapEstadoLegado(eq, 'Razoável')}</td>
        <td>${eq.estado_mau ?? mapEstadoLegado(eq, 'Mau')}</td>
        <td>${eq.estado_abate ?? mapEstadoLegado(eq, 'Abate')}</td>
        <td>${eq.local || '-'}</td>
        <td>${eq.observacao || '-'}</td>
        <td>${eq.outras_observacao || '-'}</td>
      </tr>
    `)
    .join('');
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
      renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual);
    });
  }

  if (pesquisaInventarioProf) {
    pesquisaInventarioProf.addEventListener('input', () => {
      termoPesquisaAtual = pesquisaInventarioProf.value.trim();
      renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual);
    });
  }

  await popularFiltroLocalProfessor();

  // Carregar equipamentos
  await carregarEquipamentosSupabase();

  // Renderizar equipamentos com filtros padrão
  renderizarEquipamentos(localFiltroAtual, termoPesquisaAtual);
});
