const SUPABASE_URL = 'https://ecucdtbdwybbrsoebpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LhCp8yCM9qUNeVKGkmF_nw_Hnw9DFst';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function setMessage(message, isError = false) {
  const el = document.getElementById('login-message');
  el.textContent = message;
  el.className = `mt-4 text-sm font-bold text-center ${isError ? 'text-red-600' : 'text-green-600'}`;
}

async function checkSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) return;
  if (data.session) window.location.href = 'admin.html';
}

async function login(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setMessage(error.message, true);
    return;
  }

  window.location.href = 'admin.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('login-form')?.addEventListener('submit', login);
  await checkSession();
});