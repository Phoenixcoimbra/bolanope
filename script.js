// --- 1. DATA CONFIGURATION ---
const teams = [
    { name: 'Kwanzas FC', j: 0, v: 0, e: 0, d: 0, pts: 0 },
    { name: 'Valentes de Woolwich', j: 0, v: 0, e: 0, d: 0, pts: 0 },
    { name: 'Pedras Negras', j: 0, v: 0, e: 0, d: 0, pts: 0 },
    { name: 'Bola no Pé', j: 0, v: 0, e: 0, d: 0, pts: 0 },
    { name: 'Jipangue', j: 0, v: 0, e: 0, d: 0, pts: 0 }
];

const players = [
    { name: 'Exemplo Jogador', team: 'Kwanzas FC', goals: 0, yellow: 0, red: 0 },
];

// DATA: Add scores here. Use 'score: "2-1"' for finished games or 'score: ""' for upcoming.
const fixtures = [
    { j: 1, date: '25 Abr', h: 'Kwanzas FC', a: 'Jipangue', rest: 'Pedras Negras', score: "" },
    { j: 1, date: '25 Abr', h: 'Valentes de Woolwich', a: 'Bola no Pé', rest: 'Pedras Negras', score: "" },
    { j: 2, date: '02 Mai', h: 'Pedras Negras', a: 'Kwanzas FC', rest: 'Bola no Pé', score: "" },
    { j: 2, date: '02 Mai', h: 'Jipangue', a: 'Valentes de Woolwich', rest: 'Bola no Pé', score: "" },
    { j: 3, date: '09 Mai', h: 'Kwanzas FC', a: 'Valentes de Woolwich', rest: 'Jipangue', score: "" },
    { j: 3, date: '09 Mai', h: 'Pedras Negras', a: 'Bola no Pé', rest: 'Jipangue', score: "" },
    { j: 4, date: '16 Mai', h: 'Bola no Pé', a: 'Kwanzas FC', rest: 'Valentes de Woolwich', score: "" },
    { j: 4, date: '16 Mai', h: 'Pedras Negras', a: 'Jipangue', rest: 'Valentes de Woolwich', score: "" },
    { j: 5, date: '23 Mai', h: 'Valentes de Woolwich', a: 'Pedras Negras', rest: 'Kwanzas FC', score: "" },
    { j: 5, date: '23 Mai', h: 'Jipangue', a: 'Bola no Pé', rest: 'Kwanzas FC', score: "" },
    // SEGUNDA VOLTA (Swapped Home/Away)
    { j: 6, date: '30 Mai', h: 'Jipangue', a: 'Kwanzas FC', rest: 'Pedras Negras', score: "" },
    { j: 6, date: '30 Mai', h: 'Bola no Pé', a: 'Valentes de Woolwich', rest: 'Pedras Negras', score: "" },
    { j: 7, date: '06 Jun', h: 'Kwanzas FC', a: 'Pedras Negras', rest: 'Bola no Pé', score: "" },
    { j: 7, date: '06 Jun', h: 'Valentes de Woolwich', a: 'Jipangue', rest: 'Bola no Pé', score: "" },
    { j: 8, date: '13 Jun', h: 'Valentes de Woolwich', a: 'Kwanzas FC', rest: 'Jipangue', score: "" },
    { j: 8, date: '13 Jun', h: 'Bola no Pé', a: 'Pedras Negras', rest: 'Jipangue', score: "" },
    { j: 9, date: '20 Jun', h: 'Kwanzas FC', a: 'Bola no Pé', rest: 'Valentes de Woolwich', score: "" },
    { j: 9, date: '20 Jun', h: 'Jipangue', a: 'Pedras Negras', rest: 'Valentes de Woolwich', score: "" },
    { j: 10, date: '27 Jun', h: 'Pedras Negras', a: 'Valentes de Woolwich', rest: 'Kwanzas FC', score: "" },
    { j: 10, date: '27 Jun', h: 'Bola no Pé', a: 'Jipangue', rest: 'Kwanzas FC', score: "" }
];

// --- 2. RENDERING FUNCTIONS ---

