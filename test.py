import sys

def test_fix(s):
    try:
        return s.encode('cp1252').decode('utf-8')
    except Exception as e:
        return f"ERROR: {e}"

words = ['EducaÃ§Ã£o', 'FÃ­sica', 'SecretÃ¡ria', 'Âº', 'Ã', 'Ã¡', 'Ã£']
for w in words:
    fixed = test_fix(w)
    print(f'{w} -> {fixed}')
