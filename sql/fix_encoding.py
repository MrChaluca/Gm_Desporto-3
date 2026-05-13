import sys

def fix_text(text):
    replacements = {
        "Educaǜo": "Educação",
        "Fsica": "Física",
        "Secretǭria": "Secretária",
        "Ginǭsio": "Ginásio",
        "Sinalizaǜo": "Sinalização",
        "Cronmetro": "Cronómetro",
        "memrias": "memórias",
        "trǦs": "três",
        "1 ": "1º ",
        "1s": "1ºs",
        "n5": "nº5",
        "sintǸtico": "sintético",
        "Iniciaǜo": "Iniciação",
        "Competiǜo": "Competição",
        "vǭrias": "várias",
        "s": "às",
        "extenses": "extensões",
        "Frigorfico": "Frigorífico",
        "cortia": "cortiça",
        "Mobiliǭrio": "Mobiliário",
        "Nataǜo": "Natação",
        "Condiǜo": "Condição",
        "Estǜo": "Estão",
        "nǜo": "não",
        "Lees": "Leões",
        "sǜo": "são",
        "?\"": "—", # The dash thing "EQUIPAMENTOS ?" Gabinete" -> EQUIPAMENTOS — Gabinete
    }
    
    for bad, good in replacements.items():
        text = text.replace(bad, good)
    return text

if __name__ == '__main__':
    with open(r'c:\Users\aluno\Documents\GM_Deporto\sql\import_fixo.sql', 'r', encoding='utf-8') as f:
        content = f.read()
        
    fixed = fix_text(content)
    
    with open(r'c:\Users\aluno\Documents\GM_Deporto\sql\import_fixo.sql', 'w', encoding='utf-8') as f:
        f.write(fixed)
