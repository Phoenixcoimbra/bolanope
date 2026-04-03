const SUPABASE_URL = 'https://ecucdtbdwybbrsoebpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LhCp8yCM9qUNeVKGkmF_nw_Hnw9DFst';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cachedTeams = [];
let cachedFixtures = [];

function slugify(text) {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function setMessage(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `mt-4 text-sm font-bold ${isError ? 'text-red-600' : 'text-green-600'}`;
}

async function loadTeams() {
    const { data, error } = await supabaseClient
        .from('teams')
        .select('id, name, slug, played, won, drawn, lost, points')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error loading teams:', error);
        return;
    }

    cachedTeams = data || [];

    const playerTeamSelect = document.getElementById('player-team');
    const teamsList = document.getElementById('teams-list');

    if (playerTeamSelect) {
        playerTeamSelect.innerHTML = '<option value="">Select team</option>';
        cachedTeams.forEach(team => {
            playerTeamSelect.innerHTML += `<option value="${team.id}">${team.name}</option>`;
        });
    }

    if (teamsList) {
        teamsList.innerHTML = '';

        if (!cachedTeams.length) {
            teamsList.innerHTML = '<p class="text-sm text-gray-500">No teams yet.</p>';
            return;
        }

        cachedTeams.forEach(team => {
            teamsList.innerHTML += `
                <div class="border rounded-lg p-4 bg-gray-50 flex justify-between items-center">
                    <div>
                        <p class="font-black uppercase">${team.name}</p>
                        <p class="text-xs text-gray-500">${team.slug}</p>
                    </div>
                    <div class="text-xs font-bold text-right">
                        <p>J: ${team.played ?? 0}</p>
                        <p>PTS: ${team.points ?? 0}</p>
                    </div>
                </div>
            `;
        });
    }
}

async function loadFixtures() {
    const { data, error } = await supabaseClient
        .from('fixtures')
        .select(`
            id,
            jornada,
            match_date,
            home_score,
            away_score,
            home_team:home_team_id ( name ),
            away_team:away_team_id ( name )
        `)
        .order('jornada', { ascending: true })
        .order('match_date', { ascending: true });

    if (error) {
        console.error('Error loading fixtures:', error);
        return;
    }

    cachedFixtures = data || [];

    const fixtureSelect = document.getElementById('fixture-select');
    if (!fixtureSelect) return;

    fixtureSelect.innerHTML = '<option value="">Select fixture</option>';

    cachedFixtures.forEach(fixture => {
        const home = fixture.home_team?.name || 'Home';
        const away = fixture.away_team?.name || 'Away';
        const date = fixture.match_date || '';
        fixtureSelect.innerHTML += `
            <option value="${fixture.id}">
                Jornada ${fixture.jornada} - ${home} vs ${away} (${date})
            </option>
        `;
    });
}

async function addTeam(event) {
    event.preventDefault();

    const name = document.getElementById('team-name').value.trim();
    const slugInput = document.getElementById('team-slug').value.trim();
    const description = document.getElementById('team-description').value.trim();
    const logoUrl = document.getElementById('team-logo').value.trim();

    const slug = slugify(slugInput || name);

    const payload = {
        name,
        slug,
        description,
        logo_url: logoUrl || null,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
        goals_for: 0,
        goals_against: 0
    };

    const { error } = await supabaseClient
        .from('teams')
        .insert([payload]);

    if (error) {
        console.error(error);
        setMessage('team-message', `Error adding team: ${error.message}`, true);
        return;
    }

    document.getElementById('team-form').reset();
    setMessage('team-message', 'Team added successfully.');
    await loadTeams();
}

async function addPlayer(event) {
    event.preventDefault();

    const payload = {
        team_id: document.getElementById('player-team').value,
        name: document.getElementById('player-name').value.trim(),
        number: parseInt(document.getElementById('player-number').value || '0', 10) || null,
        position: document.getElementById('player-position').value.trim() || null,
        games_played: parseInt(document.getElementById('player-games').value || '0', 10) || 0,
        goals: parseInt(document.getElementById('player-goals').value || '0', 10) || 0,
        yellow_cards: parseInt(document.getElementById('player-yellow').value || '0', 10) || 0,
        red_cards: parseInt(document.getElementById('player-red').value || '0', 10) || 0
    };

    const { error } = await supabaseClient
        .from('players')
        .insert([payload]);

    if (error) {
        console.error(error);
        setMessage('player-message', `Error adding player: ${error.message}`, true);
        return;
    }

    document.getElementById('player-form').reset();
    setMessage('player-message', 'Player added successfully.');
}

