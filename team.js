const SUPABASE_URL = 'https://ecucdtbdwybbrsoebpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LhCp8yCM9qUNeVKGkmF_nw_Hnw9DFst';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentTeam = null;
let currentPlayers = [];
let currentFixtures = [];
let squadView = localStorage.getItem('squadView') || 'cards';

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
    if (!dateString) return typeof t === 'function' ? t('date_tbd') : 'Data por definir';

    const date = new Date(dateString);
    const lang = typeof getCurrentLang === 'function' && getCurrentLang() === 'en' ? 'en-GB' : 'pt-PT';

    return date.toLocaleDateString(lang, {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function isPlayedMatch(fixture) {
    return fixture.home_score !== null && fixture.away_score !== null;
}

function safeT(key, fallback) {
    try {
        if (typeof t === 'function') return t(key);
    } catch (e) {}
    return fallback;
}

function renderTeamNotFound(message) {
    document.getElementById('team-name').textContent = safeT('no_team_found', 'Equipa não encontrada');
    document.getElementById('team-description').textContent = message;
    document.getElementById('team-tagline').textContent = safeT('verify_team_link', 'Verifica o link da equipa.');
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

function loadInstagramLink(instagramHandleOrUrl) {
    const link = document.getElementById('team-instagram-link');
    if (!link) return;

    if (!instagramHandleOrUrl || String(instagramHandleOrUrl).trim() === '') {
        link.classList.add('hidden');
        link.removeAttribute('href');
        return;
    }

    const raw = String(instagramHandleOrUrl).trim();
    const isFullUrl = raw.startsWith('http://') || raw.startsWith('https://');
    const cleanHandle = raw.replace(/^@/, '');
    const finalUrl = isFullUrl ? raw : `https://instagram.com/${cleanHandle}`;

    link.href = finalUrl;
    link.textContent = isFullUrl ? 'Instagram' : `@${cleanHandle}`;
    link.classList.remove('hidden');
}

function getTeamDescription(team) {
    if (!team) return safeT('no_team_description', 'Sem descrição disponível para esta equipa.');

    const lang = typeof getCurrentLang === 'function' ? getCurrentLang() : 'pt';

    if (lang === 'en' && team.description_en) return team.description_en;
    if (lang === 'pt' && team.description_pt) return team.description_pt;

    return team.description || safeT('no_team_description', 'Sem descrição disponível para esta equipa.');
}

function renderTeamHeader() {
    if (!currentTeam) return;

    document.title = `${currentTeam.name} | Low Hall League`;
    document.getElementById('team-name').textContent = currentTeam.name;
    document.getElementById('team-description').textContent = getTeamDescription(currentTeam);
    document.getElementById('team-tagline').textContent = safeT('team_tagline', 'Low Hall League 2026');
    document.getElementById('team-manager').textContent = currentTeam.manager || '—';

    loadTeamLogo(currentTeam.logo_url, currentTeam.name);
    loadInstagramLink(currentTeam.instagram || currentTeam.instagram_url || currentTeam.instagram_handle);
}

function mapPositionGroup(position) {
    const pos = String(position || '').trim().toUpperCase();

    if (['GK'].includes(pos)) return 'goalkeeper';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'defence';
    if (['DM', 'CM', 'MCO', 'CAM', 'LM', 'RM'].includes(pos)) return 'midfield';
    if (['LW', 'RW', 'ST', 'CF'].includes(pos)) return 'attack';

    return 'unassigned';
}

function getGroupLabel(group) {
    const lang = typeof getCurrentLang === 'function' ? getCurrentLang() : 'pt';

    const labels = {
        pt: {
            goalkeeper: 'Guarda-Redes',
            defence: 'Defesa',
            midfield: 'Meio-Campo',
            attack: 'Ataque',
            unassigned: 'Sem Posição Definida'
        },
        en: {
            goalkeeper: 'Goalkeepers',
            defence: 'Defence',
            midfield: 'Midfield',
            attack: 'Attack',
            unassigned: 'Unassigned'
        }
    };

    return labels[lang]?.[group] || labels.pt[group] || group;
}

function getPositionLabel(position) {
    const pos = String(position || '').trim().toUpperCase();
    const lang = typeof getCurrentLang === 'function' ? getCurrentLang() : 'pt';

    const map = {
        pt: {
            GK: 'GR',
            LB: 'DE',
            CB: 'DC',
            RB: 'DD',
            DM: 'MD',
            MCO: 'MCO',
            LW: 'EE',
            RW: 'ED',
            ST: 'PL',
            CF: 'AV'
        },
        en: {
            GK: 'GK',
            LB: 'LB',
            CB: 'CB',
            RB: 'RB',
            DM: 'DM',
            MCO: 'CAM',
            LW: 'LW',
            RW: 'RW',
            ST: 'ST',
            CF: 'CF'
        }
    };

    return map[lang]?.[pos] || pos || '—';
}

function updateSquadViewButtons() {
    const cardsBtn = document.getElementById('view-cards-btn');
    const listBtn = document.getElementById('view-list-btn');

    if (!cardsBtn || !listBtn) return;

    if (squadView === 'cards') {
        cardsBtn.className = 'px-4 py-2 rounded-lg font-black text-xs uppercase bg-red-600 text-white';
        listBtn.className = 'px-4 py-2 rounded-lg font-black text-xs uppercase bg-gray-200 text-gray-700';
    } else {
        listBtn.className = 'px-4 py-2 rounded-lg font-black text-xs uppercase bg-red-600 text-white';
        cardsBtn.className = 'px-4 py-2 rounded-lg font-black text-xs uppercase bg-gray-200 text-gray-700';
    }
}

function setSquadView(view) {
    if (view !== 'cards' && view !== 'list') return;

    squadView = view;
    localStorage.setItem('squadView', view);
    updateSquadViewButtons();
    renderGroupedRoster();
}

function setupSquadViewToggle() {
    const toggle = document.getElementById('squad-view-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-view]');
        if (!button) return;

        const view = button.dataset.view;
        setSquadView(view);
    });

    updateSquadViewButtons();
}

async function loadTeamPage() {
    const slug = getSlugFromUrl();

    if (!slug) {
        renderTeamNotFound(safeT('missing_team_slug', 'Esta página foi aberta sem o identificador da equipa.'));
        return;
    }

    const { data: team, error: teamError } = await supabaseClient
        .from('teams')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (teamError) {
        console.error('Erro ao carregar equipa:', teamError);
        renderTeamNotFound(safeT('team_not_loaded', 'Não foi possível carregar esta equipa.'));
        return;
    }

    if (!team) {
        renderTeamNotFound(safeT('no_team_found', 'Equipa não encontrada'));
        return;
    }

    currentTeam = team;
    renderTeamHeader();

    await Promise.all([
        loadPlayers(team.id),
        loadFixtures(team.id, team.name)
    ]);
}

async function loadPlayers(teamId) {
    const roster = document.getElementById('grouped-roster');
    roster.innerHTML = `<p class="text-sm text-gray-500">${safeT('roster_loading', 'A carregar plantel...')}</p>`;

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
        roster.innerHTML = `<p class="text-sm text-red-600 font-bold">${safeT('no_players_registered', 'Ainda não existem jogadores registados para esta equipa.')}</p>`;
        return;
    }

    currentPlayers = players || [];
    renderGroupedRoster();
    renderPlayerHighlights(currentPlayers);
}

