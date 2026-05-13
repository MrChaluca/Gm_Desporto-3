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

function renderizarLocais(termo = '') {
  const tbody = document.getElementById('locaisTableBody');
  if (!tbody) return;

  const termoLimpo = String(termo || '').trim().toLowerCase();
  
  const locaisFiltrados = locaisCache.filter(local => {
    if (!termoLimpo) return true;
    const nome = String(local.nome || '').toLowerCase();
    const descricao = String(local.descricao || '').toLowerCase();
    return nome.includes(termoLimpo) || descricao.includes(termoLimpo);
  });

  if (locaisFiltrados.length === 0) {
    tbody.innerHTML = `
      <tr class="inventory-empty-row">
        <td colspan="4">Nenhum local registado ou encontrado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = locaisFiltrados
    .map(local => `
      <tr class="inventory-row">
        <td data-label="Nome">${local.nome || '-'}</td>
        <td data-label="Descrição">${local.descricao || '-'}</td>
        <td data-label="Última alteração">
          <span
            class="locais-date-badge"
            data-updated-at="${local.updated_at || local.created_at || ''}"
            title="${new Date(local.updated_at || local.created_at || '').toLocaleString('pt-PT')}"
          >
            ${formatarTempoRelativo(local.updated_at || local.created_at)}
          </span>
        </td>
        <td data-label="Ações">
          <button type="button" class="btn-ghost small" style="margin-right:4px;" data-action="editar" data-id="${local.id}">Editar</button>
          <button type="button" class="inventory-btn-delete" style="font-size: 0.8rem; padding: 4px 8px; border-radius: 999px; cursor: pointer; border: 1px solid #c0212a; background: transparent; color: #c0212a;" data-action="apagar" data-id="${local.id}">Apagar</button>
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

function abrirModalLocal(id = null) {
  limparErros();
  const form = document.getElementById('locaisForm');
  const modal = document.getElementById('modalLocal');
  const title = document.getElementById('modalLocalTitle');
  const subtitle = document.getElementById('modalLocalSubtitle');

  form.reset();
  
  if (id) {
    const local = locaisCache.find(l => l.id == id);
    if (local) {
      document.getElementById('localId').value = local.id;
      document.getElementById('localNome').value = local.nome || '';
      document.getElementById('localDescricao').value = local.descricao || '';
      title.textContent = 'Editar Local';
      subtitle.textContent = 'Altere as informações do local selecionado.';
    }
  } else {
    document.getElementById('localId').value = '';
    title.textContent = 'Adicionar Local';
    subtitle.textContent = 'Preencha os dados do novo local.';
  }
  
  modal.classList.remove('hidden');
}

function fecharModalLocal() {
  const modal = document.getElementById('modalLocal');
  if (modal) modal.classList.add('hidden');
}

async function apagarLocal(id) {
  if (!confirm('Tem a certeza que deseja apagar este local?')) return;
  try {
    const { error } = await supabaseClient
      .from('locais')
      .delete()
      .eq('id', id);
      
    if (error) {
      if (error.message.includes('foreign key constraint')) {
         mostrarToast('Não é possível apagar locais que têm equipamentos associados.', 'error');
         return;
      }
      throw error;
    }
    mostrarToast('Local apagado com sucesso', 'success');
    window.GMApp?.logAdminAction?.({
      nome: `Local #${id}`,
      acao: 'local apagado',
      detalhes: '',
    });
    await carregarLocaisSupabase();
    renderizarLocais(document.getElementById('pesquisaLocais')?.value);
  } catch(error) {
    console.error('Erro ao apagar local:', error);
    mostrarToast('Erro ao apagar o local.', 'error');
  }
}

async function guardarLocal(id, nome, descricao) {
  if (!nome.trim()) {
    document.getElementById('localNomeError').textContent = 'Nome é obrigatório';
    return false;
  }

  limparErros();

  try {
    if (id) {
      // Editar
      const { error } = await supabaseClient
        .from('locais')
        .update({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      mostrarToast('Local atualizado com sucesso', 'success');
      window.GMApp?.logAdminAction?.({
        nome: nome.trim(),
        acao: 'local atualizado',
        detalhes: descricao.trim() || '',
      });
    } else {
      // Adicionar
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
          return false;
        }
        throw error;
      }
      mostrarToast('Local adicionado com sucesso', 'success');
      window.GMApp?.logAdminAction?.({
        nome: nome.trim(),
        acao: 'local adicionado',
        detalhes: descricao.trim() || '',
      });
    }

    fecharModalLocal();
    await carregarLocaisSupabase();
    renderizarLocais(document.getElementById('pesquisaLocais')?.value);
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
  window.GMApp?.setupMenuToggle('btnMenuToggle', 'mainMenu');

  // Se não for admin, redireciona
  if (!window.GMApp?.redirectUnlessRole('admin')) return;

  // Pesquisa
  const pesquisaLocais = document.getElementById('pesquisaLocais');
  if (pesquisaLocais) {
    pesquisaLocais.addEventListener('input', (e) => {
      renderizarLocais(e.target.value);
    });
  }

  // Modal actions
  const btnNovoLocal = document.getElementById('btnNovoLocal');
  if (btnNovoLocal) {
    btnNovoLocal.addEventListener('click', () => abrirModalLocal());
  }

  const btnFecharModal = document.getElementById('btnFecharModalLocal');
  const btnCancelarModal = document.getElementById('btnCancelarLocal');
  if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModalLocal);
  if (btnCancelarModal) btnCancelarModal.addEventListener('click', fecharModalLocal);

  // Setup formulário
  const locaisForm = document.getElementById('locaisForm');
  if (locaisForm) {
    locaisForm.addEventListener('submit', async e => {
      e.preventDefault();
      const id = document.getElementById('localId').value;
      const nome = document.getElementById('localNome').value;
      const descricao = document.getElementById('localDescricao').value;
      await guardarLocal(id, nome, descricao);
    });
  }

  // Tabela clicks para editar e apagar
  const locaisTableBody = document.getElementById('locaisTableBody');
  if (locaisTableBody) {
    locaisTableBody.addEventListener('click', e => {
      const target = e.target;
      if (!target || !target.dataset) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!action || !id) return;
      
      if (action === 'editar') {
        abrirModalLocal(id);
      } else if (action === 'apagar') {
        apagarLocal(id);
      }
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
          renderizarLocais(document.getElementById('pesquisaLocais')?.value);
        }
      )
      .subscribe();
  }
});
