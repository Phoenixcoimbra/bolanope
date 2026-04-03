// ===============================
// 1. SUPABASE CONFIG
// ===============================
const SUPABASE_URL = 'https://ecucdtbdwybbrsoebpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LhCp8yCM9qUNeVKGkmF_nw_Hnw9DFst';

//NEXT_PUBLIC_SUPABASE_URL=https://ecucdtbdwybbrsoebpxm.supabase.co
//NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_LhCp8yCM9qUNeVKGkmF_nw_Hnw9DFst

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// 2. HELPERS
// ===============================
function formatDate(dateString) {
    if (!dateString) return 'Data por definir';

    const date = new Date(dateString);

    return date.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short'
    });
}

function getTodayStart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function isPlayedMatch(fixture) {
    return fixture.home_score !== null && fixture.away_score !== null;
}

function getScoreDisplay(fixture) {
    if (!isPlayedMatch(fixture)) return '';
    return `${fixture.home_score}-${fixture.away_score}`;
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

// ===============================
// 3. FIXTURES
// ===============================
async function loadFixtures() {
    const nextCont = document.getElementById('next-fixture-container');
    const allCont = document.getElementById('all-fixtures-container');

    if (!nextCont || !allCont) return;

    nextCont.innerHTML = '<p class="text-sm text-gray-500">A carregar jogos...</p>';
    allCont.innerHTML = '<p class="text-sm text-gray-500">A carregar calendário...</p>';

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
        .order('jornada', { ascending: true })
        .order('match_date', { ascending: true });

    if (error) {
        console.error('Erro ao carregar jogos:', error);
        nextCont.innerHTML = '<p class="text-red-600 font-bold">Erro ao carregar jogos.</p>';
        allCont.innerHTML = '<p class="text-red-600 font-bold">Erro ao carregar calendário.</p>';
        return;
    }

    nextCont.innerHTML = '';
    allCont.innerHTML = '';

    if (!fixtures || fixtures.length === 0) {
        nextCont.innerHTML = '<p class="text-gray-500">Sem jogos disponíveis.</p>';
        allCont.innerHTML = '<p class="text-gray-500">Sem calendário disponível.</p>';
        return;
    }

    const today = getTodayStart();

    const nextFixture =
        fixtures.find(fixture => {
            const matchDate = new Date(fixture.match_date);
            matchDate.setHours(0, 0, 0, 0);
            return matchDate >= today && !isPlayedMatch(fixture);
        }) || fixtures[0];

    const nextJornada = nextFixture.jornada;
    let currentJornada = null;

    fixtures.forEach(fixture => {
        const homeName = escapeHtml(fixture.home_team?.name || 'Equipa Casa');
        const awayName = escapeHtml(fixture.away_team?.name || 'Equipa Fora');
        const restName = escapeHtml(fixture.rest_team?.name || '—');

        let homeClass = '';
        let awayClass = '';

        if (isPlayedMatch(fixture)) {
            if (fixture.home_score > fixture.away_score) homeClass = 'text-green-600 font-black';
            if (fixture.away_score > fixture.home_score) awayClass = 'text-green-600 font-black';
        }

        const statusHtml = isPlayedMatch(fixture)
            ? `
                <span class="bg-black text-white px-3 py-1 rounded font-black text-sm tracking-widest">
                    ${escapeHtml(getScoreDisplay(fixture))}
                </span>
            `
            : `
                <span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold uppercase">
                    ${escapeHtml(formatDate(fixture.match_date))}
                </span>
            `;

        const cardHtml = `
            <div class="bg-white p-4 rounded shadow-sm border flex justify-between items-center border-l-4 border-l-green-500">
                <div class="text-sm font-bold flex-1">
                    <span class="${homeClass}">${homeName}</span>
                    <span class="text-gray-300 mx-1 text-[10px]">VS</span>
                    <span class="${awayClass}">${awayName}</span>
                </div>
                <div class="ml-4">${statusHtml}</div>
            </div>
        `;

        if (fixture.jornada !== currentJornada) {
            currentJornada = fixture.jornada;

            allCont.innerHTML += `
                <div class="col-span-full mt-6 mb-2">
                    <div class="flex justify-between items-center bg-gray-200 px-4 py-1 rounded shadow-sm">
                        <span class="font-black text-xs uppercase text-gray-700">
                            Jornada ${escapeHtml(fixture.jornada)} — ${escapeHtml(formatDate(fixture.match_date))}
                        </span>
                        <span class="text-[9px] font-bold text-gray-500 uppercase italic">
                            Descansa: ${restName}
                        </span>
                    </div>
                </div>
            `;
        }

        allCont.innerHTML += cardHtml;

        if (fixture.jornada === nextJornada) {
            nextCont.innerHTML += cardHtml;
        }
    });

    if (nextCont.innerHTML.trim() === '') {
        nextCont.innerHTML = '<p class="text-gray-500">Sem próxima jornada disponível.</p>';
    }
}

// ===============================
// 4. LEAGUE TABLE
// ===============================
async function loadLeagueTable() {
    const tableBody = document.getElementById('league-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="p-4 text-sm text-gray-500">A carregar classificação...</td>
        </tr>
    `;

    const { data: teams, error } = await supabaseClient
        .from('teams')
        .select(`
            id,
            name,
            played,
            won,
            drawn,
            lost,
            points,
            goals_for,
            goals_against
        `)
        .order('points', { ascending: false })
        .order('won', { ascending: false })
        .order('goals_for', { ascending: false });

    if (error) {
        console.error('Erro ao carregar classificação:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="p-4 text-red-600 font-bold">Erro ao carregar classificação.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = '';

    if (!teams || teams.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="p-4 text-gray-500">Sem equipas disponíveis.</td>
            </tr>
        `;
        return;
    }

    teams.forEach(team => {
        tableBody.innerHTML += `
            <tr class="border-b border-gray-200 hover:bg-red-50 transition-colors">
                <td class="p-4 text-sm uppercase font-bold">${escapeHtml(team.name)}</td>
                <td class="p-4 text-center text-sm">${team.played ?? 0}</td>
                <td class="p-4 text-center text-sm text-green-600 font-bold">${team.won ?? 0}</td>
                <td class="p-4 text-center text-sm">${team.drawn ?? 0}</td>
                <td class="p-4 text-center text-sm">${team.lost ?? 0}</td>
                <td class="p-4 text-center font-black text-green-600 text-lg">${team.points ?? 0}</td>
            </tr>
        `;
    });
}

// ===============================
// 5. TOP SCORERS
// ===============================
async function loadTopScorers() {
    const scorersList = document.getElementById('top-scorers-list');
    if (!scorersList) return;

    scorersList.innerHTML = '<p class="p-4 text-sm text-gray-500">A carregar marcadores...</p>';

    const { data: players, error } = await supabaseClient
        .from('players')
        .select(`
            id,
            name,
            goals,
            team:team_id ( id, name )
        `)
        .gt('goals', 0)
        .order('goals', { ascending: false })
        .order('name', { ascending: true })
        .limit(10);

    if (error) {
        console.error('Erro ao carregar marcadores:', error);
        scorersList.innerHTML = '<p class="p-4 text-red-600 font-bold">Erro ao carregar marcadores.</p>';
        return;
    }

    scorersList.innerHTML = '';

    if (!players || players.length === 0) {
        scorersList.innerHTML = '<p class="p-4 text-gray-500">Ainda sem marcadores registados.</p>';
        return;
    }

    players.forEach(player => {
        scorersList.innerHTML += `
            <div class="flex justify-between items-center p-4 border-b border-gray-100">
                <div>
                    <p class="font-black text-sm uppercase">${escapeHtml(player.name)}</p>
                    <p class="text-[10px] text-green-600 font-bold uppercase">${escapeHtml(player.team?.name || '')}</p>
                </div>
                <span class="font-black text-2xl italic text-red-600">${player.goals ?? 0}</span>
            </div>
        `;
    });
}

// ===============================
// 6. DISCIPLINE
// ===============================
async function loadDiscipline() {
    const discList = document.getElementById('discipline-list');
    if (!discList) return;

    discList.innerHTML = '<p class="p-4 text-sm text-gray-500">A carregar disciplina...</p>';

    const { data: players, error } = await supabaseClient
        .from('players')
        .select(`
            id,
            name,
            yellow_cards,
            red_cards,
            team:team_id ( id, name )
        `)
        .order('yellow_cards', { ascending: false })
        .order('red_cards', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Erro ao carregar disciplina:', error);
        discList.innerHTML = '<p class="p-4 text-red-600 font-bold">Erro ao carregar disciplina.</p>';
        return;
    }

    const filteredPlayers = (players || []).filter(player => {
        return (player.yellow_cards ?? 0) > 0 || (player.red_cards ?? 0) > 0;
    });

    discList.innerHTML = '';

    if (filteredPlayers.length === 0) {
        discList.innerHTML = '<p class="p-4 text-gray-500">Sem cartões registados.</p>';
        return;
    }

    filteredPlayers.slice(0, 10).forEach(player => {
        const yellow = player.yellow_cards ?? 0;
        const red = player.red_cards ?? 0;
        const fines = (yellow * 5) + (red * 10);

        discList.innerHTML += `
            <div class="flex justify-between items-center p-4 border-b bg-red-50/50">
                <span>
                    <span class="font-bold text-sm">${escapeHtml(player.name)}</span>
                    <small class="block text-red-500 font-bold italic text-[10px] uppercase">
                        ${escapeHtml(player.team?.name || '')} • Multas: £${fines}
                    </small>
                </span>
                <span class="font-bold text-sm">🟨 ${yellow} 🟥 ${red}</span>
            </div>
        `;
    });
}

// ===============================
// 7. TAB CONTROLLER
// ===============================
function showTab(tab) {
    const nextCont = document.getElementById('next-fixture-container');
    const allCont = document.getElementById('all-fixtures-container');
    const btnNext = document.getElementById('btn-next');
    const btnAll = document.getElementById('btn-all');

    if (!nextCont || !allCont || !btnNext || !btnAll) return;

    if (tab === 'next') {
        nextCont.classList.remove('hidden');
        allCont.classList.add('hidden');

        btnNext.className =
            'px-6 py-2 rounded font-black text-xs uppercase bg-red-600 text-white border-b-4 border-red-800 active:border-b-0 transition-all';

        btnAll.className =
            'px-6 py-2 rounded font-black text-xs uppercase bg-gray-300 text-gray-700 border-b-4 border-gray-400 active:border-b-0 transition-all';
    } else {
        allCont.classList.remove('hidden');
        nextCont.classList.add('hidden');

        btnAll.className =
            'px-6 py-2 rounded font-black text-xs uppercase bg-red-600 text-white border-b-4 border-red-800 active:border-b-0 transition-all';

        btnNext.className =
            'px-6 py-2 rounded font-black text-xs uppercase bg-gray-300 text-gray-700 border-b-4 border-gray-400 active:border-b-0 transition-all';
    }
}

// ===============================
// 8. INIT
// ===============================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([
            loadFixtures(),
            loadLeagueTable(),
            loadTopScorers(),
            loadDiscipline()
        ]);

        showTab('next');
    } catch (error) {
        console.error('Erro ao iniciar o site:', error);
    }
});