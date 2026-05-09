from supabase import create_client, Client

url = "https://oqqduqakrbhazgpktmyb.supabase.co"
key = "sb_publishable__sliB9KAxI3pF1qDEnHWbQ_w0-gvuO2"

supabase: Client = create_client(url, key)

# Query locais
print("Locais:")
response = supabase.table('locais').select('*').execute()
print(response.data)

# Query estados
print("\nEstados:")
response = supabase.table('estados').select('*').execute()
print(response.data)

# Query equipamentos
print("\nEquipamentos:")
response = supabase.table('equipamentos').select('*').execute()
print(response.data)