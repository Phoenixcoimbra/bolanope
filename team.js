// ===============================
// 1. SUPABASE CONFIG
// ===============================
const SUPABASE_URL = 'https://ecucdtbdwybbrsoebpxm.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_PUBLISHABLE_KEY';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// 2. HELPERS
// ===============================
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
    if (!dateString) return 'Data por definir';

    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function isPlayedMatch(fixture) {
    return fixture.home_score !== null && fixture.away_score !== null;
}

// ===============================
// 3. LOAD TEAM
// ===============================
async function loadTeamPage() {
    const slug = getSlugFromUrl();

    if (!slug) {
        document.getElementById('team-name').textContent = 'Equipa não encontrada';
        document.getElementById('team-description').textContent = 'Falta o parâmetro slug no URL.';
        return;
    }

    const { data: team, error: teamError } = await supabaseClient
        .from('teams')
        .select('*')
        .eq('slug', slug)
        .single();

    if (teamError || !team) {
        console.error('Erro ao carregar equipa:', teamError);
        document.getElementById('team-name').textContent = 'Equipa não encontrada';
        document.getElementById('team-description').textContent = 'Não foi possível carregar esta equipa.';
        return;
    }

    document.title = `${team.name} | Low Hall League`;
    document.getElementById('team-name').textContent = team.name;
    document.getElementById('team-description').textContent =
        team.description || 'Sem descrição disponível para esta equipa.';

    await Promise.all([
        loadPlayers(team.id),
        loadFixtures(team.id, team.name)
    ]);
}

// ===============================
// 4. LOAD PLAYERS
// ===============================
async function loadPlayers(teamId) {
    const tableBody = document.getElementById('roster-table-body');

    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="p-4 text-sm text-gray-500">A carregar plantel...</td>
        </tr>
    `;

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
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="p-4 text-red-600 font-bold">Erro ao carregar jogadores.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = '';

    if (!players || players.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="p-4 text-gray-500">Ainda não existem jogadores registados para esta equipa.</td>
            </tr>
        `;

        document.getElementById('summary-players').textContent = '0';
        document.getElementById('summary-goals').textContent = '0';
        document.getElementById('summary-yellow').textContent = '0';
        document.getElementById('summary-red').textContent = '0';

        return;
    }

    let totalGoals = 0;
    let totalYellow = 0;
    let totalRed = 0;

    players.forEach(player => {
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

    document.getElementById('summary-players').textContent = players.length;
    document.getElementById('summary-goals').textContent = totalGoals;
    document.getElementById('summary-yellow').textContent = totalYellow;
    document.getElementById('summary-red').textContent = totalRed;

    renderPlayerHighlights(players);
}

// ===============================
// 5. PLAYER HIGHLIGHTS
// ===============================
function renderPlayerHighlights(players) {
    const topScorer = [...players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    const mostYellow = [...players].sort((a, b) => (b.yellow_cards ?? 0) - (a.yellow_cards ?? 0))[0];
    const mostRed = [...players].sort((a, b) => (b.red_cards ?? 0) - (a.red_cards ?? 0))[0];

    document.getElementById('top-scorer-name').textContent = topScorer?.name || '—';
    document.getElementById('top-scorer-goals').textContent = `${topScorer?.goals ?? 0} golos`;

    document.getElementById('most-yellow-name').textContent = mostYellow?.name || '—';
    document.getElementById('most-yellow-count').textContent = `${mostYellow?.yellow_cards ?? 0} cartões amarelos`;

    document.getElementById('most-red-name').textContent = mostRed?.name || '—';
    document.getElementById('most-red-count').textContent = `${mostRed?.red_cards ?? 0} cartões vermelhos`;
}

// ===============================
// 6. LOAD TEAM FIXTURES
// ===============================
async function loadFixtures(teamId, teamName) {
    const fixturesList = document.getElementById('team-fixtures-list');
    fixturesList.innerHTML = '<p class="text-sm text-gray-500">A carregar jogos...</p>';

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
            away_team:away_team_id ( id, name ),
            rest_team:rest_team_id ( id, name )
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('match_date', { ascending: true })
        .order('jornada', { ascending: true });

    if (error) {
        console.error('Erro ao carregar jogos da equipa:', error);
        fixturesList.innerHTML = '<p class="text-red-600 font-bold">Erro ao carregar jogos.</p>';
        return;
    }

    fixturesList.innerHTML = '';

    if (!fixtures || fixtures.length === 0) {
        fixturesList.innerHTML = '<p class="text-gray-500">Ainda não existem jogos para esta equipa.</p>';
        return;
    }

    fixtures.forEach(fixture => {
        const homeName = fixture.home_team?.name || 'Equipa Casa';
        const awayName = fixture.away_team?.name || 'Equipa Fora';

        const isHomeTeam = homeName === teamName;
        const isAwayTeam = awayName === teamName;

        let resultLabel = 'Por jogar';
        let resultClass = 'bg-gray-100 text-gray-600';

        if (isPlayedMatch(fixture)) {
            const homeScore = fixture.home_score;
            const awayScore = fixture.away_score;

            if ((isHomeTeam && homeScore > awayScore) || (isAwayTeam && awayScore > homeScore)) {
                resultLabel = 'Vitória';
                resultClass = 'bg-green-100 text-green-700';
            } else if (homeScore === awayScore) {
                resultLabel = 'Empate';
                resultClass = 'bg-yellow-100 text-yellow-700';
            } else {
                resultLabel = 'Derrota';
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

// ===============================
// 7. INIT
// ===============================
document.addEventListener('DOMContentLoaded', async () => {
    await loadTeamPage();
});