async function updateScore(event) {
    event.preventDefault();

    const fixtureId = document.getElementById('fixture-select').value;
    const homeScore = parseInt(document.getElementById('home-score').value, 10);
    const awayScore = parseInt(document.getElementById('away-score').value, 10);

    const fixture = cachedFixtures.find(f => String(f.id) === String(fixtureId));
    if (!fixture) {
        setMessage('score-message', 'Fixture not found.', true);
        return;
    }

    const { error: fixtureError } = await supabaseClient
        .from('fixtures')
        .update({
            home_score: homeScore,
            away_score: awayScore,
            status: 'finished'
        })
        .eq('id', fixtureId);

    if (fixtureError) {
        console.error(fixtureError);
        setMessage('score-message', `Error updating score: ${fixtureError.message}`, true);
        return;
    }

    const homeTeamName = fixture.home_team?.name;
    const awayTeamName = fixture.away_team?.name;

    const homeTeam = cachedTeams.find(t => t.name === homeTeamName);
    const awayTeam = cachedTeams.find(t => t.name === awayTeamName);

    if (homeTeam && awayTeam) {
        const homePlayed = (homeTeam.played ?? 0) + 1;
        const awayPlayed = (awayTeam.played ?? 0) + 1;

        let homeWon = homeTeam.won ?? 0;
        let awayWon = awayTeam.won ?? 0;
        let homeDrawn = homeTeam.drawn ?? 0;
        let awayDrawn = awayTeam.drawn ?? 0;
        let homeLost = homeTeam.lost ?? 0;
        let awayLost = awayTeam.lost ?? 0;
        let homePoints = homeTeam.points ?? 0;
        let awayPoints = awayTeam.points ?? 0;

        const homeGoalsFor = (homeTeam.goals_for ?? 0) + homeScore;
        const homeGoalsAgainst = (homeTeam.goals_against ?? 0) + awayScore;
        const awayGoalsFor = (awayTeam.goals_for ?? 0) + awayScore;
        const awayGoalsAgainst = (awayTeam.goals_against ?? 0) + homeScore;

        if (homeScore > awayScore) {
            homeWon += 1;
            awayLost += 1;
            homePoints += 3;
        } else if (awayScore > homeScore) {
            awayWon += 1;
            homeLost += 1;
            awayPoints += 3;
        } else {
            homeDrawn += 1;
            awayDrawn += 1;
            homePoints += 1;
            awayPoints += 1;
        }

        const { error: homeUpdateError } = await supabaseClient
            .from('teams')
            .update({
                played: homePlayed,
                won: homeWon,
                drawn: homeDrawn,
                lost: homeLost,
                points: homePoints,
                goals_for: homeGoalsFor,
                goals_against: homeGoalsAgainst
            })
            .eq('id', homeTeam.id);

        const { error: awayUpdateError } = await supabaseClient
            .from('teams')
            .update({
                played: awayPlayed,
                won: awayWon,
                drawn: awayDrawn,
                lost: awayLost,
                points: awayPoints,
                goals_for: awayGoalsFor,
                goals_against: awayGoalsAgainst
            })
            .eq('id', awayTeam.id);

        if (homeUpdateError || awayUpdateError) {
            console.error(homeUpdateError || awayUpdateError);
            setMessage('score-message', 'Score saved, but team table update failed.', true);
            return;
        }
    }

    document.getElementById('score-form').reset();
    setMessage('score-message', 'Score updated successfully.');

    await Promise.all([loadTeams(), loadFixtures()]);
}

function setupAutoSlug() {
    const nameInput = document.getElementById('team-name');
    const slugInput = document.getElementById('team-slug');

    if (!nameInput || !slugInput) return;

    nameInput.addEventListener('input', () => {
        if (!slugInput.dataset.manuallyEdited) {
            slugInput.value = slugify(nameInput.value);
        }
    });

    slugInput.addEventListener('input', () => {
        slugInput.dataset.manuallyEdited = 'true';
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    setupAutoSlug();

    document.getElementById('team-form')?.addEventListener('submit', addTeam);
    document.getElementById('player-form')?.addEventListener('submit', addPlayer);
    document.getElementById('score-form')?.addEventListener('submit', updateScore);

    await Promise.all([loadTeams(), loadFixtures()]);
});