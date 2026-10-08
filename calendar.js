"use strict";
// Отрывной календарь: загиб страницы (как в Apple Books), отрыв, полёт листа, возврат.
// Без зависимостей. Компиляция: tsc calendar.ts --target ES2019
var _a;
const FLIGHT_DEFAULT = { g: 1, drag: 0, sway: 0, life: 1.1, flutter: 16 };
const v = (x, y) => ({ x, y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
/* ───────────────────────── Даты и данные ───────────────────────── */
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const HOLIDAYS = {
    '01-01': { name: 'Новый год', off: true },
    '01-02': { name: 'Новогодние каникулы', off: true },
    '01-03': { name: 'Новогодние каникулы', off: true },
    '01-04': { name: 'Новогодние каникулы', off: true },
    '01-05': { name: 'Новогодние каникулы', off: true },
    '01-06': { name: 'Новогодние каникулы', off: true },
    '01-07': { name: 'Рождество Христово', off: true },
    '01-08': { name: 'Новогодние каникулы', off: true },
    '02-14': { name: 'День всех влюблённых', off: false },
    '02-23': { name: 'День защитника Отечества', off: true },
    '03-08': { name: 'Международный женский день', off: true },
    '04-12': { name: 'День космонавтики', off: false },
    '05-01': { name: 'Праздник Весны и Труда', off: true },
    '05-09': { name: 'День Победы', off: true },
    '06-01': { name: 'День защиты детей', off: false },
    '06-12': { name: 'День России', off: true },
    '09-01': { name: 'День знаний', off: false },
    '10-05': { name: 'День учителя', off: false },
    '11-04': { name: 'День народного единства', off: true },
    '12-31': { name: 'Канун Нового года', off: false },
};
const NOTES = [
    ['Новый год ещё пахнет мандаринами — не спешите его распаковывать.', 'Короткий день — хороший повод для длинного разговора.', 'Снег скрипит громче всего в самые тихие утра.'],
    ['Февраль короток, будто знает, что его ждут не все.', 'Под снегом уже идёт работа, которой пока не видно.', 'Даже самая длинная зима заканчивается в марте.'],
    ['Капель — это зима, которая наконец разговорилась.', 'Первый тёплый луч стоит того, чтобы остановиться на минуту.', 'Окна пора мыть хотя бы ради света.'],
    ['Земля оттаивает медленно, и это правильно.', 'Скворцы возвращаются без опозданий, хоть и без календаря.', 'Весенняя грязь — тоже признак жизни.'],
    ['Сирень не умеет цвести вполсилы.', 'Вечера становятся длиннее, а планы — смелее.', 'Посаженное сегодня вспомнится в августе.'],
    ['Самые светлые ночи года — не время для штор.', 'Земляника прячется ниже, чем кажется.', 'Лето начинается, когда перестаёшь его ждать.'],
    ['Жара уходит вечером — выходите вместе с ней.', 'Гроза за городом пахнет иначе, чем в городе.', 'Половина лета — это всё ещё целое лето.'],
    ['Август пересчитывает звёзды и яблоки.', 'Вечера уже прохладнее, возьмите плед.', 'Грибник встаёт раньше солнца и не жалеет об этом.'],
    ['Сентябрь пахнет новыми тетрадями в любом возрасте.', 'Бабье лето короткое — не откладывайте прогулку.', 'Паутинки летят туда, где теплее.'],
    ['Листья уходят без спешки. Можно и вам.', 'Октябрь освещает улицы жёлтым лучше фонарей.', 'Чай вкуснее, когда за окном дождь.'],
    ['Ноябрь — серый лист, на котором хорошо видны огни окон.', 'Первый снег почти всегда тает, но запоминается.', 'Тёмные вечера созданы для книг и долгих писем.'],
    ['Декабрь торопит, а вы не торопитесь.', 'Ёлку лучше выбирать по запаху, а не по росту.', 'Самый короткий день — уже шаг к весне.'],
];
const pad2 = (n) => String(n).padStart(2, '0');
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayIndex = (d) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
const dayOfYear = (d) => dayIndex(d) - dayIndex(new Date(d.getFullYear(), 0, 1)) + 1;
const daysInYear = (y) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);
const isoKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const wd = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - wd);
    const y0 = Date.UTC(t.getUTCFullYear(), 0, 1);
    return Math.ceil(((t.getTime() - y0) / 864e5 + 1) / 7);
}
function plural(n, f) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20)
        return f[2];
    if (b > 1 && b < 5)
        return f[1];
    if (b === 1)
        return f[0];
    return f[2];
}
// Восход и закат (алгоритм NOAA), Москва, UTC+3
function sunTimes(d, lat = 55.7558, lon = 37.6173, tz = 3) {
    const N = daysInYear(d.getFullYear());
    const g = (2 * Math.PI / N) * (dayOfYear(d) - 1);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
        + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const la = lat * Math.PI / 180;
    const cosH = Math.cos(90.833 * Math.PI / 180) / (Math.cos(la) * Math.cos(decl)) - Math.tan(la) * Math.tan(decl);
    const ha = Math.acos(clamp(cosH, -1, 1)) * 180 / Math.PI;
    const rise = 720 - 4 * (lon + ha) - eq + tz * 60;
    const set = 720 - 4 * (lon - ha) - eq + tz * 60;
    return { rise, set, len: set - rise };
}
const hm = (m) => { const r = Math.round(m); return `${pad2(Math.floor(r / 60) % 24)}:${pad2(r % 60)}`; };
function moonPhase(d) {
    const t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 9);
    const ref = Date.UTC(2000, 0, 6, 18, 14);
    const syn = 29.530588853;
    let age = ((t - ref) / 864e5) % syn;
    if (age < 0)
        age += syn;
    return age / syn;
}
const MOON_NAMES = ['Новолуние', 'Растущий серп', 'Первая четверть', 'Растущая луна', 'Полнолуние', 'Убывающая луна', 'Последняя четверть', 'Старая луна'];
const moonName = (p) => MOON_NAMES[Math.floor(p * 8 + 0.5) % 8];
function moonSvg(p) {
    const r = 10, top = `12 ${12 - r}`, bot = `12 ${12 + r}`;
    const rx = (Math.abs(Math.cos(2 * Math.PI * p)) * r).toFixed(2);
    const d = p < 0.5
        ? `M${top}A${r} ${r} 0 0 1 ${bot}A${rx} ${r} 0 0 ${p < 0.25 ? 0 : 1} ${top}Z`
        : `M${top}A${r} ${r} 0 0 0 ${bot}A${rx} ${r} 0 0 ${p > 0.75 ? 1 : 0} ${top}Z`;
    return `<svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><circle class="moon-dark" cx="12" cy="12" r="10"/><path class="moon-lit" d="${d}"/><circle class="moon-ring" cx="12" cy="12" r="10"/></svg>`;
}
function pageHTML(d) {
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate(), wd = d.getDay();
    const hol = HOLIDAYS[`${pad2(m + 1)}-${pad2(day)}`];
    const red = wd === 0 || wd === 6 || (hol ? hol.off : false);
    const sun = sunTimes(d);
    const len = Math.round(sun.len);
    const doy = dayOfYear(d);
    const left = daysInYear(y) - doy;
    const p = moonPhase(d);
    const note = NOTES[m][(day + y) % NOTES[m].length];
    const leftText = left === 0 ? 'Последний день года' : `Осталось ${left} ${plural(left, ['день', 'дня', 'дней'])}`;
    return `<div class="pc${red ? ' is-red' : ''}">
    <header class="pg-head"><span class="pg-month">${MONTHS[m]}</span><span class="pg-year">${y}</span></header>
    <div class="pg-day">${day}</div>
    <div class="pg-wd">${WEEKDAYS[wd]}</div>
    <div class="pg-hol">${hol ? hol.name : ''}</div>
    <div class="pg-rule"></div>
    <div class="pg-sun">
      <div><span>Восход</span><b>${hm(sun.rise)}</b></div>
      <div><span>Закат</span><b>${hm(sun.set)}</b></div>
      <div><span>Долгота дня</span><b>${Math.floor(len / 60)} ч ${pad2(len % 60)} м</b></div>
    </div>
    <div class="pg-row"><span class="pg-moon">${moonSvg(p)}${moonName(p)}</span><span>Неделя ${isoWeek(d)}</span></div>
    <p class="pg-note">${note}</p>
    <footer class="pg-foot"><span>${doy}-й день года</span><span>${leftText}</span></footer>
  </div>`;
}
/* ───────────────────────── Геометрия загиба ───────────────────────── */
// Отсечение многоугольника полуплоскостью n·p ≥ c (keepGreater) или n·p ≤ c
function clipHalf(poly, n, c, keepGreater) {
    const out = [];
    const side = (p) => (dot(n, p) - c) * (keepGreater ? 1 : -1);
    for (let i = 0; i < poly.length; i++) {
        const A = poly[i], B = poly[(i + 1) % poly.length];
        const da = side(A), db = side(B);
        if (da >= 0)
            out.push(A);
        if ((da >= 0) !== (db >= 0)) {
            const t = da / (da - db);
            out.push(v(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t));
        }
    }
    return out;
}
const polyCss = (poly) => poly.length < 3
    ? 'polygon(0 0, 0 0, 0 0)'
    : `polygon(${poly.map(p => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`).join(',')})`;
function div(cls) {
    const el = document.createElement('div');
    el.className = cls;
    return el;
}
class Sheet {
    constructor(date) {
        var _a;
        this.date = date;
        this.el = div('sheet');
        this.front = div('page front');
        this.flapWrap = div('flap-wrap'); // живёт в отдельном слое над корешком, пока лист висит
        this.flap = div('flap');
        this.shade = div('flap-shade');
        this.front.innerHTML = pageHTML(date);
        const back = div('page back');
        back.innerHTML = pageHTML(date);
        (_a = back.firstElementChild) === null || _a === void 0 ? void 0 : _a.classList.add('ghost');
        this.flap.append(back, this.shade);
        this.flapWrap.append(this.flap);
        this.el.append(this.front);
    }
    size(W, H) {
        for (const e of [this.el, this.flap]) {
            e.style.width = `${W}px`;
            e.style.height = `${H}px`;
        }
        this.shade.style.width = `${4 * (W + H)}px`;
    }
    // C — уголок, P — куда он притянут, outline — контур листа
    apply(C, P, outline, W, H) {
        const L = dist(C, P);
        if (L < 0.6) {
            this.front.style.clipPath = polyCss(outline);
            this.flapWrap.style.display = 'none';
            return null;
        }
        const n = v((C.x - P.x) / L, (C.y - P.y) / L);
        const M = v((C.x + P.x) / 2, (C.y + P.y) / 2);
        const c = dot(n, M);
        const frontPoly = clipHalf(outline, n, c, false);
        const flapPoly = clipHalf(outline, n, c, true);
        // Отражение относительно линии сгиба (направление d)
        const d = v(n.y, -n.x);
        const a = 2 * d.x * d.x - 1, b = 2 * d.x * d.y, e = 2 * d.y * d.y - 1;
        const tx = M.x - (a * M.x + b * M.y), ty = M.y - (b * M.x + e * M.y);
        this.front.style.clipPath = polyCss(frontPoly);
        this.flapWrap.style.display = '';
        this.flap.style.clipPath = polyCss(flapPoly);
        this.flap.style.transform = `matrix(${a},${b},${b},${e},${tx},${ty})`;
        let maxD = 1;
        for (const p of flapPoly)
            maxD = Math.max(maxD, dot(n, p) - c);
        const theta = Math.atan2(d.y, d.x);
        this.shade.style.height = `${maxD}px`;
        this.shade.style.transform = `translate(${M.x}px,${M.y}px) rotate(${theta}rad) translate(${-2 * (W + H)}px,0)`;
        return { flapPoly, frontPoly, M, theta, L };
    }
}
/* ───────────────────────── Звук бумаги ───────────────────────── */
const store = {
    get(k) { try {
        return localStorage.getItem('tearcal:' + k);
    }
    catch {
        return null;
    } },
    set(k, val) { try {
        localStorage.setItem('tearcal:' + k, val);
    }
    catch { /* ignore */ } },
};
let actx = null;
let master = null; // общий выход с компрессором: наложившиеся хрусты не клиппуют
let soundOn = store.get('sound') !== '0';
function ensureAudio() {
    if (!soundOn)
        return;
    if (!actx) {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            actx = new AC();
            const comp = actx.createDynamicsCompressor();
            comp.threshold.value = -14;
            comp.knee.value = 10;
            comp.ratio.value = 6;
            comp.connect(actx.destination);
            master = comp;
        }
        catch {
            actx = null;
            master = null;
        }
    }
    if (actx && actx.state === 'suspended')
        void actx.resume();
}
function paperSound(kind, intensity = 1) {
    if (!soundOn || !actx || !master)
        return;
    const ctx = actx;
    const dur = kind === 'snap' ? 0.16 : kind === 'crackle' ? 0.07 : kind === 'whoosh' ? 0.34 : 0.24;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let crack = 0;
    for (let i = 0; i < len; i++) {
        const t = i / len;
        if (kind === 'rustle') {
            data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * 0.6;
        }
        else if (kind === 'whoosh') {
            // взмах листа: быстрый набор и долгий спад
            data[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 2);
        }
        else {
            if (Math.random() < (kind === 'crackle' ? 0.012 : 0.006))
                crack = 1;
            crack *= 0.985;
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.4) * (0.2 + 0.8 * crack);
        }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const soft = kind === 'rustle' || kind === 'whoosh';
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = kind === 'whoosh' ? 160 : soft ? 400 : 1000;
    const bp = ctx.createBiquadFilter();
    bp.type = soft ? 'lowpass' : 'bandpass';
    bp.frequency.value = kind === 'whoosh' ? 600 + 900 * intensity : kind === 'rustle' ? 2200 : 2600 + Math.random() * 900;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = (kind === 'snap' ? 0.3 : kind === 'crackle' ? 0.34 : kind === 'whoosh' ? 0.26 : 0.14) * intensity;
    src.connect(hp).connect(bp).connect(g).connect(master);
    src.start();
}
/* ───────────────────────── Приложение ───────────────────────── */
const $ = (sel) => document.querySelector(sel);
const rootEl = document.documentElement;
const hang = $('#hang');
const scene = $('.scene');
const pad = $('#pad');
const under = $('#under');
const sheetsLayer = $('#sheets');
const flapsLayer = $('#flaps');
const shadowClip = $('#shadowClip');
const shadowStrip = $('#shadowStrip');
const tearGap = $('#tearGap');
const tearGapClip = $('#tearGapClip');
const stub = $('#stub');
const flyLayer = $('#fly');
const yearEl = $('#boardYear');
const live = $('#live');
const btnBack = $('#btnBack');
const btnTear = $('#btnTear');
const btnToday = $('#btnToday');
const btnSound = $('#btnSound');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const BASE_W = 340, RATIO = 1.38, PERF = 18;
// Насколько сильнее «чем пускает бумага» нужно тянуть, чтобы перфорация начала рваться,
// и сколько пикселей надрыва даёт каждый лишний пиксель натяжения.
const TEAR_SLACK = 12, TEAR_GAIN = 1.9;
let s = 1, W = BASE_W, H = BASE_W * RATIO, perfY = PERF;
const saved = store.get('date');
let cur = saved && /^\d{4}-\d\d-\d\d$/.test(saved)
    ? (() => { const [y, m, d] = saved.split('-').map(Number); return new Date(y, m - 1, d); })()
    : startOfDay(new Date());
let sheet;
let corner = 1;
const Cpt = () => v(corner === 1 ? W : 0, H);
let tp = 0; // длина надрыва перфорации у текущего листа, px
let tpGrab = 0; // сколько было надорвано, когда лист схватили: новый жест рвёт дальше от этого места
let curJag = []; // линия разрыва текущего листа
let stubJag = []; // нижний край корешка от прошлых листов
let P = v(0, 0), Pv = v(0, 0), target = v(0, 0);
let stiffness = 170;
let damping = 0.74;
let restoreAnims = [];
let mode = 'idle';
let autoStart = 0;
let dragOffset = v(0, 0);
// Жест решается в первые пиксели движения: начали тянуть вниз или наружу — лист до конца
// жеста остаётся плоским и рвётся в своей плоскости; вбок или вверх — загибается
let dragKind = 'none';
let dragStart = v(0, 0);
let pullStart = v(0, 0);
let hist = [];
let activePointer = -1;
let lastApplied = '';
const flyers = [];
let heldFlyer = null;
let boardAng = reduced ? 0 : 5, boardVel = 0, boardTarget = 0;
let crackleAcc = 0, lastCrackle = 0;
let rustleAcc = 0, lastRustle = 0, lastDragPt = v(0, 0);
// Бумага шуршит, пока её двигают: чем быстрее, тем громче
function moveRustle(p) {
    rustleAcc += dist(p, lastDragPt);
    lastDragPt = p;
    const now = performance.now();
    if (now - lastRustle > 120 && rustleAcc > 16 * s) {
        paperSound('rustle', clamp(rustleAcc / (70 * s), 0.25, 0.9));
        rustleAcc = 0;
        lastRustle = now;
    }
}
function jagPoints() {
    const pts = [];
    const step = 5 * s;
    for (let x = 0; x < W; x += step)
        pts.push(v(x, perfY + (Math.random() - 0.5) * 5 * s));
    pts.push(v(W, perfY + (Math.random() - 0.5) * 5 * s));
    return pts;
}
function jagAt(pts, x) {
    for (let i = 1; i < pts.length; i++) {
        if (pts[i].x >= x) {
            const a = pts[i - 1], b = pts[i];
            const t = (x - a.x) / ((b.x - a.x) || 1);
            return a.y + (b.y - a.y) * t;
        }
    }
    return pts[pts.length - 1].y;
}
const tipX = () => (corner === 1 ? W - tp : tp);
const inTorn = (x) => (corner === 1 ? x >= W - tp : x <= tp);
// Щель разрыва: у кончика надрыва её нет, к уголку она раскрывается
const gapMax = () => clamp(2.5 * s + tp * 0.04, 0, 8 * s);
const slit = (x) => (tp < 0.5 ? 0 : gapMax() * clamp((corner === 1 ? x - (W - tp) : tp - x) / tp, 0, 1));
// Контур листа с учётом уже надорванной части перфорации
function sheetOutline(open = true) {
    if (tp < 0.5)
        return [v(0, 0), v(W, 0), v(W, H), v(0, H)];
    const tx = tipX(), jy = jagAt(curJag, tx);
    const edge = (pts) => (open ? pts.map(p => v(p.x, p.y + slit(p.x))) : pts);
    if (corner === 1) {
        return [v(0, 0), v(tx, 0), v(tx, jy), ...edge(curJag.filter(p => p.x > tx)), v(W, H), v(0, H)];
    }
    return [...edge(curJag.filter(p => p.x < tx)), v(tx, jy), v(tx, 0), v(W, 0), v(W, H), v(0, H)];
}
// Корешок: там, где лист уже надорван, остаётся его собственный рваный край
function drawStub() {
    const edge = stubJag.map((p, i) => (tp > 0.5 && curJag[i] && inTorn(p.x) ? curJag[i] : p));
    stub.style.clipPath = polyCss([v(0, 0), v(W, 0), ...edge.slice().reverse()]);
}
// Надорванный лист под своим весом слегка провисает
const droopDeg = () => (reduced ? 0 : (corner === 1 ? 1 : -1) * 3.2 * Math.pow(tp / W, 2));
// Насколько лист может повернуться вокруг уцелевшей перфорации: чем меньше её осталось, тем свободнее
function sagLimit() {
    const free = Math.max(1, W - tp);
    return Math.max(Math.abs(droopDeg()), Math.min(28, (4.5 * s / free) * 180 / Math.PI));
}
let sag = 0;
const droopOrigin = () => v(corner === 1 ? 0 : W, perfY);
function constrainWith(raw, torn) {
    // Лист держится за неразорванную часть перфорации: уголок не уходит дальше, чем пускает бумага.
    const A = v(corner === 1 ? W - torn : torn, perfY), rA = Math.hypot(torn, H - perfY);
    const B = v(corner === 1 ? 0 : W, perfY), rB = Math.hypot(W, H - perfY);
    let p = raw;
    for (let i = 0; i < 4; i++) {
        let d = dist(p, A);
        if (d > rA)
            p = v(A.x + (p.x - A.x) * rA / d, A.y + (p.y - A.y) * rA / d);
        d = dist(p, B);
        if (d > rB)
            p = v(B.x + (p.x - B.x) * rB / d, B.y + (p.y - B.y) * rB / d);
    }
    // уголок не может «проскочить» за край листа: иначе линия сгиба переворачивается
    // и на кадр-другой загибается почти весь лист
    return v(corner === 1 ? Math.min(p.x, W) : Math.max(p.x, 0), Math.min(p.y, H));
}
const constrain = (raw) => constrainWith(raw, tp);
function addTear(want) {
    const next = clamp(want, 0, W);
    if (next <= tp)
        return;
    const delta = next - tp;
    crackleAcc += delta;
    tp = next;
    const now = performance.now();
    if (now - lastCrackle > 38 && crackleAcc > 2 * s) {
        paperSound('crackle', clamp(crackleAcc / (22 * s), 0.3, 1));
        crackleAcc = 0;
        lastCrackle = now;
    }
    drawStub();
    boardVel += corner * Math.min(1.5, delta * 0.03);
}
function render(force = false) {
    const key = `${P.x.toFixed(2)},${P.y.toFixed(2)},${corner},${tp.toFixed(1)}`;
    if (!force && key === lastApplied)
        return;
    lastApplied = key;
    const o = droopOrigin();
    sheet.el.style.transformOrigin = `${o.x}px ${o.y}px`;
    const rot = Math.abs(sag) > 0.001 ? `rotate(${sag}deg)` : '';
    sheet.el.style.transform = rot;
    // тень на следующем листе лежит в той же системе координат, что и повёрнутый лист
    shadowClip.style.transformOrigin = sheet.el.style.transformOrigin;
    shadowClip.style.transform = rot;
    // загнутая часть листа лежит поверх корешка и переплёта, но поворачивается вместе с листом
    sheet.flapWrap.style.transformOrigin = sheet.el.style.transformOrigin;
    sheet.flapWrap.style.transform = rot;
    // провисший лист отходит от нижней страницы: край отбрасывает тень, иначе одинаковая бумага
    // сливается и кажется, что лист обрезан ровной вертикалью
    const lift = clamp(Math.abs(sag) / 2.5, 0, 1);
    sheetsLayer.style.filter = lift > 0.02
        ? `drop-shadow(0 ${(1 + 1.5 * lift).toFixed(2)}px ${((2 + 4 * lift) * s).toFixed(2)}px rgba(25, 18, 10, ${(0.38 * lift).toFixed(3)}))`
        : '';
    if (tp > 0.5) {
        tearGap.style.opacity = '1';
        tearGap.style.left = `${corner === 1 ? W - tp : 0}px`;
        tearGap.style.width = `${tp}px`;
        tearGap.style.top = `${perfY - 3 * s}px`;
        // щель между корешком и листом: её высота растёт и от разрыва, и от провисания листа
        const sagGap = Math.abs(Math.sin(sag * Math.PI / 180)) * W;
        tearGap.style.height = `${gapMax() + sagGap + 10 * s}px`;
        tearGap.classList.toggle('from-left', corner === -1);
    }
    else {
        tearGap.style.opacity = '0';
    }
    const info = sheet.apply(Cpt(), P, sheetOutline(), W, H);
    // затемнение щели разрыва видно только там, где рваная кромка листа на месте,
    // а не там, где надорванный край уже загнут и открыта нижняя страница
    if (info && tp > 0.5) {
        const o = droopOrigin(), r = sag * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
        tearGapClip.style.clipPath = polyCss(info.frontPoly.map(p => {
            const dx = p.x - o.x, dy = p.y - o.y;
            return v(o.x + dx * cs - dy * sn, o.y + dx * sn + dy * cs);
        }));
    }
    else {
        tearGapClip.style.clipPath = 'none';
    }
    if (!info) {
        shadowClip.style.opacity = '0';
        return;
    }
    shadowClip.style.opacity = String(clamp(info.L / (0.22 * H), 0, 1) * 0.9);
    shadowClip.style.clipPath = polyCss(info.flapPoly);
    const sw = clamp(info.L * 0.22, 8 * s, 52 * s);
    shadowStrip.style.height = `${sw}px`;
    shadowStrip.style.width = `${4 * (W + H)}px`;
    shadowStrip.style.transform = `translate(${info.M.x}px,${info.M.y}px) rotate(${info.theta}rad) translate(${-2 * (W + H)}px,0)`;
}
function updateMeta() {
    yearEl.textContent = String(cur.getFullYear());
    const left = daysInYear(cur.getFullYear()) - dayOfYear(cur) + 1;
    pad.style.setProperty('--stack', `${(2 + 11 * left / 365) * s}px`);
    live.textContent = `${cur.getDate()} ${MONTHS_GEN[cur.getMonth()]} ${cur.getFullYear()}, ${WEEKDAYS[cur.getDay()].toLowerCase()}`;
    document.title = `${cur.getDate()} ${MONTHS_GEN[cur.getMonth()]} · Отрывной календарь`;
    store.set('date', isoKey(cur));
}
function mountSheet(date) {
    sheet = new Sheet(date);
    sheet.size(W, H);
    sheetsLayer.replaceChildren(sheet.el);
    flapsLayer.replaceChildren(sheet.flapWrap);
    tp = 0;
    sag = 0;
    curJag = jagPoints();
    P = Cpt();
    Pv = v(0, 0);
    target = P;
    drawStub();
    render(true);
}
function setSize(w) {
    W = w;
    s = W / BASE_W;
    H = Math.round(W * RATIO);
    perfY = PERF * s;
    rootEl.style.setProperty('--s', String(s));
    pad.style.width = `${W}px`;
    pad.style.height = `${H}px`;
}
// Высота всего, что стоит на странице: календарь, кнопки, подсказка и поля сцены
function sceneHeight() {
    const kids = Array.from(scene.children).filter((e) => e instanceof HTMLElement && e.offsetParent !== null && getComputedStyle(e).position !== 'absolute');
    const cs = getComputedStyle(scene);
    const first = kids[0], last = kids[kids.length - 1];
    return last.offsetTop + last.offsetHeight - first.offsetTop + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
}
function layout() {
    const maxW = Math.round(clamp(Math.min(window.innerWidth * 0.8, window.innerWidth - 64, 380), 220, 380));
    setSize(maxW);
    // Календарь масштабируется целиком, кнопки и подсказка — нет: подгоняем размер по фактической
    // высоте, чтобы всё помещалось в окно без прокрутки
    for (let i = 0; i < 4; i++) {
        const over = sceneHeight() - window.innerHeight;
        if (over <= 0 && (W >= maxW || -over < 4))
            break;
        const scalable = hang.offsetHeight;
        const next = Math.round(clamp(W * (scalable - over) / scalable, 220, maxW));
        if (next === W)
            break;
        setSize(next);
    }
    under.innerHTML = pageHTML(addDays(cur, 1));
    stubJag = jagPoints();
    mountSheet(cur);
    updateMeta();
}
function localPoint(e) {
    // учитываем лёгкий наклон висящего календаря
    const r = pad.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ang = -boardAng * Math.PI / 180;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    return v(dx * Math.cos(ang) - dy * Math.sin(ang) + W / 2, dx * Math.sin(ang) + dy * Math.cos(ang) + H / 2);
}
function velocity() {
    if (hist.length < 2)
        return v(0, 0);
    const a = hist[0], b = hist[hist.length - 1];
    const dt = Math.max(16, b.t - a.t) / 1000;
    return v((b.x - a.x) / dt, (b.y - a.y) / dt);
}
/* ── лист оторвался полностью ── */
function detach(vel, held, flight = FLIGHT_DEFAULT, spin) {
    const old = sheet;
    const phi = sag;
    tp = W;
    const outline = sheetOutline(false);
    old.apply(Cpt(), P, outline, W, H);
    stubJag = curJag;
    // переносим лист в слой полёта, сохранив его положение с учётом провисания
    const o = droopOrigin();
    const rad = phi * Math.PI / 180;
    const rel = v(P.x - o.x, P.y - o.y);
    const Pr = v(o.x + rel.x * Math.cos(rad) - rel.y * Math.sin(rad), o.y + rel.x * Math.sin(rad) + rel.y * Math.cos(rad));
    const r = pad.getBoundingClientRect();
    // оторванный лист улетает целиком: загиб возвращается внутрь листа
    old.flapWrap.style.transform = '';
    old.el.append(old.flapWrap);
    flyLayer.append(old.el);
    old.el.style.left = `${r.left + (r.width - W) / 2}px`;
    old.el.style.top = `${r.top + (r.height - H) / 2}px`;
    old.el.style.transformOrigin = `${P.x}px ${P.y}px`;
    let vx = vel.x, vy = vel.y;
    if (!held && Math.hypot(vx, vy) < 380 * s) {
        vx = corner * 220 * s;
        vy = -720 * s;
    }
    vx = clamp(vx, -2600, 2600);
    vy = clamp(vy, -2600, 2600);
    const f = {
        sheet: old, x: Pr.x - P.x, y: Pr.y - P.y, vx: held ? 0 : vx, vy: held ? 0 : vy,
        a: phi, va: held ? 0 : (spin !== null && spin !== void 0 ? spin : clamp(vx * 0.12, -420, 420) + (Math.random() - 0.5) * 80),
        t: 0, seed: Math.random() * 6, held, hold: P, baseA: phi, flight,
        C: Cpt(), P0: P, outline, w: W, h: H, unfold: reduced ? 1 : 0,
    };
    if (reduced)
        old.apply(f.C, f.C, outline, W, H);
    // тень сгиба на следующем листе исчезает, зато лист отбрасывает свою тень целиком
    shadowFor(f);
    flyers.push(f);
    heldFlyer = held ? f : null;
    shadowClip.style.opacity = '0';
    cur = addDays(cur, 1);
    mountSheet(cur);
    under.innerHTML = pageHTML(addDays(cur, 1));
    updateMeta();
    boardVel += corner * 22 + (Math.random() - 0.5) * 10;
    boardTarget = 0;
    paperSound('snap');
    if (!held)
        paperSound('whoosh', clamp(Math.hypot(vx, vy) / (1800 * s), 0.3, 1));
    stiffness = 170;
    damping = 0.74;
    pad.classList.remove('grabbing');
    if (held) {
        mode = 'held';
    }
    else {
        if (activePointer >= 0) {
            try {
                pad.releasePointerCapture(activePointer);
            }
            catch { /* ignore */ }
        }
        mode = 'idle';
    }
}
// Оторванный лист больше ничто не держит: загиб распрямляется. Возвращает, где сейчас уголок.
function unfoldStep(f, dt) {
    const e = 1 - Math.pow(1 - f.unfold, 3);
    const tip = v(f.P0.x + (f.C.x - f.P0.x) * e, f.P0.y + (f.C.y - f.P0.y) * e);
    if (f.unfold < 1) {
        f.unfold = Math.min(1, f.unfold + dt / 0.32);
        f.sheet.apply(f.C, tip, f.outline, f.w, f.h);
    }
    return tip;
}
// Тень летящего листа падает всегда вниз: смещение поворачиваем навстречу повороту листа
function shadowFor(f) {
    const lift = 0.35 + 0.65 * f.unfold;
    const d = (3 + 9 * lift) * s, blur = (5 + 13 * lift) * s, r = f.a * Math.PI / 180;
    f.sheet.el.style.filter = `drop-shadow(${(d * Math.sin(r)).toFixed(1)}px ${(d * Math.cos(r)).toFixed(1)}px ${blur.toFixed(1)}px rgba(18, 12, 6, .32))`;
}
function throwHeld(vel) {
    const f = heldFlyer;
    heldFlyer = null;
    if (!f)
        return;
    f.held = false;
    f.vx = clamp(vel.x, -2600, 2600);
    f.vy = clamp(vel.y, -2600, 2600);
    f.va = clamp(vel.x * 0.1, -380, 380);
    const speed = Math.hypot(f.vx, f.vy);
    if (speed > 300 * s)
        paperSound('whoosh', clamp(speed / (1800 * s), 0.3, 1));
}
const easeIn = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const rnd = (a, b) => a + Math.random() * (b - a);
const PLANS = [
    // 1. Классика: уголок загибается вверх, лист срывается и улетает
    () => ({
        dur: 400, stiff: 260,
        aim: v(corner === 1 ? W * 0.36 : W * 0.64, H * 0.4),
        tear: t => Math.pow(clamp((t - 0.12) / 0.88, 0, 1), 1.25),
        throwVel: () => {
            const C = Cpt(), d = v(P.x - C.x, P.y - C.y), l = Math.hypot(d.x, d.y) || 1;
            return v(d.x / l * 700 * s + corner * 160 * s, d.y / l * 900 * s);
        },
    }),
    // 2. Рывок вниз: лист проседает, отрывается и падает
    () => {
        const C = Cpt();
        return {
            dur: 420,
            path: t => v(C.x - corner * 10 * s * t, C.y + easeIn(t) * 280 * s),
            throwVel: () => v(-corner * rnd(40, 120) * s, 650 * s),
            spin: () => -corner * rnd(40, 110),
            flight: { g: 1.1, drag: 0, sway: 0, life: 1.0, flutter: 8 },
        };
    },
    // 3. Перелистнуть вбок, как страницу книги
    () => {
        const C = Cpt();
        return {
            dur: 760,
            path: t => { const e = easeInOut(t); return v(C.x - corner * e * 1.55 * W, C.y + e * 40 * s - Math.sin(Math.PI * t) * 60 * s); },
            throwVel: () => v(-corner * 1250 * s, -260 * s),
            spin: () => -corner * rnd(160, 260),
        };
    },
    // 4. Подбросить: лист взлетает вверх и кувыркается
    () => ({
        dur: 340, stiff: 320,
        aim: v(corner === 1 ? W * 0.5 : W * 0.5, H * 0.3),
        tear: t => clamp((t - 0.35) / 0.65, 0, 1),
        throwVel: () => v(-corner * rnd(120, 260) * s, -1550 * s),
        spin: () => (Math.random() < 0.5 ? -1 : 1) * rnd(480, 640),
        flight: { g: 1, drag: 0, sway: 0, life: 1.45, flutter: 22 },
    }),
    // 5. Осенний лист: аккуратный надрыв и медленное планирование
    () => ({
        dur: 700, stiff: 120,
        aim: v(corner === 1 ? W * 0.5 : W * 0.5, H * 0.62),
        tear: t => easeInOut(clamp((t - 0.2) / 0.8, 0, 1)),
        throwVel: () => v(-corner * 220 * s, -260 * s),
        spin: () => -corner * 30,
        flight: { g: 0.16, drag: 1.4, sway: 260, life: 2.6, flutter: 34 },
    }),
    // 6. Резко в сторону: диагональный рывок, лист улетает с вращением
    () => {
        const C = Cpt();
        return {
            dur: 300,
            path: t => v(C.x + corner * easeIn(t) * 150 * s, C.y + easeIn(t) * 250 * s),
            throwVel: () => v(corner * 1500 * s, 380 * s),
            spin: () => corner * rnd(420, 560),
        };
    },
];
let plan = null;
let lastPlan = -1;
function autoTear() {
    var _a;
    if (mode !== 'idle')
        return;
    if (tp < 0.5 && dist(P, Cpt()) < 2) {
        corner = Math.random() < 0.5 ? 1 : -1;
        P = Cpt();
    }
    if (reduced) {
        tp = W;
        detach(v(0, 0), false);
        return;
    }
    let i = Math.floor(Math.random() * PLANS.length);
    if (i === lastPlan)
        i = (i + 1 + Math.floor(Math.random() * (PLANS.length - 1))) % PLANS.length;
    lastPlan = i;
    plan = PLANS[i]();
    tpGrab = tp;
    mode = 'auto';
    stiffness = (_a = plan.stiff) !== null && _a !== void 0 ? _a : 260;
    damping = 0.74;
    autoStart = performance.now();
    paperSound('rustle');
}
function finishAuto() {
    var _a;
    const pl = plan;
    plan = null;
    if (!pl)
        return;
    tp = W;
    detach(pl.throwVel(), false, (_a = pl.flight) !== null && _a !== void 0 ? _a : FLIGHT_DEFAULT, pl.spin ? pl.spin() : undefined);
}
/* ── возврат вчерашнего листа ── */
function restore() {
    if (mode !== 'idle')
        return;
    under.innerHTML = pageHTML(cur);
    cur = addDays(cur, -1);
    corner = 1;
    mountSheet(cur);
    updateMeta();
    if (!reduced) {
        P = constrain(v(W * 0.32, H * 0.36));
        Pv = v(0, 0);
        target = Cpt();
        stiffness = 120;
        damping = 1; // без перелёта: лист ложится ровно, а не пружинит через край
        render(true);
        // лист и его тень на нижней странице двигаются вместе
        for (const a of restoreAnims)
            a.cancel();
        const timing = { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' };
        const move = [{ translate: '0 -7%', rotate: '-2.5deg' }, { translate: '0 0', rotate: '0deg' }];
        const fade = [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1 }];
        restoreAnims = [
            sheet.el.animate([{ ...move[0], ...fade[0] }, fade[1], { ...move[1], ...fade[2] }], timing),
            sheet.flapWrap.animate([{ ...move[0], ...fade[0] }, fade[1], { ...move[1], ...fade[2] }], timing),
            shadowClip.animate(move, timing),
            shadowStrip.animate(fade, timing),
        ];
        boardVel -= 18;
        const restored = sheet;
        window.setTimeout(() => {
            if (sheet === restored && mode === 'idle') {
                stiffness = 170;
                damping = 0.74;
            }
        }, 900);
    }
    paperSound('rustle');
}
const wait = (ms) => new Promise(res => window.setTimeout(res, ms));
let sequencing = false;
async function goToday() {
    if (sequencing || mode !== 'idle')
        return;
    const today = startOfDay(new Date());
    let diff = dayIndex(today) - dayIndex(cur);
    if (diff === 0) {
        boardVel += 30;
        return;
    }
    sequencing = true;
    if (Math.abs(diff) > 10) {
        if (diff > 0) {
            cur = addDays(today, -1);
            under.innerHTML = pageHTML(today);
            mountSheet(cur);
            updateMeta();
            await wait(60);
            autoTear();
        }
        else {
            cur = addDays(today, 1);
            mountSheet(cur);
            updateMeta();
            restore();
        }
    }
    else {
        while (diff !== 0) {
            if (mode !== 'idle') {
                await wait(50);
                continue;
            }
            if (diff > 0) {
                autoTear();
                diff--;
                await wait(reduced ? 120 : 470);
            }
            else {
                restore();
                diff++;
                await wait(reduced ? 120 : 260);
            }
        }
    }
    sequencing = false;
}
/* ── указатель ── */
pad.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0)
        return;
    if (mode !== 'idle')
        return;
    ensureAudio();
    const p = localPoint(e);
    activePointer = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    hist = [{ t: performance.now(), x: p.x, y: p.y }];
    if (p.y < perfY + 6 * s && tp < 0.5) { // тянем за корешок — возвращаем лист
        mode = 'pullback';
        pullStart = p;
        return;
    }
    // надорванный лист продолжаем рвать с той же стороны
    const want = p.x < W / 2 ? -1 : 1;
    if (tp < 0.5 && want !== corner && dist(P, Cpt()) < 3) {
        corner = want;
        P = Cpt();
    }
    dragOffset = v(P.x - p.x, P.y - p.y);
    dragKind = 'none';
    dragStart = P;
    tpGrab = tp;
    Pv = v(0, 0);
    mode = 'drag';
    pad.classList.add('grabbing');
    lastDragPt = p;
    rustleAcc = 0;
    paperSound('rustle', 0.45);
});
pad.addEventListener('pointermove', (e) => {
    const p = localPoint(e);
    if (e.pointerId === activePointer) {
        const now = performance.now();
        hist.push({ t: now, x: p.x, y: p.y });
        while (hist.length > 2 && now - hist[0].t > 90)
            hist.shift();
    }
    if (mode === 'pullback' && e.pointerId === activePointer) {
        if (p.y - pullStart.y > 46 * s) {
            mode = 'idle';
            restore();
        }
        return;
    }
    if (mode === 'held' && heldFlyer && e.pointerId === activePointer) {
        const raw = v(p.x + dragOffset.x, p.y + dragOffset.y);
        heldFlyer.hold = raw;
        moveRustle(p);
        return;
    }
    if (mode === 'drag' && e.pointerId === activePointer) {
        let raw = v(p.x + dragOffset.x, p.y + dragOffset.y);
        if (dragKind === 'none') {
            const m = v(raw.x - dragStart.x, raw.y - dragStart.y);
            if (Math.hypot(m.x, m.y) > 6 * s) {
                const inward = -corner * m.x;
                dragKind = m.y > -2 * s && m.y >= inward * 0.8 ? 'pull' : 'fold';
                if (dragKind === 'pull') {
                    // приподнятый наведением уголок не в счёт: движение руки отсчитываем от самого уголка
                    const C = Cpt();
                    dragOffset = v(dragOffset.x + C.x - dragStart.x, dragOffset.y + C.y - dragStart.y);
                    raw = v(p.x + dragOffset.x, p.y + dragOffset.y);
                }
            }
        }
        dragTo(raw);
        moveRustle(p);
        if (tp >= W - 0.5)
            detach(velocity(), true);
        return;
    }
    if (mode === 'idle' && e.pointerType === 'mouse') {
        hoverPeek(p);
    }
});
// Уголок тянут в точку raw (координаты блока): загиб, натяжение, надрыв, провисание
function dragTo(raw) {
    {
        // натяжение относительно целого листа определяет, докуда дошёл разрыв
        const tension0 = dist(raw, constrainWith(raw, 0));
        addTear(tpGrab + (tension0 - TEAR_SLACK * s) * TEAR_GAIN);
        // тянем вниз — лист поворачивается на остатке перфорации; вбок и вверх — загибается
        const B = droopOrigin(), C = Cpt();
        const u = v(C.x - B.x, C.y - B.y), w = v(raw.x - B.x, raw.y - B.y);
        const want = Math.atan2(u.x * w.y - u.y * w.x, dot(u, w)) * 180 / Math.PI;
        const lim = sagLimit(), base = droopDeg();
        sag = corner === 1 ? clamp(want, base, lim) : clamp(want, -lim, base);
        const rad = -sag * Math.PI / 180;
        const local = v(B.x + w.x * Math.cos(rad) - w.y * Math.sin(rad), B.y + w.x * Math.sin(rad) + w.y * Math.cos(rad));
        if (mode === 'drag' && dragKind === 'pull') {
            // лист не загибается: уголок ложится на место, а любое натяжение, хоть вниз, хоть вбок, рвёт перфорацию
            const d = v(local.x - C.x, local.y - C.y);
            const stretch = Math.hypot(d.x, Math.max(0, d.y));
            addTear(tpGrab + (stretch - TEAR_SLACK * s) * TEAR_GAIN);
            P = dist(P, C) < 0.5 ? C : constrain(v(P.x + (C.x - P.x) * 0.35, P.y + (C.y - P.y) * 0.35));
            boardTarget = clamp(d.x / (40 * s), -1.8, 1.8) + clamp(stretch / (90 * s), 0, 1) * corner * 0.6;
            return;
        }
        // наружу и вниз лист не загибается — это только натяжение
        local.y = Math.min(local.y, H);
        local.x = corner === 1 ? Math.min(local.x, W) : Math.max(local.x, 0);
        P = constrain(local);
        const tension = dist(local, P);
        boardTarget = clamp((raw.x - P.x) / (40 * s), -1.8, 1.8) + clamp(tension / (90 * s), 0, 1) * corner * 0.6;
    }
}
function hoverPeek(p) {
    {
        const nearR = dist(p, v(W, H)) < 78 * s, nearL = dist(p, v(0, H)) < 78 * s;
        if (nearR || nearL) {
            const want = nearR ? 1 : -1;
            if (tp < 0.5 && want !== corner && dist(P, Cpt()) < 3) {
                corner = want;
                P = Cpt();
            }
            target = want === corner ? v(Cpt().x - corner * 30 * s, H - 24 * s) : Cpt();
        }
        else {
            target = Cpt();
        }
    }
}
function endDrag(e) {
    if (e.pointerId !== activePointer)
        return;
    try {
        pad.releasePointerCapture(e.pointerId);
    }
    catch { /* ignore */ }
    activePointer = -1;
    const vel = velocity();
    if (mode === 'pullback') {
        mode = 'idle';
        return;
    }
    if (mode === 'held') {
        throwHeld(vel);
        mode = 'idle';
        return;
    }
    if (mode !== 'drag')
        return;
    pad.classList.remove('grabbing');
    mode = 'idle';
    boardTarget = 0;
    const C = Cpt();
    // Лист дорывается только руками. Отпустили — он остаётся надорванным ровно настолько,
    // насколько его надорвали (доотрываем лишь последние несколько процентов перфорации).
    if (tp > 0.97 * W) {
        detach(vel, false);
    }
    else {
        if (dist(P, C) > 40 * s)
            paperSound('rustle', 0.5); // загиб шлёпается обратно
        target = C;
        stiffness = 170;
        damping = 0.74;
    }
}
pad.addEventListener('pointerup', endDrag);
pad.addEventListener('pointercancel', endDrag);
pad.addEventListener('pointerleave', () => { if (mode === 'idle')
    target = Cpt(); });
/* ── кнопки и клавиши ── */
btnTear.addEventListener('click', () => { ensureAudio(); autoTear(); });
btnBack.addEventListener('click', () => { ensureAudio(); restore(); });
btnToday.addEventListener('click', () => { ensureAudio(); void goToday(); });
function syncSoundBtn() {
    btnSound.setAttribute('aria-pressed', String(soundOn));
    btnSound.setAttribute('aria-label', soundOn ? 'Выключить звук' : 'Включить звук');
    btnSound.classList.toggle('is-off', !soundOn);
}
btnSound.addEventListener('click', () => {
    soundOn = !soundOn;
    store.set('sound', soundOn ? '1' : '0');
    syncSoundBtn();
    ensureAudio();
});
syncSoundBtn();
window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter'))
        return;
    if (e.metaKey || e.ctrlKey || e.altKey)
        return;
    const k = e.key.toLowerCase();
    if (k === 'arrowright' || k === ' ' || k === 'pagedown') {
        e.preventDefault();
        ensureAudio();
        autoTear();
    }
    else if (k === 'arrowleft' || k === 'pageup') {
        e.preventDefault();
        ensureAudio();
        restore();
    }
    else if (k === 't' || k === 'е') {
        ensureAudio();
        void goToday();
    }
});
window.addEventListener('resize', () => { if (mode === 'idle')
    layout(); });
/* ── главный цикл ── */
let last = performance.now();
function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const pathAuto = mode === 'auto' && plan !== null && plan.path !== undefined;
    if (mode === 'auto' && plan) {
        const e = (now - autoStart) / plan.dur;
        if (plan.path) {
            dragTo(plan.path(clamp(e, 0, 1)));
            if (tp >= W - 0.5 || e > 1.25)
                finishAuto();
        }
        else {
            addTear(W * (plan.tear ? plan.tear(clamp(e, 0, 1)) : clamp(e, 0, 1)));
            if (plan.aim)
                target = constrain(plan.aim);
        }
    }
    if ((mode === 'idle' || mode === 'auto') && !pathAuto) {
        sag += (droopDeg() - sag) * Math.min(1, dt * 9);
        const k = stiffness, c = 2 * Math.sqrt(k) * damping;
        Pv.x += (k * (target.x - P.x) - c * Pv.x) * dt;
        Pv.y += (k * (target.y - P.y) - c * Pv.y) * dt;
        P = v(P.x + Pv.x * dt, P.y + Pv.y * dt);
        if (Math.abs(P.x - target.x) < 0.05 && Math.abs(P.y - target.y) < 0.05 && Math.hypot(Pv.x, Pv.y) < 1) {
            P = target;
            Pv = v(0, 0);
        }
        P = constrain(P);
        if (mode === 'auto' && tp >= W - 0.5)
            finishAuto();
    }
    render();
    for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i];
        if (f.held) {
            // оторванный лист в руке: догоняет курсор и чуть покачивается
            // уголок остаётся в руке, а распрямляющийся лист повисает на нём
            const tip = unfoldStep(f, dt);
            const r = f.a * Math.PI / 180, dx = tip.x - f.P0.x, dy = tip.y - f.P0.y;
            const tx = f.hold.x - f.P0.x - (dx * Math.cos(r) - dy * Math.sin(r));
            const ty = f.hold.y - f.P0.y - (dx * Math.sin(r) + dy * Math.cos(r));
            const k = 240, c = 2 * Math.sqrt(k) * 0.8;
            f.vx += (k * (tx - f.x) - c * f.vx) * dt;
            f.vy += (k * (ty - f.y) - c * f.vy) * dt;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            const aim = f.baseA + clamp(f.vx * 0.012, -16, 16);
            f.va += (90 * (aim - f.a) - 14 * f.va) * dt;
            f.a += f.va * dt;
            f.sheet.el.style.transform = `perspective(1100px) translate(${f.x}px,${f.y}px) rotate(${f.a}deg)`;
            shadowFor(f);
            continue;
        }
        unfoldStep(f, dt);
        const fl = f.flight;
        f.t += dt;
        f.vy += 2300 * s * fl.g * dt;
        f.vx *= 1 - 0.9 * dt;
        if (fl.drag)
            f.vy *= 1 - fl.drag * dt;
        // планирование: лист раскачивается из стороны в сторону
        const swayV = fl.sway ? Math.sin(f.t * 3.1 + f.seed) * fl.sway * s : 0;
        f.x += (f.vx + swayV) * dt;
        f.y += f.vy * dt;
        f.a += (f.va + (fl.sway ? Math.cos(f.t * 3.1 + f.seed) * fl.sway * 0.09 : 0)) * dt;
        f.va *= 1 - 0.6 * dt;
        const flutter = reduced ? 0 : Math.sin(f.t * (fl.sway ? 4 : 11) + f.seed) * fl.flutter * Math.min(1, f.t * 3);
        const sc = 1 + Math.min(f.t, 1) * 0.07;
        f.sheet.el.style.transform = `perspective(1100px) translate(${f.x}px,${f.y}px) rotate(${f.a}deg) rotateY(${flutter}deg) scale(${sc})`;
        shadowFor(f);
        // лист растворяется только в самом конце полёта, а не призраком поверх календаря
        const fadeAt = Math.max(fl.life * 0.5, fl.life - 0.3);
        f.sheet.el.style.opacity = String(f.t < fadeAt ? 1 : Math.max(0, 1 - (f.t - fadeAt) / (fl.life - fadeAt)));
        if (f.t > fl.life) {
            f.sheet.el.remove();
            flyers.splice(i, 1);
        }
    }
    if (!reduced) {
        const acc = -46 * (boardAng - boardTarget) - 2.4 * boardVel;
        boardVel += acc * dt;
        boardAng += boardVel * dt;
        if (Math.abs(boardAng) < 0.002 && Math.abs(boardVel) < 0.01 && boardTarget === 0) {
            boardAng = 0;
            boardVel = 0;
        }
        hang.style.transform = `rotate(${boardAng.toFixed(3)}deg)`;
    }
    requestAnimationFrame(frame);
}
layout();
// веб-шрифты меняют высоту подсказки и кнопок — после загрузки подгоняем размер ещё раз,
// но не трогаем надорванный лист
(_a = document.fonts) === null || _a === void 0 ? void 0 : _a.ready.then(() => { if (mode === 'idle' && tp < 0.5 && sceneHeight() !== window.innerHeight)
    layout(); });
requestAnimationFrame(frame);
