// --- DATA: EDIT THIS SECTION AFTER THE GAMES ---

const teams = [
    { name: 'Kwanzas FC', j: 0, v: 0, e: 0, d: 0, pts: 0 },
    { name: 'Valentes de Woolwich', j: 0, v: 0, e: 0, d: 0, pts: 0 },
    { name: 'Pedras Negras', j: 0, v: 0, e: 0, d: 0, pts: 0 },
    { name: 'Bola no Pé', j: 0, v: 0, e: 0, d: 0, pts: 0 },
    { name: 'Jipangue', j: 0, v: 0, e: 0, d: 0, pts: 0 }
];

const players = [
    { name: 'Exemplo Jogador 1', team: 'Kwanzas FC', goals: 0, yellow: 0, red: 0 },
    { name: 'Exemplo Jogador 2', team: 'Jipangue', goals: 0, yellow: 0, red: 0 },
    // Adicione mais jogadores conforme necessário
];

const fixtures = [
    { jornada: 1, date: '25 Abr', h: 'Kwanzas FC', a: 'Jipangue', status: '12:30' },
    { jornada: 1, date: '25 Abr', h: 'Valentes', a: 'Bola no Pé', status: '12:30' },
    { jornada: 2, date: '02 Mai', h: 'Pedras Negras', a: 'Kwanzas FC', status: '12:30' },
    { jornada: 2, date: '02 Mai', h: 'Jipangue', a: 'Valentes', status: '12:30' }
    // Adicione o resto das jornadas seguindo este padrão
];

// --- LOGIC: RENDERING THE SITE (Don't change unless editing design) ---

// 1. Render Table
const tableBody = document.getElementById('league-table-body');
teams.sort((a,b) => b.pts - a.pts).forEach(t => {
    tableBody.innerHTML += `
        <tr class="border-b hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-blue-900">${t.name}</td>
            <td class="p-4 text-center font-medium">${t.j}</td>
            <td class="p-4 text-center text-green-600">${t.v}</td>
            <td class="p-4 text-center text-gray-500">${t.e}</td>
            <td class="p-4 text-center text-red-500">${t.d}</td>
            <td class="p-4 text-center font-black text-lg">${t.pts}</td>
        </tr>
    `;
});

// 2. Render Fixtures
const fixtureContainer = document.getElementById('fixtures-container');
fixtures.forEach(f => {
    fixtureContainer.innerHTML += `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded">JORNADA ${f.jornada}</span>
                <span class="text-xs text-gray-400 font-bold">${f.date}</span>
            </div>
            <div class="flex justify-between items-center py-2 text-sm font-bold">
                <span>${f.h}</span>
                <span class="text-green-600 mx-2 uppercase text-[10px]">vs</span>
                <span>${f.a}</span>
            </div>
            <div class="text-center text-[10px] text-gray-400 mt-2 border-t pt-2 italic">
                Status: ${f.status}
            </div>
        </div>
    `;
});

// 3. Render Stats
const scorersList = document.getElementById('top-scorers-list');
players.sort((a,b) => b.goals - a.goals).forEach(p => {
    if(p.goals > 0) {
        scorersList.innerHTML += `
            <div class="flex justify-between items-center p-4 border-b last:border-0">
                <div>
                    <p class="font-bold">${p.name}</p>
                    <p class="text-[10px] text-gray-400 uppercase tracking-widest">${p.team}</p>
                </div>
                <div class="text-2xl font-black text-green-600">${p.goals}</div>
            </div>
        `;
    }
});

// 4. Render Discipline
const disciplineList = document.getElementById('discipline-list');
players.forEach(p => {
    if(p.yellow > 0 || p.red > 0) {
        disciplineList.innerHTML += `
            <div class="flex justify-between items-center p-4 border-b last:border-0 bg-red-50/30">
                <div>
                    <p class="font-bold text-sm">${p.name}</p>
                    <p class="text-[10px] text-gray-500 italic">Total Multa: £${(p.yellow * 5) + (p.red * 10)}</p>
                </div>
                <div class="flex space-x-4">
                    <div class="text-center"><span class="block text-xs font-bold text-yellow-600">🟨</span> ${p.yellow}</div>
                    <div class="text-center"><span class="block text-xs font-bold text-red-600">🟥</span> ${p.red}</div>
                </div>
            </div>
        `;
    }
});