function renderFixtures() {
    const nextCont = document.getElementById('next-fixture-container');
    const allCont = document.getElementById('all-fixtures-container');
    if(!nextCont || !allCont) return;

    nextCont.innerHTML = ''; 
    allCont.innerHTML = ''; 

    const today = new Date();
    // Logic to find the current upcoming Jornada
    const nextJornadaMatch = fixtures.find(f => {
        const monthMap = { 'Abr': '04', 'Mai': '05', 'Jun': '06' };
        const [day, monthStr] = f.date.split(' ');
        const matchDate = new Date(`2026-${monthMap[monthStr]}-${day}`);
        return matchDate >= today.setHours(0,0,0,0) && (!f.score || f.score === "");
    }) || fixtures[0];

    const nextJornadaNumber = nextJornadaMatch.j;
    let currentJornada = 0;

    fixtures.forEach(f => {
        // Handle Score vs Time display
        const displayStatus = (f.score && f.score !== "") 
            ? `<span class="bg-black text-white px-3 py-1 rounded font-black text-sm tracking-widest">${f.score}</span>` 
            : `<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold">12:30</span>`;

        // Highlight Winner Logic
        let hClass = "", aClass = "";
        if(f.score && f.score.includes('-')) {
            const [hS, aS] = f.score.split('-').map(Number);
            if(hS > aS) hClass = "text-green-600 font-black";
            if(aS > hS) aClass = "text-green-600 font-black";
        }

        const cardHtml = `
            <div class="bg-white p-4 rounded shadow-sm border flex justify-between items-center border-l-4 border-l-green-500">
                <div class="text-sm font-bold flex-1">
                    <span class="${hClass}">${f.h}</span>
                    <span class="text-gray-300 mx-1 text-[10px]">VS</span>
                    <span class="${aClass}">${f.a}</span>
                </div>
                <div class="ml-4">${displayStatus}</div>
            </div>
        `;

        // Group by Jornada in "All" view
        if(f.j !== currentJornada) {
            currentJornada = f.j;
            allCont.innerHTML += `
                <div class="col-span-full mt-6 mb-2">
                    <div class="flex justify-between items-center bg-gray-200 px-4 py-1 rounded shadow-sm">
                        <span class="font-black text-xs uppercase text-gray-700 font-black">Jornada ${f.j} — ${f.date}</span>
                        <span class="text-[9px] font-bold text-gray-500 uppercase italic">Descansa: ${f.rest}</span>
                    </div>
                </div>`;
        }
        allCont.innerHTML += cardHtml;
        if(f.j === nextJornadaNumber) nextCont.innerHTML += cardHtml;
    });
}

function renderStats() {
    const tableBody = document.getElementById('league-table-body');
    const scorersList = document.getElementById('top-scorers-list');
    const discList = document.getElementById('discipline-list');

    // Render League Table
    if(tableBody) {
        tableBody.innerHTML = '';
        teams.sort((a,b) => b.pts - a.pts).forEach(t => {
            tableBody.innerHTML += `<tr class="border-b hover:bg-gray-50 transition">
                <td class="p-4 font-bold text-blue-900">${t.name}</td>
                <td class="p-4 text-center font-semibold text-gray-600">${t.j}</td>
                <td class="p-4 text-center text-green-600 font-bold">${t.v}</td>
                <td class="p-4 text-center font-black bg-gray-50">${t.pts}</td>
            </tr>`;
        });
    }

    // Render Top Scorers & Discipline
    players.forEach(p => {
        if(p.goals > 0 && scorersList) {
            scorersList.innerHTML += `<div class="flex justify-between items-center p-4 border-b">
                <span><span class="font-bold">${p.name}</span> <small class="text-gray-400 block uppercase">${p.team}</small></span>
                <span class="text-2xl font-black text-green-600">${p.goals}</span>
            </div>`;
        }
        if((p.yellow > 0 || p.red > 0) && discList) {
            discList.innerHTML += `<div class="flex justify-between items-center p-4 border-b bg-red-50/50">
                <span><span class="font-bold text-sm">${p.name}</span> <small class="block text-red-500 font-bold italic text-[10px]">Multas: £${(p.yellow*5)+(p.red*10)}</small></span>
                <span class="font-bold text-sm">🟨 ${p.yellow} 🟥 ${p.red}</span>
            </div>`;
        }
    });
}

// --- 3. TAB CONTROLLER ---
function showTab(tab) {
    const nextCont = document.getElementById('next-fixture-container');
    const allCont = document.getElementById('all-fixtures-container');
    const btnNext = document.getElementById('btn-next');
    const btnAll = document.getElementById('btn-all');

    if(tab === 'next') {
        nextCont.classList.remove('hidden');
        allCont.classList.add('hidden');
        btnNext.className = "px-4 py-2 rounded-lg font-bold text-sm bg-green-600 text-white shadow-md";
        btnAll.className = "px-4 py-2 rounded-lg font-bold text-sm bg-gray-200 text-gray-700";
    } else {
        allCont.classList.remove('hidden');
        nextCont.classList.add('hidden');
        btnAll.className = "px-4 py-2 rounded-lg font-bold text-sm bg-green-600 text-white shadow-md";
        btnNext.className = "px-4 py-2 rounded-lg font-bold text-sm bg-gray-200 text-gray-700";
    }
}

// Initialize everything on load
document.addEventListener('DOMContentLoaded', () => {
    renderFixtures();
    renderStats();
});