function renderGroupedRoster() {
    const roster = document.getElementById('grouped-roster');
    roster.innerHTML = '';

    if (!currentPlayers.length) {
        roster.innerHTML = `<p class="text-sm text-gray-500">${safeT('no_players_registered', 'Ainda não existem jogadores registados para esta equipa.')}</p>`;

        document.getElementById('summary-players').textContent = '0';
        document.getElementById('summary-goals').textContent = '0';
        document.getElementById('summary-yellow').textContent = '0';
        document.getElementById('summary-red').textContent = '0';
        return;
    }

    let totalGoals = 0;
    let totalYellow = 0;
    let totalRed = 0;

    currentPlayers.forEach(player => {
        totalGoals += player.goals ?? 0;
        totalYellow += player.yellow_cards ?? 0;
        totalRed += player.red_cards ?? 0;
    });

    document.getElementById('summary-players').textContent = currentPlayers.length;
    document.getElementById('summary-goals').textContent = totalGoals;
    document.getElementById('summary-yellow').textContent = totalYellow;
    document.getElementById('summary-red').textContent = totalRed;

    const grouped = {
        goalkeeper: [],
        defence: [],
        midfield: [],
        attack: [],
        unassigned: []
    };

    currentPlayers.forEach(player => {
        grouped[mapPositionGroup(player.position)].push(player);
    });

    const order = ['goalkeeper', 'defence', 'midfield', 'attack', 'unassigned'];

    order.forEach(group => {
        if (!grouped[group].length) return;

        roster.innerHTML += `
            <div class="space-y-4">
                <div class="flex items-center gap-4">
                    <div class="h-8 w-2 bg-red-600"></div>
                    <h3 class="text-2xl font-black italic uppercase">${getGroupLabel(group)}</h3>
                </div>

                ${
                    squadView === 'cards'
                        ? `<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            ${grouped[group].map(player => renderPlayerCard(player)).join('')}
                           </div>`
                        : `<div class="bg-white rounded-xl shadow-lg border overflow-x-auto">
                            <table class="w-full text-left">
                                <thead class="bg-gray-100 text-xs uppercase font-black text-gray-600">
                                    <tr>
                                        <th class="p-4 w-20 text-center">#</th>
                                        <th class="p-4">${safeT('player_col', 'Jogador')}</th>
                                        <th class="p-4 w-28 text-center">${safeT('position_col', 'Posição')}</th>
                                        <th class="p-4 w-24 text-center">${safeT('games_col', 'Jogos')}</th>
                                        <th class="p-4 w-24 text-center">${safeT('goals_col', 'Golos')}</th>
                                        <th class="p-4 w-20 text-center">🟨</th>
                                        <th class="p-4 w-20 text-center">🟥</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${grouped[group].map(player => renderPlayerRow(player)).join('')}
                                </tbody>
                            </table>
                           </div>`
                }
            </div>
        `;
    });
}

