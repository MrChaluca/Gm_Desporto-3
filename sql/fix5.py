import re

def process_file():
    with open('c:\\Users\\aluno\\Documents\\GM_Deporto\\sql\\raw_insert.txt', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    final_lines = []
    in_cat_block = False
    for l in lines:
        if l.startswith('- -'):
            l = l.replace('- - ', '-- ')
            
        if l.strip() == "-- 3. CATEGORIAS":
            in_cat_block = True
            continue
        if in_cat_block:
            if l.strip() == "ON CONFLICT (nome) DO NOTHING;":
                in_cat_block = False
            continue
        
        # apply regex
        if '(edf_de, descricao, quantidade, stock, empresa_data, estado,' in l:
            l = '(edf_de, descricao, quantidade, stock, empresa_data, estado,\n'
        elif 'estado_bom, estado_razoavel, estado_mau, estado_abate,' in l:
            l = 'estado_bom, estado_razoavel, estado_mau, estado_abate,\n'
        elif 'local, observacao, outras_observacao, categoria_id, escola, escola_id)' in l:
            l = 'local, observacao, outras_observacao, escola)\n'
        elif '(edf_de, descricao, quantidade, stock, estado, local, categoria_id, escola, escola_id)' in l:
            l = '(edf_de, descricao, quantidade, stock, estado, local, escola)\n'
            
        if '(SELECT id FROM public.categoria' in l:
            l = re.sub(r",\s*\(SELECT id FROM public\.categoria WHERE nome = '[^']+'\)", "", l)
        if '(SELECT id FROM public.escola' in l:
            l = re.sub(r",\s*\(SELECT id FROM public\.escola WHERE sigla = '[^']+'\)", "", l)
        else:
            if re.search(r",\s*NULL\s*\)\s*[,;]?\s*$", l):
                l = re.sub(r",\s*NULL(\s*\)\s*[,;]?\s*)$", r"\1", l)
        
        final_lines.append(l)

    with open('c:\\Users\\aluno\\Documents\\GM_Deporto\\sql\\import_fixo.sql', 'w', encoding='utf-8') as f:
        f.writelines(final_lines)

if __name__ == '__main__':
    process_file()
