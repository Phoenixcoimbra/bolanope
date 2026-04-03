const SUPABASE_URL = 'https://ecucdtbdwybbrsoebpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LhCp8yCM9qUNeVKGkmF_nw_Hnw9DFst';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentTeam = null;
let currentPlayers = [];
let currentFixtures = [];

function getSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('slug');
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

function formatDate(dateString) {
    if (!dateString) return t('date_tbd');

    const date = new Date(dateString);
    const lang = getCurrentLang() === 'en' ? 'en-GB' : 'pt-PT';

    return date.toLocaleDateString(lang, {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function isPlayedMatch(fixture) {
    return fixture.home_score !== null && fixture.away_score !== null;
}

function renderTeamNotFound(message) {
    document.getElementById('team-name').textContent = t('no_team_found');
    document.getElementById('team-description').textContent = message;
    document.getElementById('team-tagline').textContent = t('verify_team_link');
}

function loadTeamLogo(logoUrl, teamName) {
    const img = document.getElementById('team-logo');
    const placeholder = document.getElementById('team-logo-placeholder');

    if (logoUrl && String(logoUrl).trim() !== '') {
        img.src = logoUrl;
        img.alt = `Logo ${teamName}`;
        img.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

async function loadTeamPage() {
    const slug = getSlugFromUrl();

    if (!slug) {
        renderTeamNotFound(t('missing_team_slug'));
        return;
    }

    const { data: team, error: teamError } = await supabaseClient
        .from('teams')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (teamError) {
        console.error('Erro ao carregar equipa:', teamError);
        renderTeamNotFound(t('team_not_loaded'));
        return;
    }

    if (!team) {
        renderTeamNotFound(t('no_team_found'));
        return;
    }

    currentTeam = team;
    document.title = `${team.name} | Low Hall League`;
    renderTeamHeader();

    await Promise.all([
        loadPlayers(team.id),
        loadFixtures(team.id, team.name)
    ]);
}

function renderTeamHeader() {
    if (!currentTeam) return;

    document.getElementById('team-name').textContent = currentTeam.name;
    document.getElementById('team-description').textContent =
        currentTeam.description || t('no_team_description');
    document.getElementById('team-tagline').textContent = t('team_tagline');

    loadTeamLogo(currentTeam.logo_url, currentTeam.name);
}

async function loadPlayers(teamId) {
    const tableBody = document.getElementById('roster-table-body');

    tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-sm text-gray-500">${t('roster_loading')}</td></tr>`;

    const { data: players, error } = await supabaseClient
        .from('players')
        .select(`
            id,
            name,
            number,
            position,
            goals,
            yellow_cards,
            red_cards,
            games_played
        `)
        .eq('team_id', teamId)
        .order('number', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

    if (error) {
        console.error('Erro ao carregar jogadores:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-red-600 font-bold">${t('no_players_registered')}</td></tr>`;
        return;
    }

    currentPlayers = players || [];
    renderPlayers();
}

function renderPlayers() {
    const tableBody = document.getElementById('roster-table-body');
    tableBody.innerHTML = '';

    if (!currentPlayers.length) {
        tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-gray-500">${t('no_players_registered')}</td></tr>`;
        document.getElementById('summary-players').textContent = '0';
        document.getElementById('summary-goals').textContent = '0';
        document.getElementById('summary-yellow').textContent = '0';
        document.getElementById('summary-red').textContent = '0';
        renderPlayerHighlights([]);
        return;
    }

    let totalGoals = 0;
    let totalYellow = 0;
    let totalRed = 0;

    currentPlayers.forEach(player => {
        const goals = player.goals ?? 0;
        const yellow = player.yellow_cards ?? 0;
        const red = player.red_cards ?? 0;
        const gamesPlayed = player.games_played ?? 0;

        totalGoals += goals;
        totalYellow += yellow;
        totalRed += red;

        tableBody.innerHTML += `
            <tr class="border-b border-gray-200 hover:bg-red-50 transition-colors">
                <td class="p-4 text-sm font-bold uppercase">${escapeHtml(player.name)}</td>
                <td class="p-4 text-center text-sm">${player.number ?? '-'}</td>
                <td class="p-4 text-center text-sm">${escapeHtml(player.position || '-')}</td>
                <td class="p-4 text-center text-sm">${gamesPlayed}</td>
                <td class="p-4 text-center text-sm font-black text-green-600">${goals}</td>
                <td class="p-4 text-center text-sm">${yellow}</td>
                <td class="p-4 text-center text-sm">${red}</td>
            </tr>
        `;
    });

    document.getElementById('summary-players').textContent = currentPlayers.length;
    document.getElementById('summary-goals').textContent = totalGoals;
    document.getElementById('summary-yellow').textContent = totalYellow;
    document.getElementById('summary-red').textContent = totalRed;

    renderPlayerHighlights(currentPlayers);
}

function renderPlayerHighlights(players) {
    const topScorer = [...players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    const mostYellow = [...players].sort((a, b) => (b.yellow_cards ?? 0) - (a.yellow_cards ?? 0))[0];
    const mostRed = [...players].sort((a, b) => (b.red_cards ?? 0) - (a.red_cards ?? 0))[0];

    document.getElementById('top-scorer-name').textContent = topScorer?.name || '—';
    document.getElementById('top-scorer-goals').textContent = `${topScorer?.goals ?? 0} ${t('goals_label')}`;

    document.getElementById('most-yellow-name').textContent = mostYellow?.name || '—';
    document.getElementById('most-yellow-count').textContent = `${mostYellow?.yellow_cards ?? 0} ${t('yellow_cards_label')}`;

    document.getElementById('most-red-name').textContent = mostRed?.name || '—';
    document.getElementById('most-red-count').textContent = `${mostRed?.red_cards ?? 0} ${t('red_cards_label')}`;
}

async function loadFixtures(teamId, teamName) {
    const fixturesList = document.getElementById('team-fixtures-list');
    fixturesList.innerHTML = `<p class="text-sm text-gray-500">${t('team_matches_loading')}</p>`;

    const { data: fixtures, error } = await supabaseClient
        .from('fixtures')
        .select(`
            id,
            jornada,
            match_date,
            home_score,
            away_score,
            status,
            home_team:home_team_id ( id, name ),
            away_team:away_team_id ( id, name )
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('match_date', { ascending: true })
        .order('jornada', { ascending: true });

    if (error) {
        console.error('Erro ao carregar jogos da equipa:', error);
        fixturesList.innerHTML = `<p class="text-red-600 font-bold">${t('no_team_matches')}</p>`;
        return;
    }

    currentFixtures = fixtures || [];
    renderFixtures(teamName);
}

function renderFixtures(teamName) {
    const fixturesList = document.getElementById('team-fixtures-list');
    fixturesList.innerHTML = '';

    if (!currentFixtures.length) {
        fixturesList.innerHTML = `<p class="text-gray-500">${t('no_team_matches')}</p>`;
        return;
    }

    currentFixtures.forEach(fixture => {
        const homeName = fixture.home_team?.name || 'Home';
        const awayName = fixture.away_team?.name || 'Away';

        const isHomeTeam = homeName === teamName;
        const isAwayTeam = awayName === teamName;

        let resultLabel = t('not_played');
        let resultClass = 'bg-gray-100 text-gray-600';

        if (isPlayedMatch(fixture)) {
            const homeScore = fixture.home_score;
            const awayScore = fixture.away_score;

            if ((isHomeTeam && homeScore > awayScore) || (isAwayTeam && awayScore > homeScore)) {
                resultLabel = t('win');
                resultClass = 'bg-green-100 text-green-700';
            } else if (homeScore === awayScore) {
                resultLabel = t('draw');
                resultClass = 'bg-yellow-100 text-yellow-700';
            } else {
                resultLabel = t('loss');
                resultClass = 'bg-red-100 text-red-700';
            }
        }

        fixturesList.innerHTML += `
            <div class="bg-white rounded-xl shadow border-l-4 border-l-red-600 p-5">
                <div class="flex justify-between items-start gap-4 mb-3">
                    <div>
                        <p class="text-xs uppercase font-black text-gray-500">Jornada ${fixture.jornada}</p>
                        <p class="text-sm font-bold text-gray-700">${formatDate(fixture.match_date)}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-black uppercase ${resultClass}">
                        ${resultLabel}
                    </span>
                </div>

                <div class="text-lg font-black italic uppercase flex items-center justify-between gap-3">
                    <span class="${isHomeTeam ? 'text-red-600' : ''}">${escapeHtml(homeName)}</span>
                    <span class="bg-black text-white px-3 py-1 rounded text-sm">
                        ${isPlayedMatch(fixture) ? `${fixture.home_score}-${fixture.away_score}` : 'VS'}
                    </span>
                    <span class="${isAwayTeam ? 'text-red-600' : ''}">${escapeHtml(awayName)}</span>
                </div>
            </div>
        `;
    });
}

function rerenderLanguageSensitiveContent() {
    applyTranslations();

    if (currentTeam) {
        renderTeamHeader();
    }

    renderPlayers();

    if (currentTeam) {
        renderFixtures(currentTeam.name);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadTeamPage();
});

window.addEventListener('languageChanged', rerenderLanguageSensitiveContent);