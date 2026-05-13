import re

def process_file():
    with open('c:\\Users\\aluno\\Documents\\GM_Deporto\\sql\\raw_insert.txt', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    out_lines = []
    
    in_gabinete = False
    
    for line in lines:
        if line.startswith('- -'):
            line = line.replace('- - ', '-- ')
        
        # Replace headers
        if '(edf_de, descricao, quantidade, stock, empresa_data, estado,' in line:
            line = '(edf_de, descricao, quantidade, stock, empresa_data, estado,\n'
        elif 'estado_bom, estado_razoavel, estado_mau, estado_abate,' in line:
            line = 'estado_bom, estado_razoavel, estado_mau, estado_abate,\n'
        elif 'local, observacao, outras_observacao, categoria_id, escola, escola_id)' in line:
            line = 'local, observacao, outras_observacao, categoria, escola)\n'
            in_gabinete = False
        elif '(edf_de, descricao, quantidade, stock, estado, local, categoria_id, escola, escola_id)' in line:
            line = '(edf_de, descricao, quantidade, stock, estado, local, categoria, escola)\n'
            in_gabinete = True
            
        # Replace categoria subquery with just the text value
        if '(SELECT id FROM public.categoria' in line:
            line = re.sub(r"\(SELECT id FROM public\.categoria WHERE nome = '([^']+)'\)", r"'\1'", line)
            
        # Remove escola_id subquery completely
        if '(SELECT id FROM public.escola' in line:
            line = re.sub(r",\s*\(SELECT id FROM public\.escola WHERE sigla = '[^']+'\)", "", line)
        else:
            # If there's no escola subquery, there might be a trailing NULL for escola_id at the end of the tuple.
            if re.search(r",\s*NULL\s*\)\s*[,;]?\s*$", line):
                line = re.sub(r",\s*NULL(\s*\)\s*[,;]?\s*)$", r"\1", line)
                
        out_lines.append(line)

    with open('c:\\Users\\aluno\\Documents\\GM_Deporto\\sql\\import_fixo.sql', 'w', encoding='utf-8') as f:
        f.writelines(out_lines)

if __name__ == '__main__':
    process_file()
