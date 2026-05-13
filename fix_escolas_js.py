import os

with open('escolas.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix modal references
js = js.replace("getElementById('modalLocal')", "getElementById('modalEscola')")
js = js.replace("getElementById('btnFecharModalLocal')", "getElementById('btnFecharModalEscola')")
js = js.replace("getElementById('btnCancelarLocal')", "getElementById('btnCancelarEscola')")

# Fix data mapping
js = js.replace("local.nome || ''", "local.sigla || ''")
js = js.replace("local.descricao || ''", "local.nome || ''")

# Fix modal titles
js = js.replace("Editar Local", "Editar Escola")
js = js.replace("do local selecionado", "da escola selecionada")
js = js.replace("Adicionar Local", "Adicionar Escola")
js = js.replace("novo local", "nova escola")
js = js.replace("apagar este local", "apagar esta escola")
js = js.replace("apagar o local", "apagar a escola")
js = js.replace("Local apagado", "Escola apagada")

# Fix payload for Supabase insert/update
js = js.replace("async function guardarEscola(id, nome, descricao) {", "async function guardarEscola(id, sigla, nome) {")
js = js.replace("if (!nome.trim()) {", "if (!sigla.trim()) {")
js = js.replace("document.getElementById('escolaSiglaError').textContent = 'Nome é obrigatório';", "document.getElementById('escolaSiglaError').textContent = 'Sigla é obrigatória';")
js = js.replace("          nome: nome.trim(),", "          sigla: sigla.trim(),")
js = js.replace("          descricao: descricao.trim() || null,", "          nome: nome.trim() || null,")
js = js.replace("Este local já existe", "Esta sigla já existe")
js = js.replace("guardar o local", "guardar a escola")

# Event listener parsing
js = js.replace("const nome = document.getElementById('escolaSigla').value;", "const sigla = document.getElementById('escolaSigla').value;")
js = js.replace("const descricao = document.getElementById('escolaNome').value;", "const nome = document.getElementById('escolaNome').value;")
js = js.replace("await guardarEscola(id, nome, descricao);", "await guardarEscola(id, sigla, nome);")

with open('escolas.js', 'w', encoding='utf-8') as f:
    f.write(js)
