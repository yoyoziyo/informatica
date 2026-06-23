// 1. Importando as funções necessárias do Firebase via CDN (Web)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 2. Suas configurações oficiais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAddhKyVCMmTwQ7Y_BKt4t7DyGKilJTsf4",
  authDomain: "emef-informatica.firebaseapp.com",
  databaseURL: "https://emef-informatica-default-rtdb.firebaseio.com",
  projectId: "emef-informatica",
  storageBucket: "emef-informatica.firebasestorage.app",
  messagingSenderId: "866544145716",
  appId: "1:866544145716:web:ca8107de8a13a8096b4161",
  measurementId: "G-S3KYWR42PD"
};

// Inicializando o Firebase e o Realtime Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Configuração Estática dos Horários da EMEF Vilma
const hours = [
    { id: "h1", range: "12:30 - 13:20", label: "1ª Aula" },
    { id: "h2", range: "13:20 - 14:10", label: "2ª Aula" },
    { id: "interval", range: "14:10 - 14:30", label: "INTERVALO" },
    { id: "h3", range: "14:30 - 15:20", label: "3ª Aula" },
    { id: "h4", range: "15:20 - 16:10", label: "4ª Aula" }
];

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

// Aulas Fixas de Tecnologia (Apenas para Informática)
const fixedClasses = {
    "Terça-h2": "4ºC - Heloísa",
    "Terça-h4": "4ºB - Heloísa",
    "Quarta-h3": "3ºE - Heloísa",
    "Quarta-h4": "4ºA - Heloísa",
    "Quinta-h1": "5ºC - Heloísa",
    "Quinta-h2": "3ºB - Isabel",
    "Quinta-h3": "3ºA / 4ºD",
    "Quinta-h4": "3ºC / 5ºA",
    "Sexta-h1": "5ºB - Heloísa",
    "Sexta-h2": "5ºC - Heloísa"
};

let currentWeekOffset = 0;
let bookings = {};
let currentSlotKey = null;
let currentWeekKey = "";
let isFirstLoad = true; 

// Rota específica do banco da informática
const PATH_BANCO = 'bookings'; 

function getWeekDates(offset) {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    monday.setDate(today.getDate() + distanceToMonday + (offset * 7));

    const weekDates = [];
    for (let i = 0; i < 5; i++) {
        const nextDay = new Date(monday);
        nextDay.setDate(monday.getDate() + i);
        weekDates.push(nextDay);
    }
    return weekDates;
}

function formatShortDate(date) {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getWeekId(dates) {
    const start = dates[0].toISOString().split('T')[0];
    const end = dates[4].toISOString().split('T')[0];
    return `${start}_${end}`;
}

// OUVINTE EM TEMPO REAL
const bookingsRef = ref(db, PATH_BANCO);
onValue(bookingsRef, (snapshot) => {
    bookings = snapshot.val() || {};
    renderView();
    
    // Rola automaticamente para o dia atual se for a primeira abertura da página
    if (isFirstLoad) {
        scrollToCurrentDay();
        isFirstLoad = false;
    }
});

function scrollToCurrentDay() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex
    
    if (currentWeekOffset === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) {
        setTimeout(() => {
            const container = document.getElementById("mobile-body");
            if (container) {
                const cards = container.getElementsByClassName("mobile-day-card");
                const targetIndex = dayOfWeek - 1;
                
                if (cards && cards[targetIndex]) {
                    const cardWidth = cards[targetIndex].offsetWidth;
                    container.scrollLeft = (cardWidth + 16) * targetIndex; 
                }
            }
        }, 300);
    }
}

window.changeWeek = function(direction) {
    currentWeekOffset += direction;
    renderView();
};

window.closeModal = function() {
    document.getElementById("modal-overlay").classList.remove("active");
};

window.saveBooking = function() {
    const prof = document.getElementById("prof-name-input").value.trim();
    const series = document.getElementById("series-input").value.trim();

    if (!prof || !series) {
        alert("Atenção: É necessário preencher o Nome e a Série!");
        return;
    }

    set(ref(db, `${PATH_BANCO}/${currentWeekKey}/${currentSlotKey}`), { prof, series })
    .then(() => window.closeModal())
    .catch((error) => alert("Erro ao salvar: " + error.message));
};

window.deleteBooking = function() {
    if (confirm("Deseja mesmo cancelar esta reserva e liberar a sala?")) {
        set(ref(db, `${PATH_BANCO}/${currentWeekKey}/${currentSlotKey}`), null)
        .then(() => window.closeModal());
    }
};

window.openSlot = function(day, hourId, range, fullDayLabel) {
    currentSlotKey = `${day}-${hourId}`;
    document.getElementById("modal-datetime").innerText = `${fullDayLabel} — ${range}`;
    
    const weekBookings = bookings[currentWeekKey] || {};

    if (weekBookings[currentSlotKey]) {
        document.getElementById("modal-title").innerText = "Horário Reservado";
        document.getElementById("form-container").style.display = "none";
        document.getElementById("view-container").style.display = "block";
        document.getElementById("view-prof").innerText = weekBookings[currentSlotKey].prof;
        document.getElementById("view-series").innerText = weekBookings[currentSlotKey].series;
    } else {
        document.getElementById("modal-title").innerText = "Agendar Laboratório";
        document.getElementById("form-container").style.display = "block";
        document.getElementById("view-container").style.display = "none";
        document.getElementById("prof-name-input").value = "";
        document.getElementById("series-input").value = "";
    }
    document.getElementById("modal-overlay").classList.add("active");
};