function renderPlayerCard(player) {
    const number = player.number ?? '—';
    const position = getPositionLabel(player.position);
    const games = player.games_played ?? 0;
    const goals = player.goals ?? 0;
    const yellow = player.yellow_cards ?? 0;
    const red = player.red_cards ?? 0;

    return `
        <div class="bg-white rounded-xl shadow-lg border-t-4 border-red-600 p-5">
            <div class="flex items-start justify-between gap-4 mb-4">
                <div class="min-w-0">
                    <p class="text-xs uppercase font-black text-gray-500 mb-1">#${number}</p>
                    <h4 class="text-xl font-black italic uppercase break-words">${escapeHtml(player.name)}</h4>
                </div>
                <span class="bg-black text-white text-xs font-black px-3 py-1 rounded-full uppercase shrink-0">
                    ${escapeHtml(position)}
                </span>
            </div>

            <div class="grid grid-cols-4 gap-2 text-center text-xs font-black uppercase">
                <div class="bg-gray-100 rounded p-3">
                    <span class="block text-gray-500">${safeT('games_col', 'Jogos')}</span>
                    <span class="text-black text-base">${games}</span>
                </div>
                <div class="bg-gray-100 rounded p-3">
                    <span class="block text-gray-500">${safeT('goals_col', 'Golos')}</span>
                    <span class="text-green-600 text-base">${goals}</span>
                </div>
                <div class="bg-gray-100 rounded p-3">
                    <span class="block text-gray-500">🟨</span>
                    <span class="text-black text-base">${yellow}</span>
                </div>
                <div class="bg-gray-100 rounded p-3">
                    <span class="block text-gray-500">🟥</span>
                    <span class="text-black text-base">${red}</span>
                </div>
            </div>
        </div>
    `;
}

