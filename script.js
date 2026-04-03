const SUPABASE_URL = 'https://ecucdtbdwybbrsoebpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LhCp8yCM9qUNeVKGkmF_nw_Hnw9DFst';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatDate(dateString) {
    if (!dateString) return t('date_tbd');

    const date = new Date(dateString);
    const lang = getCurrentLang() === 'en' ? 'en-GB' : 'pt-PT';

    return date.toLocaleDateString(lang, {
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

async function loadFixtures() {
    const nextCont = document.getElementById('next-fixture-container');
    const allCont = document.getElementById('all-fixtures-container');

    if (!nextCont || !allCont) return;

    nextCont.innerHTML = `<p class="text-sm text-gray-500">${t('loading_games')}</p>`;
    allCont.innerHTML = `<p class="text-sm text-gray-500">${t('loading_calendar')}</p>`;

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
        nextCont.innerHTML = `<p class="text-red-600 font-bold">${t('no_games')}</p>`;
        allCont.innerHTML = `<p class="text-red-600 font-bold">${t('no_calendar')}</p>`;
        return;
    }

    nextCont.innerHTML = '';
    allCont.innerHTML = '';

    if (!fixtures || fixtures.length === 0) {
        nextCont.innerHTML = `<p class="text-gray-500">${t('no_games')}</p>`;
        allCont.innerHTML = `<p class="text-gray-500">${t('no_calendar')}</p>`;
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
        const homeName = escapeHtml(fixture.home_team?.name || 'Home');
        const awayName = escapeHtml(fixture.away_team?.name || 'Away');
        const restName = escapeHtml(fixture.rest_team?.name || '—');

        let homeClass = '';
        let awayClass = '';

        if (isPlayedMatch(fixture)) {
            if (fixture.home_score > fixture.away_score) homeClass = 'text-green-600 font-black';
            if (fixture.away_score > fixture.home_score) awayClass = 'text-green-600 font-black';
        }

        const statusHtml = isPlayedMatch(fixture)
            ? `<span class="bg-black text-white px-3 py-1 rounded font-black text-sm tracking-widest">${escapeHtml(getScoreDisplay(fixture))}</span>`
            : `<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold uppercase">${escapeHtml(formatDate(fixture.match_date))}</span>`;

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
                            ${t('rest_label')}: ${restName}
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
        nextCont.innerHTML = `<p class="text-gray-500">${t('no_next_round')}</p>`;
    }
}

async function loadLeagueTable() {
    const tableBody = document.getElementById('league-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-sm text-gray-500">${t('loading_table')}</td></tr>`;

    const { data: teams, error } = await supabaseClient
        .from('teams')
        .select(`
            id,
            name,
            slug,
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
        tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-red-600 font-bold">${t('loading_table')}</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';

    if (!teams || teams.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-gray-500">${t('no_teams')}</td></tr>`;
        return;
    }

    teams.forEach(team => {
        tableBody.innerHTML += `
            <tr class="border-b border-gray-200 hover:bg-red-50 transition-colors">
                <td class="p-4 text-sm uppercase font-bold">
                    <a href="team.html?slug=${encodeURIComponent(team.slug)}" class="hover:text-red-600 transition-colors">
                        ${escapeHtml(team.name)}
                    </a>
                </td>
                <td class="p-4 text-center text-sm">${team.played ?? 0}</td>
                <td class="p-4 text-center text-sm text-green-600 font-bold">${team.won ?? 0}</td>
                <td class="p-4 text-center text-sm">${team.drawn ?? 0}</td>
                <td class="p-4 text-center text-sm">${team.lost ?? 0}</td>
                <td class="p-4 text-center font-black text-green-600 text-lg">${team.points ?? 0}</td>
            </tr>
        `;
    });
}

async function loadTeams() {
    const container = document.getElementById('teams-container');
    if (!container) return;

    container.innerHTML = `<p class="text-sm text-gray-500">${t('loading_teams')}</p>`;

    const { data: teams, error } = await supabaseClient
        .from('teams')
        .select(`
            id,
            name,
            slug,
            played,
            won,
            drawn,
            lost,
            points
        `)
        .order('name', { ascending: true });

    if (error) {
        console.error('Erro ao carregar equipas:', error);
        container.innerHTML = `<p class="text-red-600 font-bold">${t('no_teams')}</p>`;
        return;
    }

    container.innerHTML = '';

    if (!teams || teams.length === 0) {
        container.innerHTML = `<p class="text-gray-500">${t('no_teams')}</p>`;
        return;
    }

    teams.forEach(team => {
        container.innerHTML += `
            <a
                href="team.html?slug=${encodeURIComponent(team.slug)}"
                class="bg-white rounded-xl shadow-lg border-t-4 border-red-600 p-5 hover:shadow-2xl hover:-translate-y-1 transition-all block"
            >
                <p class="text-xs uppercase font-black text-gray-500 mb-2">${t('team_label')}</p>
                <h4 class="text-lg font-black italic uppercase mb-4">${escapeHtml(team.name)}</h4>

                <div class="grid grid-cols-2 gap-2 text-xs font-bold uppercase">
                    <div class="bg-gray-100 rounded p-2 text-center">
                        <span class="block text-gray-500">J</span>
                        <span class="text-black">${team.played ?? 0}</span>
                    </div>
                    <div class="bg-gray-100 rounded p-2 text-center">
                        <span class="block text-gray-500">PTS</span>
                        <span class="text-green-600">${team.points ?? 0}</span>
                    </div>
                    <div class="bg-gray-100 rounded p-2 text-center">
                        <span class="block text-gray-500">V</span>
                        <span class="text-black">${team.won ?? 0}</span>
                    </div>
                    <div class="bg-gray-100 rounded p-2 text-center">
                        <span class="block text-gray-500">E/D</span>
                        <span class="text-black">${team.drawn ?? 0}/${team.lost ?? 0}</span>
                    </div>
                </div>

                <p class="mt-4 text-xs font-black uppercase text-red-600">${t('view_profile')}</p>
            </a>
        `;
    });
}

async function loadTopScorers() {
    const scorersList = document.getElementById('top-scorers-list');
    if (!scorersList) return;

    scorersList.innerHTML = `<p class="p-4 text-sm text-gray-500">${t('loading_scorers')}</p>`;

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
        scorersList.innerHTML = `<p class="p-4 text-red-600 font-bold">${t('no_scorers')}</p>`;
        return;
    }

    scorersList.innerHTML = '';

    if (!players || players.length === 0) {
        scorersList.innerHTML = `<p class="p-4 text-gray-500">${t('no_scorers')}</p>`;
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

async function loadDiscipline() {
    const discList = document.getElementById('discipline-list');
    if (!discList) return;

    discList.innerHTML = `<p class="p-4 text-sm text-gray-500">${t('loading_discipline')}</p>`;

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
        discList.innerHTML = `<p class="p-4 text-red-600 font-bold">${t('no_cards')}</p>`;
        return;
    }

    const filteredPlayers = (players || []).filter(player =>
        (player.yellow_cards ?? 0) > 0 || (player.red_cards ?? 0) > 0
    );

    discList.innerHTML = '';

    if (filteredPlayers.length === 0) {
        discList.innerHTML = `<p class="p-4 text-gray-500">${t('no_cards')}</p>`;
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
                        ${escapeHtml(player.team?.name || '')} • Fines: £${fines}
                    </small>
                </span>
                <span class="font-bold text-sm">🟨 ${yellow} 🟥 ${red}</span>
            </div>
        `;
    });
}

function showTab(tab) {
    const nextCont = document.getElementById('next-fixture-container');
    const allCont = document.getElementById('all-fixtures-container');
    const btnNext = document.getElementById('btn-next');
    const btnAll = document.getElementById('btn-all');

    if (!nextCont || !allCont || !btnNext || !btnAll) return;

    if (tab === 'next') {
        nextCont.classList.remove('hidden');
        allCont.classList.add('hidden');

        btnNext.className = 'px-6 py-2 rounded font-black text-xs uppercase bg-red-600 text-white border-b-4 border-red-800 active:border-b-0 transition-all';
        btnAll.className = 'px-6 py-2 rounded font-black text-xs uppercase bg-gray-300 text-gray-700 border-b-4 border-gray-400 active:border-b-0 transition-all';
    } else {
        allCont.classList.remove('hidden');
        nextCont.classList.add('hidden');

        btnAll.className = 'px-6 py-2 rounded font-black text-xs uppercase bg-red-600 text-white border-b-4 border-red-800 active:border-b-0 transition-all';
        btnNext.className = 'px-6 py-2 rounded font-black text-xs uppercase bg-gray-300 text-gray-700 border-b-4 border-gray-400 active:border-b-0 transition-all';
    }
}

async function reloadPageContent() {
    await Promise.all([
        loadFixtures(),
        loadLeagueTable(),
        loadTeams(),
        loadTopScorers(),
        loadDiscipline()
    ]);
    showTab('next');
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await reloadPageContent();
    } catch (error) {
        console.error('Erro ao iniciar o site:', error);
    }
});

window.addEventListener('languageChanged', async () => {
    await reloadPageContent();
});