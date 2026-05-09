let locaisCache = [];
let refreshTempoInterval = null;

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

function limparErros() {
  document.querySelectorAll('.input-error').forEach(el => (el.textContent = ''));
}

async function carregarLocaisSupabase() {
  if (typeof supabaseClient === 'undefined') {
    console.error('Supabase client não disponível');
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from('locais')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro ao carregar locais:', error);
      throw error;
    }

    locaisCache = data || [];
    return locaisCache;
  } catch (error) {
    console.error('Erro Supabase:', error);
    mostrarToast('Erro ao carregar locais', 'error');
    return [];
  }
}

function formatarTempoRelativo(dataISO) {
  if (!dataISO) return '-';
  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return '-';

  const diffMs = Date.now() - data.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;

  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras} h`;

  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 30) return `há ${diffDias} dia${diffDias > 1 ? 's' : ''}`;

  return data.toLocaleDateString('pt-PT');
}

function renderizarLocais() {
  const tbody = document.getElementById('locaisTableBody');
  if (!tbody) return;

  if (locaisCache.length === 0) {
    tbody.innerHTML = `
      <tr class="inventory-empty-row">
        <td colspan="3">Nenhum local registado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = locaisCache
    .map(local => `
      <tr class="inventory-row">
        <td>${local.nome || '-'}</td>
        <td>${local.descricao || '-'}</td>
        <td>
          <span
            class="locais-date-badge"
            data-updated-at="${local.updated_at || local.created_at || ''}"
            title="${new Date(local.updated_at || local.created_at || '').toLocaleString('pt-PT')}"
          >
            ${formatarTempoRelativo(local.updated_at || local.created_at)}
          </span>
        </td>
      </tr>
    `)
    .join('');
}

function atualizarSomenteTemposTabela() {
  document.querySelectorAll('.locais-date-badge').forEach(el => {
    const dataIso = el.getAttribute('data-updated-at');
    if (!dataIso) return;
    el.textContent = formatarTempoRelativo(dataIso);
  });
}

function iniciarRelogioTemposLocais() {
  if (refreshTempoInterval) clearInterval(refreshTempoInterval);
  refreshTempoInterval = setInterval(() => {
    atualizarSomenteTemposTabela();
  }, 30000);
}

async function guardarLocal(nome, descricao) {
  if (!nome.trim()) {
    document.getElementById('localNomeError').textContent = 'Nome é obrigatório';
    return false;
  }

  limparErros();

  try {
    // Adicionar novo local
    const { error } = await supabaseClient
      .from('locais')
      .insert([
        {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
        },
      ]);

    if (error) {
      if (error.message.includes('Duplicate') || error.message.includes('unique')) {
        document.getElementById('localNomeError').textContent = 'Este local já existe';
      } else {
        throw error;
      }
      return false;
    }

    mostrarToast('Local adicionado com sucesso', 'success');
    document.getElementById('locaisForm').reset();

    // Recarregar locais
    await carregarLocaisSupabase();
    renderizarLocais();
    return true;
  } catch (error) {
    console.error('Erro ao guardar local:', error);
    document.getElementById('locaisFormError').textContent =
      'Não foi possível guardar o local. Tente novamente.';
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  window.GMApp?.wireRouteLinks();
  window.GMApp?.setupMenuToggle('btnMenuToggleAdmin', 'mainMenuAdmin');

  // Se não for admin, redireciona
  if (!window.GMApp?.hasAccess('admin')) {
    window.location.href = 'index.html';
    return;
  }

  // Setup formulário
  const locaisForm = document.getElementById('locaisForm');

  if (locaisForm) {
    locaisForm.addEventListener('submit', async e => {
      e.preventDefault();
      const nome = document.getElementById('localNome').value;
      const descricao = document.getElementById('localDescricao').value;
      await guardarLocal(nome, descricao);
    });
  }

  // Carregar locais
  await carregarLocaisSupabase();
  renderizarLocais();
  iniciarRelogioTemposLocais();

  if (typeof supabaseClient !== 'undefined') {
    supabaseClient
      .channel('locais-admin-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locais' },
        async () => {
          await carregarLocaisSupabase();
          renderizarLocais();
        }
      )
      .subscribe();
  }
});
