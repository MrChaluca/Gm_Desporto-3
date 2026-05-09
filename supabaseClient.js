// Inicialização do Supabase para o site GM_Desporto
// NÃO colocar esta chave em repositórios públicos.

const SUPABASE_URL = "https://oqqduqakrbhazgpktmyb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__sliB9KAxI3pF1qDEnHWbQ_w0-gvuO2";

// Usamos o SDK carregado via CDN (window.supabase)
const __SUPABASE_SETUP_HELP__ =
  'Abra o site via servidor (ex.: "http://localhost:5173/principal.html"), não por "file:///...".';

let supabaseClient;
try {
  if (typeof window === "undefined") {
    // ignore
  } else if (window.location?.protocol === "file:") {
    console.error("[GM Desporto] Supabase bloqueado em file://.", __SUPABASE_SETUP_HELP__);
  } else if (!window.supabase?.createClient) {
    console.error(
      "[GM Desporto] SDK do Supabase não carregou. Verifique a tag do CDN antes de 'supabaseClient.js'."
    );
  } else {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error("[GM Desporto] Falha ao inicializar Supabase.", e);
}

// Função de ajuda para testes rápidos no browser (F12 → Console)
async function testeSupabase() {
  if (typeof supabaseClient === "undefined") {
    console.error("[GM Desporto] supabaseClient indisponível.", __SUPABASE_SETUP_HELP__);
    return;
  }
  const { data, error } = await supabaseClient.from('equipamentos').select('*');
  if (error) {
    console.error('Erro Supabase:', error.message);
    return;
  }
  console.log('Equipamentos (Supabase):', data);
}

