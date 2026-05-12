from supabase import create_client, Client
import sys

url = "https://oqqduqakrbhazgpktmyb.supabase.co"
key = "sb_publishable__sliB9KAxI3pF1qDEnHWbQ_w0-gvuO2"

supabase: Client = create_client(url, key)

try:
    response = supabase.table('abates').select('*').limit(1).execute()
    print("Table 'abates' exists.")
except Exception as e:
    print(f"Error or table does not exist: {e}")
