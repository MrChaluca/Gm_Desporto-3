let escolasCache = [];
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

async function carregarEscolasSupabase() {
  if (typeof supabaseClient === 'undefined') {
    console.error('Supabase client não disponível');
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from('escola')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro ao carregar escolas:', error);
      throw error;
    }

    escolasCache = data || [];
    return escolasCache;
  } catch (error) {
    console.error('Erro Supabase:', error);
    mostrarToast('Erro ao carregar escolas', 'error');
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

function renderizarEscolas(termo = '') {
  const tbody = document.getElementById('escolasTableBody');
  if (!tbody) return;

  const termoLimpo = String(termo || '').trim().toLowerCase();
  
  const escolasFiltradas = escolasCache.filter(escola => {
    if (!termoLimpo) return true;
    const sigla = String(escola.sigla || '').toLowerCase();
    const nome = String(escola.nome || '').toLowerCase();
    return sigla.includes(termoLimpo) || nome.includes(termoLimpo);
  });

  if (escolasFiltradas.length === 0) {
    tbody.innerHTML = `
      <tr class="inventory-empty-row">
        <td colspan="4">Nenhuma escola registada ou encontrada.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = escolasFiltradas
    .map(escola => `
      <tr class="inventory-row">
        <td data-label="Sigla">${escola.sigla || '-'}</td>
        <td data-label="Nome da Escola">${escola.nome || '-'}</td>
        <td data-label="Última alteração">
          <span
            class="escolas-date-badge"
            data-updated-at="${escola.updated_at || escola.created_at || ''}"
            title="${new Date(escola.updated_at || escola.created_at || '').toLocaleString('pt-PT')}"
          >
            ${formatarTempoRelativo(escola.updated_at || escola.created_at)}
          </span>
        </td>
        <td data-label="Ações">
          <button type="button" class="btn-ghost small" style="margin-right:4px;" data-action="editar" data-id="${escola.id}">Editar</button>
          <button type="button" class="inventory-btn-delete" style="font-size: 0.8rem; padding: 4px 8px; border-radius: 999px; cursor: pointer; border: 1px solid #c0212a; background: transparent; color: #c0212a;" data-action="apagar" data-id="${escola.id}">Apagar</button>
        </td>
      </tr>
    `)
    .join('');
}

function atualizarSomenteTemposTabela() {
  document.querySelectorAll('.escolas-date-badge').forEach(el => {
    const dataIso = el.getAttribute('data-updated-at');
    if (!dataIso) return;
    el.textContent = formatarTempoRelativo(dataIso);
  });
}

function iniciarRelogioTemposEscolas() {
  if (refreshTempoInterval) clearInterval(refreshTempoInterval);
  refreshTempoInterval = setInterval(() => {
    atualizarSomenteTemposTabela();
  }, 30000);
}

function abrirModalEscola(id = null) {
  limparErros();
  const form = document.getElementById('escolasForm');
  const modal = document.getElementById('modalEscola');
  const title = document.getElementById('modalEscolaTitle');
  const subtitle = document.getElementById('modalEscolaSubtitle');

  form.reset();
  
  if (id) {
    const escola = escolasCache.find(l => l.id == id);
    if (escola) {
      document.getElementById('escolaId').value = escola.id;
      document.getElementById('escolaSigla').value = escola.sigla || '';
      document.getElementById('escolaNome').value = escola.nome || '';
      title.textContent = 'Editar Escola';
      subtitle.textContent = 'Altere as informações da escola selecionada.';
    }
  } else {
    document.getElementById('escolaId').value = '';
    title.textContent = 'Adicionar Escola';
    subtitle.textContent = 'Preencha os dados da nova escola.';
  }
  
  modal.classList.remove('hidden');
}

function fecharModalEscola() {
  const modal = document.getElementById('modalEscola');
  if (modal) modal.classList.add('hidden');
}

async function apagarEscola(id) {
  if (!confirm('Tem a certeza que deseja apagar esta escola?')) return;
  try {
    const { error } = await supabaseClient
      .from('escola')
      .delete()
      .eq('id', id);
      
    if (error) {
      if (error.message.includes('foreign key constraint')) {
         mostrarToast('Não é possível apagar escolas que têm equipamentos associados.', 'error');
         return;
      }
      throw error;
    }
    mostrarToast('Escola apagada com sucesso', 'success');
    window.GMApp?.logAdminAction?.({
      nome: `Escola #${id}`,
      acao: 'escola apagada',
      detalhes: '',
    });
    await carregarEscolasSupabase();
    renderizarEscolas(document.getElementById('pesquisaEscolas')?.value);
  } catch(error) {
    console.error('Erro ao apagar escola:', error);
    mostrarToast('Erro ao apagar a escola.', 'error');
  }
}

