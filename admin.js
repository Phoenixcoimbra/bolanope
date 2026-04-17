const SUPABASE_URL = 'https://ecucdtbdwybbrsoebpxm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LhCp8yCM9qUNeVKGkmF_nw_Hnw9DFst';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cachedFixtures = [];
let currentFixturePlayers = [];
let selectedFixture = null;

function setMessage(elementId, message, isError = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `mt-4 text-sm font-bold ${isError ? 'text-red-600' : 'text-green-600'}`;
}

async function requireSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

async function loadFixtures() {
  const fixtureSelect = document.getElementById('fixture-select');

  const { data, error } = await supabaseClient
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
      home_team_id,
      away_team_id,
      home_team:home_team_id ( id, name ),
      away_team:away_team_id ( id, name )
    `)
    .order('jornada', { ascending: true })
    .order('match_date', { ascending: true });

  if (error) {
    console.error('Error loading fixtures:', error);
    return;
  }

  cachedFixtures = data || [];
  fixtureSelect.innerHTML = '<option value="">Select fixture</option>';

  cachedFixtures.forEach(fixture => {
    const home = fixture.home_team?.name || 'Home';
    const away = fixture.away_team?.name || 'Away';
    fixtureSelect.innerHTML += `
      <option value="${fixture.id}">
        Jornada ${fixture.jornada} - ${home} vs ${away}
      </option>
    `;
  });
}

async function onFixtureChange() {
  const fixtureId = document.getElementById('fixture-select').value;
  const goalPlayerSelect = document.getElementById('goal-player-select');
  const cardPlayerSelect = document.getElementById('card-player-select');
  const scoreBox = document.getElementById('current-score-box');

  goalPlayerSelect.innerHTML = '<option value="">Select scorer</option>';
  cardPlayerSelect.innerHTML = '<option value="">Select player</option>';
  goalPlayerSelect.disabled = true;
  cardPlayerSelect.disabled = true;

  if (!fixtureId) {
    selectedFixture = null;
    scoreBox.innerHTML = 'Select a fixture to view score and events.';
    document.getElementById('match-goals-list').innerHTML = '<p class="text-sm text-gray-500">No fixture selected.</p>';
    document.getElementById('match-cards-list').innerHTML = '<p class="text-sm text-gray-500">No fixture selected.</p>';
    return;
  }

  selectedFixture = cachedFixtures.find(f => String(f.id) === String(fixtureId));
  if (!selectedFixture) return;

  renderScoreBox();

  const { data: players, error } = await supabaseClient
    .from('players')
    .select('id, name, team_id, position')
    .in('team_id', [selectedFixture.home_team_id, selectedFixture.away_team_id])
    .order('name', { ascending: true });

  if (error) {
    console.error('Error loading players:', error);
    return;
  }

  currentFixturePlayers = players || [];

  currentFixturePlayers.forEach(player => {
    const team = player.team_id === selectedFixture.home_team_id
      ? selectedFixture.home_team?.name
      : selectedFixture.away_team?.name;

    const option = `<option value="${player.id}">${player.name} (${team})</option>`;
    goalPlayerSelect.innerHTML += option;
    cardPlayerSelect.innerHTML += option;
  });

  goalPlayerSelect.disabled = false;
  cardPlayerSelect.disabled = false;

  await Promise.all([loadMatchGoals(), loadMatchCards()]);
}

function renderScoreBox() {
  const scoreBox = document.getElementById('current-score-box');
  if (!selectedFixture) return;

  const homeName = selectedFixture.home_team?.name || 'Home';
  const awayName = selectedFixture.away_team?.name || 'Away';
  const homeScore = selectedFixture.home_score ?? 0;
  const awayScore = selectedFixture.away_score ?? 0;
  const venue = selectedFixture.venue || 'Venue not set';
  const kickoff = selectedFixture.kickoff_time || '12:30';

  scoreBox.innerHTML = `
    <div class="space-y-2">
      <p class="text-xs uppercase font-black text-gray-500">Live score</p>
      <div class="text-xl font-black italic uppercase flex items-center justify-between gap-3">
        <span>${homeName}</span>
        <span class="bg-black text-white px-3 py-1 rounded">${homeScore} - ${awayScore}</span>
        <span>${awayName}</span>
      </div>
      <p class="text-xs font-bold text-gray-600">Kick-off: ${kickoff}</p>
      <p class="text-xs font-bold text-gray-600">${venue}</p>
    </div>
  `;
}

async function loadMatchGoals() {
  const list = document.getElementById('match-goals-list');

  if (!selectedFixture) {
    list.innerHTML = '<p class="text-sm text-gray-500">No fixture selected.</p>';
    return;
  }

  const { data, error } = await supabaseClient
    .from('goals')
    .select(`
      id,
      minute,
      player:player_id ( id, name ),
      team:team_id ( id, name )
    `)
    .eq('fixture_id', selectedFixture.id)
    .order('created_at', { ascending: true });

  if (error) {
    list.innerHTML = '<p class="text-sm text-red-600">Error loading match goals.</p>';
    return;
  }

  list.innerHTML = '';

  if (!data || data.length === 0) {
    list.innerHTML = '<p class="text-sm text-gray-500">No goals added yet.</p>';
    return;
  }

  data.forEach(goal => {
    list.innerHTML += `
      <div class="border rounded-lg p-4 bg-gray-50 flex justify-between items-center gap-3">
        <div>
          <p class="font-black">${goal.player?.name || 'Unknown player'}</p>
          <p class="text-xs text-gray-500 uppercase">${goal.team?.name || 'Unknown team'}</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-sm font-bold">${goal.minute ? `${goal.minute}'` : '—'}</div>
          <button
            type="button"
            data-goal-id="${goal.id}"
            class="delete-goal-btn text-xs font-black text-red-600 hover:text-black"
          >
            Delete
          </button>
        </div>
      </div>
    `;
  });
}

async function loadMatchCards() {
  const list = document.getElementById('match-cards-list');

  if (!selectedFixture) {
    list.innerHTML = '<p class="text-sm text-gray-500">No fixture selected.</p>';
    return;
  }

  const { data, error } = await supabaseClient
    .from('cards')
    .select(`
      id,
      minute,
      card_type,
      player:player_id ( id, name ),
      team:team_id ( id, name )
    `)
    .eq('fixture_id', selectedFixture.id)
    .order('created_at', { ascending: true });

  if (error) {
    list.innerHTML = '<p class="text-sm text-red-600">Error loading match cards.</p>';
    return;
  }

  list.innerHTML = '';

  if (!data || data.length === 0) {
    list.innerHTML = '<p class="text-sm text-gray-500">No cards added yet.</p>';
    return;
  }

  data.forEach(card => {
    const badge = card.card_type === 'red'
      ? '<span class="font-black text-red-600">🟥 RED</span>'
      : '<span class="font-black text-yellow-500">🟨 YELLOW</span>';

    list.innerHTML += `
      <div class="border rounded-lg p-4 bg-gray-50 flex justify-between items-center gap-3">
        <div>
          <p class="font-black">${card.player?.name || 'Unknown player'}</p>
          <p class="text-xs text-gray-500 uppercase">${card.team?.name || 'Unknown team'}</p>
        </div>
        <div class="flex items-center gap-3">
          ${badge}
          <div class="text-sm font-bold">${card.minute ? `${card.minute}'` : '—'}</div>
          <button
            type="button"
            data-card-id="${card.id}"
            class="delete-card-btn text-xs font-black text-red-600 hover:text-black"
          >
            Delete
          </button>
        </div>
      </div>
    `;
  });
}

async function recalculateFixtureScore(fixtureId) {
  const fixture = cachedFixtures.find(f => String(f.id) === String(fixtureId));
  if (!fixture) throw new Error('Fixture not found.');

  const { data: goals, error } = await supabaseClient
    .from('goals')
    .select('team_id')
    .eq('fixture_id', fixtureId);

  if (error) throw error;

  let homeScore = 0;
  let awayScore = 0;

  (goals || []).forEach(goal => {
    if (goal.team_id === fixture.home_team_id) homeScore += 1;
    if (goal.team_id === fixture.away_team_id) awayScore += 1;
  });

  const { error: updateError } = await supabaseClient
    .from('fixtures')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished'
    })
    .eq('id', fixtureId);

  if (updateError) throw updateError;

  fixture.home_score = homeScore;
  fixture.away_score = awayScore;
  fixture.status = 'finished';
}

async function recalculatePlayerStats() {
  const { data: players, error: playersError } = await supabaseClient
    .from('players')
    .select('id, team_id, position');

  if (playersError) throw playersError;

  for (const player of players || []) {
    const { count: goalCount, error: goalCountError } = await supabaseClient
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', player.id);

    if (goalCountError) throw goalCountError;

    const { data: yellowRows, error: yellowError } = await supabaseClient
      .from('cards')
      .select('id')
      .eq('player_id', player.id)
      .eq('card_type', 'yellow');

    if (yellowError) throw yellowError;

    const { data: redRows, error: redError } = await supabaseClient
      .from('cards')
      .select('id')
      .eq('player_id', player.id)
      .eq('card_type', 'red');

    if (redError) throw redError;

    let conceded = 0;

    if ((player.position || '').toUpperCase() === 'GK') {
      const { data: fixturesForTeam, error: fixturesError } = await supabaseClient
        .from('fixtures')
        .select('home_team_id, away_team_id, home_score, away_score')
        .or(`home_team_id.eq.${player.team_id},away_team_id.eq.${player.team_id}`)
        .not('home_score', 'is', null)
        .not('away_score', 'is', null);

      if (fixturesError) throw fixturesError;

      (fixturesForTeam || []).forEach(fixture => {
        if (fixture.home_team_id === player.team_id) conceded += fixture.away_score ?? 0;
        if (fixture.away_team_id === player.team_id) conceded += fixture.home_score ?? 0;
      });
    }

    const { error: updateError } = await supabaseClient
      .from('players')
      .update({
        goals: goalCount || 0,
        yellow_cards: (yellowRows || []).length,
        red_cards: (redRows || []).length,
        goals_conceded: conceded
      })
      .eq('id', player.id);

    if (updateError) throw updateError;
  }
}

async function recalculateLeagueTable() {
  const { data: teams, error: teamsError } = await supabaseClient
    .from('teams')
    .select('id');

  if (teamsError) throw teamsError;

  const { data: fixtures, error: fixturesError } = await supabaseClient
    .from('fixtures')
    .select('home_team_id, away_team_id, home_score, away_score')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null);

  if (fixturesError) throw fixturesError;

  const statsMap = new Map();

  (teams || []).forEach(team => {
    statsMap.set(team.id, {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      goals_for: 0,
      goals_against: 0
    });
  });

  (fixtures || []).forEach(fixture => {
    const home = statsMap.get(fixture.home_team_id);
    const away = statsMap.get(fixture.away_team_id);
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;

    home.goals_for += fixture.home_score;
    home.goals_against += fixture.away_score;

    away.goals_for += fixture.away_score;
    away.goals_against += fixture.home_score;

    if (fixture.home_score > fixture.away_score) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (fixture.away_score > fixture.home_score) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  for (const [teamId, stats] of statsMap.entries()) {
    const { error } = await supabaseClient
      .from('teams')
      .update(stats)
      .eq('id', teamId);

    if (error) throw error;
  }
}

async function addGoal(event) {
  event.preventDefault();

  if (!selectedFixture) {
    setMessage('goal-message', 'Please select a fixture first.', true);
    return;
  }

  const playerId = document.getElementById('goal-player-select').value;
  const minuteRaw = document.getElementById('goal-minute').value;

  if (!playerId) {
    setMessage('goal-message', 'Please select a scorer.', true);
    return;
  }

  const selectedPlayer = currentFixturePlayers.find(p => String(p.id) === String(playerId));
  if (!selectedPlayer) {
    setMessage('goal-message', 'Scorer not found.', true);
    return;
  }

  const { error } = await supabaseClient
    .from('goals')
    .insert([{
      fixture_id: selectedFixture.id,
      player_id: selectedPlayer.id,
      team_id: selectedPlayer.team_id,
      minute: minuteRaw ? parseInt(minuteRaw, 10) : null
    }]);

  if (error) {
    setMessage('goal-message', error.message, true);
    return;
  }

  try {
    await recalculateFixtureScore(selectedFixture.id);
    await recalculatePlayerStats();
    await recalculateLeagueTable();
    renderScoreBox();
    await loadMatchGoals();
    document.getElementById('goal-form').reset();
    setMessage('goal-message', 'Goal added and table updated.');
  } catch (e) {
    setMessage('goal-message', e.message, true);
  }
}

async function addCard(event) {
  event.preventDefault();

  if (!selectedFixture) {
    setMessage('card-message', 'Please select a fixture first.', true);
    return;
  }

  const playerId = document.getElementById('card-player-select').value;
  const cardType = document.getElementById('card-type').value;
  const minuteRaw = document.getElementById('card-minute').value;

  if (!playerId) {
    setMessage('card-message', 'Please select a player.', true);
    return;
  }

  const selectedPlayer = currentFixturePlayers.find(p => String(p.id) === String(playerId));
  if (!selectedPlayer) {
    setMessage('card-message', 'Player not found.', true);
    return;
  }

  const { error } = await supabaseClient
    .from('cards')
    .insert([{
      fixture_id: selectedFixture.id,
      player_id: selectedPlayer.id,
      team_id: selectedPlayer.team_id,
      card_type: cardType,
      minute: minuteRaw ? parseInt(minuteRaw, 10) : null
    }]);

  if (error) {
    setMessage('card-message', error.message, true);
    return;
  }

  try {
    await recalculatePlayerStats();
    await loadMatchCards();
    document.getElementById('card-form').reset();
    setMessage('card-message', 'Card added.');
  } catch (e) {
    setMessage('card-message', e.message, true);
  }
}

async function deleteGoal(goalId) {
  const { error } = await supabaseClient
    .from('goals')
    .delete()
    .eq('id', goalId);

  if (error) return;

  await recalculateFixtureScore(selectedFixture.id);
  await recalculatePlayerStats();
  await recalculateLeagueTable();
  renderScoreBox();
  await loadMatchGoals();
}

async function deleteCard(cardId) {
  const { error } = await supabaseClient
    .from('cards')
    .delete()
    .eq('id', cardId);

  if (error) return;

  await recalculatePlayerStats();
  await loadMatchCards();
}

document.addEventListener('click', async (event) => {
  const goalBtn = event.target.closest('.delete-goal-btn');
  const cardBtn = event.target.closest('.delete-card-btn');

  if (goalBtn) {
    await deleteGoal(goalBtn.dataset.goalId);
  }

  if (cardBtn) {
    await deleteCard(cardBtn.dataset.cardId);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await requireSession();
  if (!ok) return;

  document.getElementById('logout-btn')?.addEventListener('click', logout);
  document.getElementById('fixture-select')?.addEventListener('change', onFixtureChange);
  document.getElementById('goal-form')?.addEventListener('submit', addGoal);
  document.getElementById('card-form')?.addEventListener('submit', addCard);

  await loadFixtures();
});