function renderPlayerRow(player) {
    return `
        <tr class="border-t hover:bg-red-50 transition-colors">
            <td class="p-4 text-center font-black align-middle">${player.number ?? '—'}</td>
            <td class="p-4 font-bold uppercase align-middle">${escapeHtml(player.name)}</td>
            <td class="p-4 text-center font-black align-middle">${escapeHtml(getPositionLabel(player.position))}</td>
            <td class="p-4 text-center align-middle">${player.games_played ?? 0}</td>
            <td class="p-4 text-center font-black text-green-600 align-middle">${player.goals ?? 0}</td>
            <td class="p-4 text-center align-middle">${player.yellow_cards ?? 0}</td>
            <td class="p-4 text-center align-middle">${player.red_cards ?? 0}</td>
        </tr>
    `;
}

function renderPlayerHighlights(players) {
    const topScorer = [...players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    const mostYellow = [...players].sort((a, b) => (b.yellow_cards ?? 0) - (a.yellow_cards ?? 0))[0];
    const mostRed = [...players].sort((a, b) => (b.red_cards ?? 0) - (a.red_cards ?? 0))[0];

    document.getElementById('top-scorer-name').textContent = topScorer?.name || '—';
    document.getElementById('top-scorer-goals').textContent = `${topScorer?.goals ?? 0} ${safeT('goals_label', 'golos')}`;

    document.getElementById('most-yellow-name').textContent = mostYellow?.name || '—';
    document.getElementById('most-yellow-count').textContent = `${mostYellow?.yellow_cards ?? 0} ${safeT('yellow_cards_label', 'cartões amarelos')}`;

    document.getElementById('most-red-name').textContent = mostRed?.name || '—';
    document.getElementById('most-red-count').textContent = `${mostRed?.red_cards ?? 0} ${safeT('red_cards_label', 'cartões vermelhos')}`;
}

async function loadFixtures(teamId, teamName) {
    const fixturesList = document.getElementById('team-fixtures-list');
    fixturesList.innerHTML = `<p class="text-sm text-gray-500">${safeT('team_matches_loading', 'A carregar jogos...')}</p>`;

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
        fixturesList.innerHTML = `<p class="text-sm text-red-600 font-bold">${safeT('no_team_matches', 'Ainda não existem jogos para esta equipa.')}</p>`;
        return;
    }

    currentFixtures = fixtures || [];
    renderFixtures(teamName);
}

function renderFixtures(teamName) {
    const fixturesList = document.getElementById('team-fixtures-list');
    fixturesList.innerHTML = '';

    if (!currentFixtures.length) {
        fixturesList.innerHTML = `<p class="text-sm text-gray-500">${safeT('no_team_matches', 'Ainda não existem jogos para esta equipa.')}</p>`;
        return;
    }

    currentFixtures.forEach(fixture => {
        const homeName = fixture.home_team?.name || 'Home';
        const awayName = fixture.away_team?.name || 'Away';

        const isHomeTeam = homeName === teamName;
        const isAwayTeam = awayName === teamName;

        let resultLabel = safeT('not_played', 'Por jogar');
        let resultClass = 'bg-gray-100 text-gray-600';

        if (isPlayedMatch(fixture)) {
            const homeScore = fixture.home_score;
            const awayScore = fixture.away_score;

            if ((isHomeTeam && homeScore > awayScore) || (isAwayTeam && awayScore > homeScore)) {
                resultLabel = safeT('win', 'Vitória');
                resultClass = 'bg-green-100 text-green-700';
            } else if (homeScore === awayScore) {
                resultLabel = safeT('draw', 'Empate');
                resultClass = 'bg-yellow-100 text-yellow-700';
            } else {
                resultLabel = safeT('loss', 'Derrota');
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
    if (typeof applyTranslations === 'function') {
        applyTranslations();
    }

    updateSquadViewButtons();
    renderTeamHeader();
    renderGroupedRoster();
    renderPlayerHighlights(currentPlayers);

    if (currentTeam) {
        renderFixtures(currentTeam.name);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    setupSquadViewToggle();
    await loadTeamPage();
});

window.addEventListener('languageChanged', rerenderLanguageSensitiveContent);