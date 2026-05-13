import sys

def fix_encoding():
    path = r'c:\Users\aluno\Documents\GM_Deporto\sql\import_fixo.sql'
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # The text contains double-encoded utf-8.
    # To fix it, we try to encode it as cp1252 and decode as utf-8.
    # But some parts of the text might NOT be double-encoded, or might have characters not in cp1252.
    # A safer approach is to replace known bad sequences.
    
    replacements = {
        "EducaÃ§Ã£o": "Educação",
        "FÃ­sica": "Física",
        "SecretÃ¡ria": "Secretária",
        "GinÃ¡sio": "Ginásio",
        "SinalizaÃ§Ã£o": "Sinalização",
        "CronÃ³metro": "Cronómetro",
        "memÃ³rias": "memórias",
        "trÃªs": "três",
        "nÂº": "nº",
        "Âº": "º",
        "1Âºs": "1ºs",
        "sintÃ©tico": "sintético",
        "IniciaÃ§Ã£o": "Iniciação",
        "CompetiÃ§Ã£o": "Competição",
        "vÃ¡rias": "várias",
        "Ã s": "às",
        "ExtensÃµes": "Extensões",
        "FrigorÃ­fico": "Frigorífico",
        "cortiÃ§a": "cortiça",
        "MobiliÃ¡rio": "Mobiliário",
        "NataÃ§Ã£o": "Natação",
        "CondiÃ§Ã£o": "Condição",
        "EstÃ£o": "Estão",
        "nÃ£o": "não",
        "LeÃµes": "Leões",
        "sÃ£o": "são",
        "Ãºnico": "único",
        "tÃ©nis": "ténis",
        "tÃ©nnis": "ténis",
        "tÃ¡buas": "tábuas",
        "sublimaÃ§Ã£o": "sublimação",
        "substituiÃ§Ã£o": "substituição",
        "salmÃ£o": "salmão",
        "reforÃ§ados": "reforçados",
        "pressÃ£o": "pressão",
        "preÃ§o": "preço",
        "pavilhÃ£o": "pavilhão",
        "nÃ­veis": "níveis",
        "mÃ¡quina": "máquina",
        "mÃ©dios": "médios",
        "mÃ©trica": "métrica",
        "magnÃ©sio": "magnésio",
        "lanÃ§ar": "lançar",
        "lanÃ§amento": "lançamento",
        "invÃ¡lidos": "inválidos",
        "indicaÃ§Ã£o": "indicação",
        "impressÃ£o": "impressão",
        "ginÃ¡stica": "ginástica",
        "encontrÃ¡mos": "encontrámos",
        "electrÃ³nico": "electrónico",
        "elÃ¡stico": "elástico",
        "competiÃ§Ã£o": "competição",
        "colchÃ£o": "colchão",
        "colchÃµes": "colchões",
        "cartÃ£o": "cartão",
        "cabeÃ§a": "cabeça",
        "bÃ©bÃ©": "bébé",
        "balanÃ§a": "balança",
        "arÃ§Ãµes": "arções",
        "armaÃ§Ãµes": "armações",
        "ardÃ³sia": "ardósia",
        "aquisiÃ§Ã£o": "aquisição",
        "alumÃ­nio": "alumínio",
        "VortÃ©x": "Vortéx",
        "TÃ©cnica": "Técnica",
        "TravÃ£o": "Travão",
        "SÃ£o": "São",
        "ReversÃ­vel": "Reversível",
        "RazoÃ¡vel": "Razoável",
        "PÃ³lo": "Pólo",
        "NÃ£o": "Não",
        "MÃ©dias": "Médias",
        "MÃ©dio": "Médio",
        "MosquetÃ£o": "Mosquetão",
        "MetÃ¡lico": "Metálico",
        "JÃºnior": "Júnior",
        "InventÃ¡rio": "Inventário",
        "ImpulsÃ£o": "Impulsão",
        "EstadiÃ³metro": "Estadiómetro",
        "CapitÃ£o": "Capitão",
        "CalÃ§Ãµes": "Calções",
        "CalÃ§Ã£o": "Calção",
        "CalÃ§os": "Calços",
        "CalÃ§as": "Calças",
        "BraÃ§adeira": "Braçadeira",
        "BalanÃ§a": "Balança",
        "AssociaÃ§Ã£o": "Associação",
        "ArrecadaÃ§Ã£o": "Arrecadação",
        "ArnÃªs": "Arnês",
        "ArmÃ¡rio": "Armário",
        "AerÃ³bica": "Aeróbica",
        "â€“": "–",
        "â€”": "—",
        "Ã¡": "á",
        "Ã©": "é",
        "Ã­": "í",
        "Ã³": "ó",
        "Ãº": "ú",
        "Ã¢": "â",
        "Ãª": "ê",
        "Ã®": "î",
        "Ã´": "ô",
        "Ã»": "û",
        "Ã£": "ã",
        "Ãµ": "õ",
        "Ã§": "ç",
        "Ã": "À"
    }

    # Before replacing smaller sequences, replace the larger ones
    for bad, good in replacements.items():
        text = text.replace(bad, good)

    # Some additional characters I saw
    text = text.replace('Educaǜo', 'Educação')
    text = text.replace('Fsica', 'Física')
    text = text.replace('Secretǭria', 'Secretária')
    text = text.replace('Ginǭsio', 'Ginásio')
    text = text.replace('Sinalizaǜo', 'Sinalização')
    text = text.replace('Cronmetro', 'Cronómetro')
    text = text.replace('memrias', 'memórias')
    text = text.replace('trǦs', 'três')
    text = text.replace('sintǸtico', 'sintético')
    text = text.replace('Iniciaǜo', 'Iniciação')
    text = text.replace('Competiǜo', 'Competição')
    text = text.replace('vǭrias', 'várias')
    text = text.replace('Frigorfico', 'Frigorífico')
    text = text.replace('cortia', 'cortiça')
    text = text.replace('Mobiliǭrio', 'Mobiliário')
    text = text.replace('Nataǜo', 'Natação')
    text = text.replace('Condiǜo', 'Condição')
    text = text.replace('Estǜo', 'Estão')
    text = text.replace('nǜo', 'não')
    text = text.replace('Lees', 'Leões')
    text = text.replace('sǜo', 'são')
    text = text.replace('Razoǭvel', 'Razoável')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)

if __name__ == '__main__':
    fix_encoding()