function renderView() {
    const dates = getWeekDates(currentWeekOffset);
    currentWeekKey = getWeekId(dates);

    document.getElementById("current-week-label").innerText = `${formatShortDate(dates[0])} até ${formatShortDate(dates[4])}`;

    const desktopHeader = document.getElementById("desktop-header");
    desktopHeader.innerHTML = `<th>Horário</th>` + days.map((day, idx) => `<th>${day}<span class="date-sub">${formatShortDate(dates[idx])}</span></th>`).join('');

    const desktopBody = document.getElementById("desktop-body");
    desktopBody.innerHTML = "";

    const mobileBody = document.getElementById("mobile-body");
    mobileBody.innerHTML = "";

    const weekBookings = bookings[currentWeekKey] || {};

    // Desktop Build
    hours.forEach(hour => {
        const tr = document.createElement("tr");
        if (hour.id === "interval") {
            tr.className = "interval-row";
            tr.innerHTML = `<td class="time-cell">${hour.range}<span class="time-label">${hour.label}</span></td><td colspan="5">INTERVALO BLOQUEADO</td>`;
            desktopBody.appendChild(tr);
            return;
        }

        let rowHTML = `<td class="time-cell">${hour.range}<span class="time-label">${hour.label}</span></td>`;

        days.forEach(day => {
            const fixedKey = `${day}-${hour.id}`;
            const bookingKey = `${day}-${hour.id}`;

            if (fixedClasses[fixedKey]) {
                rowHTML += `<td class="cell-fixed">
                                <span class="status-badge">Fixo</span>
                                <span class="fixed-title">${fixedClasses[fixedKey]}</span>
                            </td>`;
            } else if (weekBookings[bookingKey]) {
                const b = weekBookings[bookingKey];
                rowHTML += `<td class="cell-occupied" onclick="openSlot('${day}', '${hour.id}', '${hour.range}', '${day} (${formatShortDate(dates[days.indexOf(day)])})')">
                                <span class="status-badge">Reservado</span>
                                <span class="cell-prof">${b.prof}</span>
                                <span class="cell-series">${b.series}</span>
                            </td>`;
            } else {
                rowHTML += `<td class="cell-free" onclick="openSlot('${day}', '${hour.id}', '${hour.range}', '${day} (${formatShortDate(dates[days.indexOf(day)])})')">
                                <span class="status-badge">Livre</span>
                                <div style="font-size:12px; font-weight:700; opacity:0.7;">Disponível</div>
                            </td>`;
            }
        });
        tr.innerHTML = rowHTML;
        desktopBody.appendChild(tr);
    });

    // Mobile Build
    days.forEach((day, dayIdx) => {
        const card = document.createElement("div");
        card.className = "mobile-day-card";
        
        let cardHTML = `<div class="mobile-day-header"><span>${day}</span><span>${formatShortDate(dates[dayIdx])}</span></div>`;
        cardHTML += `<div class="mobile-slots">`;

        hours.forEach(hour => {
            const fixedKey = `${day}-${hour.id}`;
            const bookingKey = `${day}-${hour.id}`;
            const fullDayLabel = `${day} (${formatShortDate(dates[dayIdx])})`;
            
            cardHTML += `<div class="mobile-slot-row">
                            <div class="mobile-time-info">
                                <div class="mobile-time-range">${hour.range}</div>
                                <div class="mobile-time-num">${hour.label}</div>
                            </div>`;

            if (hour.id === "interval") {
                cardHTML += `<div class="mobile-slot-status" style="background:var(--bg-interval); color:var(--text-interval); font-weight:700; font-size:11px; text-align:center; letter-spacing:1px; border:none; cursor:not-allowed;">INTERVALO</div>`;
            } else if (fixedClasses[fixedKey]) {
                cardHTML += `<div class="mobile-slot-status cell-fixed">
                                <span class="status-badge">Fixo</span>
                                <div style="font-weight:700; font-size:12px;">${fixedClasses[fixedKey]}</div>
                             </div>`;
            } else if (weekBookings[bookingKey]) {
                const b = weekBookings[bookingKey];
                cardHTML += `<div class="mobile-slot-status cell-occupied" onclick="openSlot('${day}', '${hour.id}', '${hour.range}', '${fullDayLabel}')">
                                <span class="status-badge">Reservado</span>
                                <div class="cell-prof">${b.prof}</div>
                                <div class="cell-series">${b.series}</div>
                             </div>`;
            } else {
                cardHTML += `<div class="mobile-slot-status cell-free" onclick="openSlot('${day}', '${hour.id}', '${hour.range}', '${fullDayLabel}')">
                                <span class="status-badge">Livre</span>
                                <div style="font-size:11px; opacity:0.8;">Disponível para agendamento</div>
                             </div>`;
            }

            cardHTML += `</div>`;
        });

        cardHTML += `</div>`;
        card.innerHTML = cardHTML;
        mobileBody.appendChild(card);
    });
}

// Inicia sistema
window.onload = function() {
    // Sincroniza loop secundário a cada 10 segundos apenas em caso de queda de websocket
    setInterval(() => {
        onValue(ref(db, PATH_BANCO), (snapshot) => {
            bookings = snapshot.val() || {};
            renderView();
        }, { onlyOnce: true });
    }, 10000);
};
