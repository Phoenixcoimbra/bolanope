const SUPABASE_URL = 'https://ecucdtbdwybbrsoebpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LhCp8yCM9qUNeVKGkmF_nw_Hnw9DFst';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let liveChannel = null;
let reloadTimer = null;

const DEFAULT_KICKOFF = '12:30';

function safeT(key, fallback = '') {
    try {
        if (typeof t === 'function') return t(key);
    } catch (e) {}
    return fallback || key;
}

function safeLang() {
    try {
        if (typeof getCurrentLang === 'function') return getCurrentLang();
    } catch (e) {}
    return 'pt';
}

function formatDate(dateString) {
    if (!dateString) return safeT('date_tbd', 'Data por definir');

    const date = new Date(dateString);
    const lang = safeLang() === 'en' ? 'en-GB' : 'pt-PT';

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

function teamLogoHtml(team, size = 'w-10 h-10') {
    const url = team?.logo_url;
    const name = escapeHtml(team?.name || 'Team');

    if (url && String(url).trim() !== '') {
        return `
            <div class="relative shrink-0">
                <img
                    src="${escapeHtml(url)}"
                    alt="${name}"
                    class="${size} rounded-full object-cover border-2 border-gray-200 bg-white"
                    onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');"
                />
                <div class="${size} rounded-full border-2 border-gray-200 bg-white text-[10px] font-black uppercase text-gray-500 flex items-center justify-center hidden">
                    Logo
                </div>
            </div>
        `;
    }

    return `
        <div class="${size} rounded-full border-2 border-gray-200 bg-white text-[10px] font-black uppercase text-gray-500 flex items-center justify-center shrink-0">
            Logo
        </div>
    `;
}

function getFixtureVenue(fixture) {
    if (fixture.venue && String(fixture.venue).trim() !== '') {
        return fixture.venue;
    }

    const homeTeamName = (fixture.home_team?.name || '').toLowerCase();

    if (homeTeamName === 'jipangue') {
        return '23 Norfolk Close, London N13 6AN';
    }

    return 'Beckton District Park South, Stansfeld Road, London E6 5LT';
}

function getFixtureKickoff(fixture) {
    if (fixture.kickoff_time && String(fixture.kickoff_time).trim() !== '') {
        return fixture.kickoff_time;
    }
    return DEFAULT_KICKOFF;
}

async function loadFixtures() {
    const nextCont = document.getElementById('next-fixture-container');
    const allCont = document.getElementById('all-fixtures-container');

    if (!nextCont || !allCont) return;

    nextCont.innerHTML = `<p class="text-sm text-gray-500">${safeT('loading_games', 'A carregar jogos...')}</p>`;
    allCont.innerHTML = `<p class="text-sm text-gray-500">${safeT('loading_calendar', 'A carregar calendário...')}</p>`;

    const { data: fixtures, error } = await supabaseClient
        .from('fixtures')
        .select(`
            id,
            jornada,
            match_date,
            kickoff_time,
            venue,
            home_score,
            away_score,
            status,
            home_team:home_team_id ( id, name, logo_url ),
            away_team:away_team_id ( id, name, logo_url ),
            rest_team:rest_team_id ( id, name )
        `)
        .order('jornada', { ascending: true })
        .order('match_date', { ascending: true });

    if (error) {
        console.error('Erro ao carregar jogos:', error);
        nextCont.innerHTML = `<p class="text-red-600 font-bold">Erro ao carregar jogos.</p>`;
        allCont.innerHTML = `<p class="text-red-600 font-bold">Erro ao carregar calendário.</p>`;
        return;
    }

    nextCont.innerHTML = '';
    allCont.innerHTML = '';

    if (!fixtures || fixtures.length === 0) {
        nextCont.innerHTML = `<p class="text-gray-500">${safeT('no_games', 'Sem jogos disponíveis.')}</p>`;
        allCont.innerHTML = `<p class="text-gray-500">${safeT('no_calendar', 'Sem calendário disponível.')}</p>`;
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
        const venue = escapeHtml(getFixtureVenue(fixture));
        const kickoff = escapeHtml(getFixtureKickoff(fixture));

        let homeClass = '';
        let awayClass = '';

        if (isPlayedMatch(fixture)) {
            if (fixture.home_score > fixture.away_score) homeClass = 'text-green-600 font-black';
            if (fixture.away_score > fixture.home_score) awayClass = 'text-green-600 font-black';
        }

        const statusHtml = isPlayedMatch(fixture)
            ? `<span class="bg-black text-white px-3 py-1 rounded font-black text-sm tracking-widest">${escapeHtml(getScoreDisplay(fixture))}</span>`
            : `<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold uppercase">${kickoff}</span>`;

        const cardHtml = `
            <div class="bg-white p-4 rounded shadow-sm border border-gray-200 border-l-4 border-l-green-500">
                <div class="flex justify-between items-center mb-4 gap-3">
                    <span class="text-xs font-black uppercase text-gray-500">
                        Jornada ${escapeHtml(fixture.jornada)} • ${escapeHtml(formatDate(fixture.match_date))}
                    </span>
                    ${statusHtml}
                </div>

                <div class="flex items-center justify-between gap-2 mb-4">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                        ${teamLogoHtml(fixture.home_team, 'w-8 h-8')}
                        <span class="text-xs sm:text-sm font-black uppercase leading-tight break-words ${homeClass}">
                            ${homeName}
                        </span>
                    </div>

                    <span class="text-[10px] font-black uppercase text-gray-300 shrink-0">VS</span>

                    <div class="flex items-center gap-2 min-w-0 flex-1 justify-end">
                        <span class="text-xs sm:text-sm font-black uppercase leading-tight break-words text-right ${awayClass}">
                            ${awayName}
                        </span>
                        ${teamLogoHtml(fixture.away_team, 'w-8 h-8')}
                    </div>
                </div>

                <div class="space-y-1">
                    <p class="text-[11px] uppercase font-black text-gray-500">${safeT('venue_label', 'Local')}</p>
                    <p class="text-sm font-bold text-gray-700 leading-snug">${venue}</p>
                </div>
            </div>
        `;

        if (fixture.jornada !== currentJornada) {
            currentJornada = fixture.jornada;

            allCont.innerHTML += `
                <div class="col-span-full mt-6 mb-2">
                    <div class="flex justify-between items-center bg-gray-200 px-4 py-2 rounded shadow-sm gap-3">
                        <span class="font-black text-xs uppercase text-gray-700">
                            Jornada ${escapeHtml(fixture.jornada)} — ${escapeHtml(formatDate(fixture.match_date))}
                        </span>
                        <span class="text-[9px] font-bold text-gray-500 uppercase italic text-right">
                            ${safeT('rest_label', 'Descansa')}: ${restName}
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
        nextCont.innerHTML = `<p class="text-gray-500">${safeT('no_next_round', 'Sem próxima jornada disponível.')}</p>`;
    }
}

async function loadLeagueTable() {
    const tableBody = document.getElementById('league-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-sm text-gray-500">${safeT('loading_table', 'A carregar classificação...')}</td></tr>`;

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
        `);

    if (error) {
        console.error('Erro ao carregar classificação:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-red-600 font-bold">Erro ao carregar classificação.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';

    if (!teams || teams.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-gray-500">${safeT('no_teams', 'Sem equipas disponíveis.')}</td></tr>`;
        return;
    }

    teams
        .sort((a, b) => {
            const aGD = (a.goals_for ?? 0) - (a.goals_against ?? 0);
            const bGD = (b.goals_for ?? 0) - (b.goals_against ?? 0);

            if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0);
            if (bGD !== aGD) return bGD - aGD;
            return (b.goals_for ?? 0) - (a.goals_for ?? 0);
        })
        .forEach(team => {
            const goalsFor = team.goals_for ?? 0;
            const goalsAgainst = team.goals_against ?? 0;
            const goalDifference = goalsFor - goalsAgainst;

            tableBody.innerHTML += `
                <tr class="border-b border-gray-200 hover:bg-red-50 transition-colors">
                    <td class="p-3 sm:p-4 text-sm uppercase font-bold">
                        <a href="team.html?slug=${encodeURIComponent(team.slug)}" class="hover:text-red-600 transition-colors">
                            ${escapeHtml(team.name)}
                        </a>
                    </td>
                    <td class="p-3 sm:p-4 text-center text-sm">${team.played ?? 0}</td>
                    <td class="p-3 sm:p-4 text-center text-sm text-green-600 font-bold">${team.won ?? 0}</td>
                    <td class="p-3 sm:p-4 text-center text-sm">${team.drawn ?? 0}</td>
                    <td class="p-3 sm:p-4 text-center text-sm">${team.lost ?? 0}</td>
                    <td class="p-3 sm:p-4 text-center text-sm font-black">${goalDifference}</td>
                    <td class="p-3 sm:p-4 text-center font-black text-green-600 text-lg">${team.points ?? 0}</td>
                </tr>
            `;
        });
}

async function loadTeams() {
    const container = document.getElementById('teams-container');
    if (!container) return;

    container.innerHTML = `
        <p class="text-sm text-gray-500">
            ${safeT('loading_teams', 'A carregar equipas...')}
        </p>
    `;

    const { data: teams, error } = await supabaseClient
        .from('teams')
        .select(`
            id,
            name,
            slug,
            logo_url,
            played,
            won,
            drawn,
            lost,
            points
        `)
        .order('name', { ascending: true });

    if (error) {
        console.error('Erro ao carregar equipas:', error);

        container.innerHTML = `
            <p class="text-red-600 font-bold">
                Erro ao carregar equipas.
            </p>
        `;
        return;
    }

    container.innerHTML = '';

    if (!teams || teams.length === 0) {
        container.innerHTML = `
            <p class="text-gray-500">
                ${safeT('no_teams', 'Sem equipas disponíveis.')}
            </p>
        `;
        return;
    }

    teams.forEach(team => {
        container.innerHTML += `
            <a
                href="team.html?slug=${encodeURIComponent(team.slug)}"
                class="bg-white rounded-xl shadow-lg border-t-4 border-red-600 p-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 block"
            >
                <!-- LOGO -->
                <div class="flex justify-center mb-4">
                    ${teamLogoHtml(team, 'w-16 h-16')}
                </div>

                <!-- LABEL -->
                <p class="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2 text-center">
                    ${safeT('team_label', 'Equipa')}
                </p>

                <!-- TEAM NAME -->
                <h4 class="text-lg font-black italic uppercase text-center mb-5 break-words text-gray-900">
                    ${escapeHtml(team.name)}
                </h4>

                <!-- STATS -->
                <div class="grid grid-cols-2 gap-2 text-xs font-bold uppercase">
                    
                    <div class="bg-gray-100 rounded-lg p-3 text-center">
                        <span class="block text-[10px] text-gray-500 mb-1">
                            ${safeT('played_short', 'J')}
                        </span>
                        <span class="text-base font-black text-gray-900">
                            ${team.played ?? 0}
                        </span>
                    </div>

                    <div class="bg-gray-100 rounded-lg p-3 text-center">
                        <span class="block text-[10px] text-gray-500 mb-1">
                            PTS
                        </span>
                        <span class="text-base font-black text-green-600">
                            ${team.points ?? 0}
                        </span>
                    </div>

                    <div class="bg-gray-100 rounded-lg p-3 text-center">
                        <span class="block text-[10px] text-gray-500 mb-1">
                            ${safeT('wins_short', 'V')}
                        </span>
                        <span class="text-base font-black text-gray-900">
                            ${team.won ?? 0}
                        </span>
                    </div>

                    <div class="bg-gray-100 rounded-lg p-3 text-center">
                        <span class="block text-[10px] text-gray-500 mb-1">
                            ${safeT('draw_loss_short', 'E/D')}
                        </span>
                        <span class="text-base font-black text-gray-900">
                            ${team.drawn ?? 0}/${team.lost ?? 0}
                        </span>
                    </div>

                </div>

                <!-- BUTTON -->
                <p class="mt-5 text-xs font-black uppercase text-red-600 text-center tracking-wider">
                    ${safeT('view_profile', 'Ver perfil →')}
                </p>
            </a>
        `;
    });
}

async function loadTopScorers() {
    const scorersList = document.getElementById('top-scorers-list');
    if (!scorersList) return;

    scorersList.innerHTML = `<p class="p-4 text-sm text-gray-500">${safeT('loading_scorers', 'A carregar marcadores...')}</p>`;

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
        scorersList.innerHTML = `<p class="p-4 text-red-600 font-bold">Erro ao carregar marcadores.</p>`;
        return;
    }

    scorersList.innerHTML = '';

    if (!players || players.length === 0) {
        scorersList.innerHTML = `<p class="p-4 text-gray-500">${safeT('no_scorers', 'Ainda sem marcadores registados.')}</p>`;
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

    discList.innerHTML = `<p class="p-4 text-sm text-gray-500">${safeT('loading_discipline', 'A carregar disciplina...')}</p>`;

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
        discList.innerHTML = `<p class="p-4 text-red-600 font-bold">Erro ao carregar disciplina.</p>`;
        return;
    }

    const filteredPlayers = (players || []).filter(player =>
        (player.yellow_cards ?? 0) > 0 || (player.red_cards ?? 0) > 0
    );

    discList.innerHTML = '';

    if (filteredPlayers.length === 0) {
        discList.innerHTML = `<p class="p-4 text-gray-500">${safeT('no_cards', 'Sem cartões registados.')}</p>`;
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

function showTab(tab) {
    const nextCont = document.getElementById('next-fixture-container');
    const allCont = document.getElementById('all-fixtures-container');
    const btnNext = document.getElementById('btn-next');
    const btnAll = document.getElementById('btn-all');

    if (!nextCont || !allCont || !btnNext || !btnAll) return;

    if (tab === 'next') {
        nextCont.classList.remove('hidden');
        allCont.classList.add('hidden');

        btnNext.className = 'px-5 py-2 rounded font-black text-xs uppercase bg-red-600 text-white border-b-4 border-red-800 active:border-b-0 transition-all';
        btnAll.className = 'px-5 py-2 rounded font-black text-xs uppercase bg-gray-300 text-gray-700 border-b-4 border-gray-400 active:border-b-0 transition-all';
    } else {
        allCont.classList.remove('hidden');
        nextCont.classList.add('hidden');

        btnAll.className = 'px-5 py-2 rounded font-black text-xs uppercase bg-red-600 text-white border-b-4 border-red-800 active:border-b-0 transition-all';
        btnNext.className = 'px-5 py-2 rounded font-black text-xs uppercase bg-gray-300 text-gray-700 border-b-4 border-gray-400 active:border-b-0 transition-all';
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

function scheduleLiveReload() {
    if (reloadTimer) clearTimeout(reloadTimer);

    reloadTimer = setTimeout(async () => {
        try {
            await reloadPageContent();
            console.log('Live update applied');
        } catch (error) {
            console.error('Live update failed:', error);
        }
    }, 250);
}

function setupLiveMatchMode() {
    if (liveChannel) {
        supabaseClient.removeChannel(liveChannel);
    }

    liveChannel = supabaseClient
        .channel('live-match-mode')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, scheduleLiveReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, scheduleLiveReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, scheduleLiveReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, scheduleLiveReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, scheduleLiveReload)
        .subscribe((status) => {
            console.log('Live match mode:', status);
        });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await reloadPageContent();
        setupLiveMatchMode();
    } catch (error) {
        console.error('Erro ao iniciar o site:', error);
    }
});

window.addEventListener('languageChanged', async () => {
    await reloadPageContent();
});

window.addEventListener('beforeunload', () => {
    if (liveChannel) {
        supabaseClient.removeChannel(liveChannel);
    }
});