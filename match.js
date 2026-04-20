const SUPABASE_URL = 'https://ecucdtbdwybbrsoebpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LhCp8yCM9qUNeVKGkmF_nw_Hnw9DFst';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentFixtureId = null;
let liveChannel = null;

function safeT(key, fallback = '') {
    try {
        if (typeof t === 'function') return t(key);
    } catch (e) {}
    return fallback || key;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getFixtureIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function formatDate(dateString) {
    if (!dateString) return safeT('date_tbd', 'Data por definir');

    const date = new Date(dateString);
    const lang = typeof getCurrentLang === 'function' && getCurrentLang() === 'en' ? 'en-GB' : 'pt-PT';

    return date.toLocaleDateString(lang, {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function logoHtml(team) {
    const url = team?.logo_url;
    const name = escapeHtml(team?.name || 'Team');

    if (url && String(url).trim() !== '') {
        return `<img src="${escapeHtml(url)}" alt="${name}" class="w-16 h-16 rounded-full object-cover border-4 border-yellow-400 bg-white" />`;
    }

    return `<div class="w-16 h-16 rounded-full border-4 border-yellow-400 bg-white flex items-center justify-center text-[10px] font-black uppercase text-gray-500">Logo</div>`;
}

async function loadMatch() {
    currentFixtureId = getFixtureIdFromUrl();

    if (!currentFixtureId) return;

    const { data: fixture, error } = await supabaseClient
        .from('fixtures')
        .select(`
            id,
            jornada,
            match_date,
            kickoff_time,
            venue,
            minute,
            is_live,
            status,
            home_score,
            away_score,
            home_shots,
            away_shots,
            home_corners,
            away_corners,
            sponsor_name,
            sponsor_logo_url,
            home_team:home_team_id ( id, name, logo_url ),
            away_team:away_team_id ( id, name, logo_url )
        `)
        .eq('id', currentFixtureId)
        .maybeSingle();

    if (error || !fixture) {
        console.error('Erro ao carregar match:', error);
        return;
    }

    renderMatchHeader(fixture);
    await Promise.all([loadGoals(), loadCards()]);
}

function renderMatchHeader(fixture) {
    const homeName = fixture.home_team?.name || 'Home';
    const awayName = fixture.away_team?.name || 'Away';

    document.title = `${homeName} vs ${awayName} | Low Hall League`;

    document.getElementById('home-team-name').textContent = homeName;
    document.getElementById('away-team-name').textContent = awayName;
    document.getElementById('home-score').textContent = fixture.home_score ?? 0;
    document.getElementById('away-score').textContent = fixture.away_score ?? 0;
    document.getElementById('match-minute').textContent = fixture.is_live
        ? `${fixture.minute ?? 0}'`
        : (fixture.status === 'finished' ? 'FT' : `${fixture.kickoff_time || '12:30'}`);
    document.getElementById('match-date').textContent = `${safeT('round_label', 'Jornada')} ${fixture.jornada} • ${formatDate(fixture.match_date)}`;
    document.getElementById('match-venue').textContent = fixture.venue || '—';

    document.getElementById('home-logo-wrap').innerHTML = logoHtml(fixture.home_team);
    document.getElementById('away-logo-wrap').innerHTML = logoHtml(fixture.away_team);

    const badge = document.getElementById('match-status-badge');
    if (fixture.is_live) {
        badge.textContent = safeT('live_badge', 'LIVE');
        badge.className = 'inline-block px-4 py-2 rounded-full bg-red-600 text-xs font-black uppercase tracking-widest mb-4';
    } else if (fixture.status === 'finished') {
        badge.textContent = 'FT';
        badge.className = 'inline-block px-4 py-2 rounded-full bg-black text-xs font-black uppercase tracking-widest mb-4';
    } else {
        badge.textContent = safeT('not_played', 'Por jogar');
        badge.className = 'inline-block px-4 py-2 rounded-full bg-gray-600 text-xs font-black uppercase tracking-widest mb-4';
    }

    document.getElementById('home-shots').textContent = fixture.home_shots ?? 0;
    document.getElementById('away-shots').textContent = fixture.away_shots ?? 0;
    document.getElementById('shots-summary').textContent = `${fixture.home_shots ?? 0} - ${fixture.away_shots ?? 0}`;

    document.getElementById('home-corners').textContent = fixture.home_corners ?? 0;
    document.getElementById('away-corners').textContent = fixture.away_corners ?? 0;
    document.getElementById('corners-summary').textContent = `${fixture.home_corners ?? 0} - ${fixture.away_corners ?? 0}`;

    const sponsorStrip = document.getElementById('sponsor-strip');
    const sponsorName = document.getElementById('sponsor-name');
    const sponsorLogo = document.getElementById('sponsor-logo');

    if (fixture.sponsor_name || fixture.sponsor_logo_url) {
        sponsorStrip.classList.remove('hidden');
        sponsorName.textContent = fixture.sponsor_name || safeT('sponsor_label', 'Sponsor');
        if (fixture.sponsor_logo_url) {
            sponsorLogo.src = fixture.sponsor_logo_url;
            sponsorLogo.classList.remove('hidden');
        } else {
            sponsorLogo.classList.add('hidden');
        }
    } else {
        sponsorStrip.classList.add('hidden');
    }
}

async function loadGoals() {
    const list = document.getElementById('match-goals-list');

    const { data, error } = await supabaseClient
        .from('goals')
        .select(`
            id,
            minute,
            player:player_id ( id, name ),
            team:team_id ( id, name )
        `)
        .eq('fixture_id', currentFixtureId)
        .order('created_at', { ascending: true });

    if (error) {
        list.innerHTML = `<p class="text-sm text-red-600">Erro ao carregar golos.</p>`;
        return;
    }

    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = `<p class="text-sm text-gray-500">${safeT('no_goals_yet', 'Sem golos registados ainda.')}</p>`;
        return;
    }

    data.forEach(goal => {
        list.innerHTML += `
            <div class="border rounded-lg p-4 bg-gray-50 flex justify-between items-center">
                <div>
                    <p class="font-black">${escapeHtml(goal.player?.name || 'Unknown')}</p>
                    <p class="text-xs uppercase text-gray-500">${escapeHtml(goal.team?.name || '')}</p>
                </div>
                <div class="text-sm font-black">${goal.minute ? `${goal.minute}'` : '—'} ⚽</div>
            </div>
        `;
    });
}

async function loadCards() {
    const list = document.getElementById('match-cards-list');

    const { data, error } = await supabaseClient
        .from('cards')
        .select(`
            id,
            minute,
            card_type,
            player:player_id ( id, name ),
            team:team_id ( id, name )
        `)
        .eq('fixture_id', currentFixtureId)
        .order('created_at', { ascending: true });

    if (error) {
        list.innerHTML = `<p class="text-sm text-red-600">Erro ao carregar cartões.</p>`;
        return;
    }

    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = `<p class="text-sm text-gray-500">${safeT('no_cards_yet', 'Sem cartões registados ainda.')}</p>`;
        return;
    }

    data.forEach(card => {
        const badge = card.card_type === 'red'
            ? '🟥'
            : '🟨';

        list.innerHTML += `
            <div class="border rounded-lg p-4 bg-gray-50 flex justify-between items-center">
                <div>
                    <p class="font-black">${escapeHtml(card.player?.name || 'Unknown')}</p>
                    <p class="text-xs uppercase text-gray-500">${escapeHtml(card.team?.name || '')}</p>
                </div>
                <div class="text-sm font-black">${card.minute ? `${card.minute}'` : '—'} ${badge}</div>
            </div>
        `;
    });
}

function setupLiveMatchMode() {
    if (!currentFixtureId) return;

    if (liveChannel) {
        supabaseClient.removeChannel(liveChannel);
    }

    liveChannel = supabaseClient
        .channel(`match-${currentFixtureId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures', filter: `id=eq.${currentFixtureId}` }, loadMatch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `fixture_id=eq.${currentFixtureId}` }, loadMatch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `fixture_id=eq.${currentFixtureId}` }, loadMatch)
        .subscribe();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadMatch();
    setupLiveMatchMode();
});

window.addEventListener('languageChanged', async () => {
    await loadMatch();
});

window.addEventListener('beforeunload', () => {
    if (liveChannel) {
        supabaseClient.removeChannel(liveChannel);
    }
});