async function guardarEscola(id, sigla, nome) {
  if (!sigla.trim()) {
    document.getElementById('escolaSiglaError').textContent = 'Sigla é obrigatória';
    return false;
  }

  limparErros();

  try {
    if (id) {
      // Editar
      const { error } = await supabaseClient
        .from('escola')
        .update({
          sigla: sigla.trim(),
          nome: nome.trim() || null
        })
        .eq('id', id);

      if (error) throw error;
      mostrarToast('Escola atualizada com sucesso', 'success');
      window.GMApp?.logAdminAction?.({
        nome: sigla.trim(),
        acao: 'escola atualizada',
        detalhes: nome.trim() || '',
      });
    } else {
      // Adicionar
      const { error } = await supabaseClient
        .from('escola')
        .insert([
          {
            sigla: sigla.trim(),
            nome: nome.trim() || null,
          },
        ]);

      if (error) {
        if (error.message.includes('Duplicate') || error.message.includes('unique')) {
          document.getElementById('escolaSiglaError').textContent = 'Esta sigla já existe';
          return false;
        }
        throw error;
      }
      mostrarToast('Escola adicionada com sucesso', 'success');
      window.GMApp?.logAdminAction?.({
        nome: sigla.trim(),
        acao: 'escola adicionada',
        detalhes: nome.trim() || '',
      });
    }

    fecharModalEscola();
    await carregarEscolasSupabase();
    renderizarEscolas(document.getElementById('pesquisaEscolas')?.value);
    return true;
  } catch (error) {
    console.error('Erro ao guardar escola:', error);
    document.getElementById('escolasFormError').textContent =
      'Não foi possível guardar a escola. Tente novamente.';
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  window.GMApp?.wireRouteLinks();
  window.GMApp?.setupMenuToggle('btnMenuToggle', 'mainMenu');

  // Se não for admin, redireciona
  if (!window.GMApp?.redirectUnlessRole('admin')) return;

  // Pesquisa
  const pesquisaEscolas = document.getElementById('pesquisaEscolas');
  if (pesquisaEscolas) {
    pesquisaEscolas.addEventListener('input', (e) => {
      renderizarEscolas(e.target.value);
    });
  }

  // Modal actions
  const btnNovaEscola = document.getElementById('btnNovaEscola');
  if (btnNovaEscola) {
    btnNovaEscola.addEventListener('click', () => abrirModalEscola());
  }

  const btnFecharModal = document.getElementById('btnFecharModalEscola');
  const btnCancelarModal = document.getElementById('btnCancelarEscola');
  if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModalEscola);
  if (btnCancelarModal) btnCancelarModal.addEventListener('click', fecharModalEscola);

  // Setup formulário
  const escolasForm = document.getElementById('escolasForm');
  if (escolasForm) {
    escolasForm.addEventListener('submit', async e => {
      e.preventDefault();
      const id = document.getElementById('escolaId').value;
      const sigla = document.getElementById('escolaSigla').value;
      const nome = document.getElementById('escolaNome').value;
      await guardarEscola(id, sigla, nome);
    });
  }

  // Tabela clicks para editar e apagar
  const escolasTableBody = document.getElementById('escolasTableBody');
  if (escolasTableBody) {
    escolasTableBody.addEventListener('click', e => {
      const target = e.target;
      if (!target || !target.dataset) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!action || !id) return;
      
      if (action === 'editar') {
        abrirModalEscola(id);
      } else if (action === 'apagar') {
        apagarEscola(id);
      }
    });
  }

  // Carregar escolas
  await carregarEscolasSupabase();
  renderizarEscolas();
  iniciarRelogioTemposEscolas();

  if (typeof supabaseClient !== 'undefined') {
    supabaseClient
      .channel('escolas-admin-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escola' },
        async () => {
          await carregarEscolasSupabase();
          renderizarEscolas(document.getElementById('pesquisaEscolas')?.value);
        }
      )
      .subscribe();
  }
});
