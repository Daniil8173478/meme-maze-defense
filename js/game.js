/* ================= Мемо-Защита: Башни Лабиринта ================= */
/* Чистый canvas + JS. Графика рисуется кодом, звук — Web Audio.     */

"use strict";
const TAU = Math.PI * 2;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ---------- Утилиты ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
/* Осветление/затемнение цвета (f>1 светлее, f<1 темнее) с кэшем. */
const _shadeCache = {};
function shade(hex, f) {
  const key = hex + "|" + f;
  const hit = _shadeCache[key];
  if (hit) return hit;
  let c = hex.charAt(0) === "#" ? hex.slice(1) : hex;
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const cl = v => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
  const out = "rgb(" + cl(r * f) + "," + cl(g * f) + "," + cl(b * f) + ")";
  _shadeCache[key] = out; return out;
}
function radial(g, x0, y0, r0, x1, y1, r1, stops) {
  const grd = g.createRadialGradient(x0, y0, r0, x1, y1, r1);
  for (const s of stops) grd.addColorStop(s[0], s[1]);
  return grd;
}

/* ---------- Палитра ---------- */
const PAL = {
  bg: "#0e1626", panel: "#1b2a41", panel2: "#26375a",
  gold: "#ffd166", danger: "#ef476f", good: "#06d6a0",
  blue: "#118ab2", text: "#f4f7fb", dim: "#9fb0c8", outline: "#12203a",
  gem: "#4fd6c9"
};
const TOWER_HP = 120;
const SKINS = {
  classic: { name: "Классик", nameEn: "Classic", grassA: "#3f9150", grassB: "#37814a", path: "#cda269", pathEdge: "#a87f4b" },
  candy:   { name: "Карамель", nameEn: "Candy", grassA: "#7bc9b0", grassB: "#6bbaa2", path: "#f4b6c2", pathEdge: "#e08aa0" },
  midnight:{ name: "Полночь", nameEn: "Midnight", grassA: "#2c3e63", grassB: "#263757", path: "#5a6ba0", pathEdge: "#41507e" }
};
function skName(id) { const s = SKINS[id]; return LANG === "en" && s.nameEn ? s.nameEn : s.name; }
function skin() { return SKINS[Save.data.skin] || SKINS.classic; }

/* ---------- Локализация RU / EN ---------- */
let LANG = "ru";
const TXT = {
  ru: {
    title: "Башни против Мемов", play: "Играть", book: "Книга мемов", squad: "Отряд", shop: "Магазин",
    settings: "Настройки", record: "РЕКОРД", coins: "МОНЕТЫ", sound: "Звук", music: "Музыка", lang: "Язык",
    on: "вкл", off: "выкл", back: "Назад", levelSelect: "Выбор уровня", endless: "Бесконечный режим",
    wave: "Волна", level: "Уровень", score: "Счёт", combo: "Комбо", toBattle: "В бой!", startEarlier: "Начать раньше",
    placeHint: "Поставь башни и жми «В бой»", bonus: "бонус", through: "через", howToPlay: "Как играть",
    tut1: "Выбери башню внизу и поставь", tut2: "на зелёную клетку. Не пропусти монстров!",
    pause: "Пауза", resume: "Продолжить", restart: "Заново", toMenu: "В меню",
    win: "Победа!", lose: "Поражение", wavesPassed: "Волн пройдено:", bestLbl: "Рекорд:",
    next: "Далее", playAgain: "Играть снова", adX2: "Реклама: ×2 монеты", x2Done: "Монеты удвоены ✓",
    adContinue: "Реклама: продолжить (+жизни)", adWait: "Реклама…",
    upgrade: "Улучшить", repair: "Починить", sell: "Продать", close: "Закрыть", max: "МАКС",
    dmg: "Урон", range: "Радиус", rate: "Скор.", durab: "Прочность", need: "нужно",
    crates: "Ящики", skins: "Скины", upgrades: "Улучшения",
    crateBasic: "Обычный ящик", crateGold: "Золотой ящик", crateAd: "Ящик за рекламу",
    openGet: "Открой и получи пушку", cannonForAd: "Пушка за просмотр рекламы", adWord: "Реклама",
    cratesHint: "Из ящиков выпадают новые пушки для отряда",
    fieldSkins: "Скины поля", chosen: "Выбрано", choose: "Выбрать", permUp: "Постоянные улучшения",
    goldBag: "Мешок золота", goldBagSub: "+40 старт. золота", nowPlus: "Сейчас: +",
    medkit: "Аптечка", medkitSub: "+5 старт. жизней",
    squadHint: "Собери отряд до 4 пушек", inSquad: "В отряде", openArrow: "Открыть ▸", openCrate: "Открыть ящик",
    price: "Цена:", buy: "Купить", removeSquad: "Убрать из отряда", addSquad: "Добавить в отряд",
    newCannon: "Новая пушка!", dupEx: "Такая уже есть — обмен:", toSquadBtn: "В отряд", take: "Забрать",
    cannonWord: "ПУШКА", lvl: "Ур.", exit: "Выход", exitEndless1: "Выйти из бесконечного режима?",
    exitEndless2: "Прогресс не сохранится.", youGet: "Вы заберёте:", doExit: "Выйти", stay: "Остаться",
    bookTitle: "Книга мемов", hp: "Здоровье", speed: "Скорость", ability: "Особенность", locked: "?",
    speedSlow: "медленно", speedMed: "средне", speedFast: "быстро", speedVFast: "очень быстро", langName: "Русский",
    notEnough: "Недостаточно монет", watchAd: "Смотреть рекламу", upgraded: "Улучшено!", repaired: "Починено!",
    needAmt: "нужно "
  },
  en: {
    title: "Башни против Мемов", play: "Play", book: "Meme Book", squad: "Squad", shop: "Shop",
    settings: "Settings", record: "BEST", coins: "COINS", sound: "Sound", music: "Music", lang: "Language",
    on: "on", off: "off", back: "Back", levelSelect: "Select Level", endless: "Endless Mode",
    wave: "Wave", level: "Level", score: "Score", combo: "Combo", toBattle: "Fight!", startEarlier: "Start early",
    placeHint: "Place towers, then Fight", bonus: "bonus", through: "in", howToPlay: "How to play",
    tut1: "Pick a tower below and place it", tut2: "on a green tile. Stop the monsters!",
    pause: "Paused", resume: "Resume", restart: "Restart", toMenu: "Menu",
    win: "Victory!", lose: "Defeat", wavesPassed: "Waves cleared:", bestLbl: "Best:",
    next: "Next", playAgain: "Play again", adX2: "Ad: ×2 coins", x2Done: "Coins doubled ✓",
    adContinue: "Ad: continue (+lives)", adWait: "Ad…",
    upgrade: "Upgrade", repair: "Repair", sell: "Sell", close: "Close", max: "MAX",
    dmg: "Damage", range: "Range", rate: "Rate", durab: "Durability", need: "need",
    crates: "Crates", skins: "Skins", upgrades: "Upgrades",
    crateBasic: "Common crate", crateGold: "Golden crate", crateAd: "Ad crate",
    openGet: "Open to get a cannon", cannonForAd: "Cannon for watching an ad", adWord: "Ad",
    cratesHint: "Crates drop new cannons for your squad",
    fieldSkins: "Field skins", chosen: "Chosen", choose: "Choose", permUp: "Permanent upgrades",
    goldBag: "Gold sack", goldBagSub: "+40 starting gold", nowPlus: "Now: +",
    medkit: "Medkit", medkitSub: "+5 starting lives",
    squadHint: "Build a squad of up to 4 cannons", inSquad: "In squad", openArrow: "Open ▸", openCrate: "Open crate",
    price: "Price:", buy: "Buy", removeSquad: "Remove from squad", addSquad: "Add to squad",
    newCannon: "New cannon!", dupEx: "Already owned — exchange:", toSquadBtn: "To squad", take: "Take",
    cannonWord: "CANNON", lvl: "Lv.", exit: "Exit", exitEndless1: "Leave endless mode?",
    exitEndless2: "Progress won't be saved.", youGet: "You'll get:", doExit: "Leave", stay: "Stay",
    bookTitle: "Meme Book", hp: "Health", speed: "Speed", ability: "Trait", locked: "?",
    speedSlow: "slow", speedMed: "medium", speedFast: "fast", speedVFast: "very fast", langName: "English",
    notEnough: "Not enough coins", watchAd: "Watch ad", upgraded: "Upgraded!", repaired: "Repaired!",
    needAmt: "need "
  }
};
function L(k) { const t = TXT[LANG] && TXT[LANG][k]; return t != null ? t : (TXT.ru[k] != null ? TXT.ru[k] : k); }
/* Заголовок вкладки следует выбранному языку (название совпадает с тем, что в меню). */
function applyDocTitle() { try { document.title = L("title"); } catch (e) {} }
function eName(t) { const e = ENEMIES[t]; return LANG === "en" && e.nameEn ? e.nameEn : e.name; }
function eBio(t) { const e = ENEMIES[t]; return LANG === "en" && e.bioEn ? e.bioEn : e.bio; }
function cName(id) { const d = TOWERS[id]; return LANG === "en" && d.nameEn ? d.nameEn : d.name; }
function cDesc(id) { const d = TOWERS[id]; return LANG === "en" && d.descEn ? d.descEn : d.desc; }
function rName(r) { return LANG === "en" && RARITY[r].nameEn ? RARITY[r].nameEn : RARITY[r].name; }

/* ---------- Сохранение ---------- */
const SKEY = "mmd_save_v1";
const Save = {
  data: {
    highScore: 0, coins: 0, unlocked: 1, stars: {}, endlessBest: 0,
    sfx: true, music: true, skin: "classic", skins: ["classic"],
    startGold: 0, extraLives: 0, tutorial: false,
    owned: [], squad: [], lang: "ru", langChosen: false
  },
  load() { try { const s = localStorage.getItem(SKEY); if (s) Object.assign(this.data, JSON.parse(s)); } catch (e) {} this.normalize(); },
  normalize() {
    const d = this.data;
    // сохранение могло прийти от старой версии или испорченным — приводим типы,
    // иначе строка вместо числа даёт "50088" вместо 588, а строка вместо массива роняет магазин
    const num = (v, def) => { const n = Math.floor(+v); return isFinite(n) ? n : def; };
    d.coins = Math.max(0, num(d.coins, 0));
    d.highScore = Math.max(0, num(d.highScore, 0));
    d.endlessBest = Math.max(0, num(d.endlessBest, 0));
    d.unlocked = clamp(num(d.unlocked, 1), 1, 10);
    d.startGold = clamp(num(d.startGold, 0), 0, 120);
    d.extraLives = clamp(num(d.extraLives, 0), 0, 15);
    d.sfx = !!d.sfx; d.music = !!d.music; d.tutorial = !!d.tutorial; d.langChosen = !!d.langChosen;
    d.lang = d.lang === "en" ? "en" : "ru";
    if (!d.stars || typeof d.stars !== "object" || Array.isArray(d.stars)) d.stars = {};
    if (!Array.isArray(d.skins)) d.skins = ["classic"];
    d.skins = d.skins.filter(k => SKINS[k]);
    if (d.skins.indexOf("classic") < 0) d.skins.unshift("classic");
    if (!SKINS[d.skin] || d.skins.indexOf(d.skin) < 0) d.skin = "classic";
    if (!Array.isArray(d.owned) || !d.owned.length) d.owned = DEFAULT_OWNED.slice();
    DEFAULT_OWNED.forEach(id => { if (d.owned.indexOf(id) < 0) d.owned.push(id); });
    d.owned = d.owned.filter(id => TOWERS[id]);
    if (!Array.isArray(d.squad)) d.squad = [];
    d.squad = d.squad.filter(id => TOWERS[id] && d.owned.indexOf(id) >= 0).slice(0, 4);
    if (!d.squad.length) d.squad = d.owned.slice(0, 4);
  },
  write() { try { localStorage.setItem(SKEY, JSON.stringify(this.data)); } catch (e) {} }
};

/* ---------- Спрайты (необязательные локальные картинки) ----------
   Если в assets/enemies/<тип>.png лежит картинка — она используется,
   иначе рисуется векторный монстр. Всё локально, работает офлайн. */
const Assets = {
  imgs: {},
  load(key, src) {
    if (typeof Image === "undefined") return;
    const rec = { img: new Image(), ready: false };
    rec.img.onload = () => { if (rec.img.naturalWidth) rec.ready = true; };
    rec.img.onerror = () => { rec.ready = false; };
    rec.img.src = src;
    this.imgs[key] = rec;
  },
  get(key) { const r = this.imgs[key]; return r && r.ready ? r.img : null; },
  preload() {
    for (const k of Object.keys(ENEMIES)) this.load("enemy_" + k, "assets/enemies/" + k + ".png");
  }
};
/* Рисует монстра картинкой (если есть) или векторно (запасной вариант). */
function drawCreature(type, x, y, r, ph) {
  const img = Assets.get("enemy_" + type);
  if (img) {
    const scale = (r * 2.35) / Math.max(img.naturalWidth, img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    ctx.drawImage(img, x - w / 2, y + r - h, w, h);
  } else {
    ENEMIES[type].draw(ctx, x, y, r, ph);
  }
}

/* ---------- Вид/раскладка ---------- */
const view = { w: 0, h: 0, dpr: 1, ui: 1, hudH: 0, dockH: 0, board: { x: 0, y: 0, cell: 40, w: 0, h: 0 } };
function F(s) { return Math.max(8, Math.round(s * view.ui)); }
function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  view.w = w; view.h = h;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  view.dpr = dpr;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.ui = clamp(Math.min(w, h) / 720, 0.72, 1.5);
  view.hudH = Math.round(54 * view.ui);
  view.dockH = Math.round(94 * view.ui);
  const padX = 10 * view.ui, padY = 8 * view.ui;
  const availW = w - padX * 2;
  const availH = h - view.hudH - view.dockH - padY * 2;
  const cell = Math.floor(Math.min(availW / GRID_COLS, availH / GRID_ROWS));
  const bw = cell * GRID_COLS, bh = cell * GRID_ROWS;
  view.board = {
    cell, w: bw, h: bh,
    x: Math.round((w - bw) / 2),
    y: Math.round(view.hudH + (h - view.hudH - view.dockH - bh) / 2)
  };
}
function cx(c) { return view.board.x + c * view.board.cell; }
function cy(r) { return view.board.y + r * view.board.cell; }

/* ---------- Данные врагов (мем-монстры, мультяшно, 0+) ---------- */
const ENEMIES = {
  grenny: { name: "Бабка Гренда", nameEn: "Grandma Grenda", hp: 30, speed: 1.15, reward: 6, score: 10, size: 0.36, cost: 1, color: "#9b6dd6", draw: drawGrenny,
    bio: "Ворчливая бабуля с тростью. Медленная, но крепкая.", bioEn: "A grumpy granny with a cane. Slow but sturdy." },
  huggy:  { name: "Обнимака", nameEn: "Hugglin", hp: 18, speed: 1.95, reward: 5, score: 8, size: 0.34, cost: 1, color: "#3aa0ff", draw: drawHuggy,
    bio: "Синий обнимашка с добродушной улыбкой. Очень быстрый.", bioEn: "A blue hugger with a friendly smile. Very fast." },
  skibi:  { name: "Тубиди-Бачок", nameEn: "Toobidi Bowl", hp: 46, speed: 1.30, reward: 8, score: 12, size: 0.36, cost: 1, color: "#e7ebf2", draw: drawSkibi,
    bio: "Поющая голова из унитаза. Средняя скорость.", bioEn: "A singing head in a toilet. Medium speed." },
  nommy:  { name: "Ам-Ням-Ням", nameEn: "Nom Nom Nom", hp: 82, speed: 0.98, reward: 11, score: 16, size: 0.42, cost: 1, color: "#7ad15f", draw: drawNommy,
    bio: "Круглый обжора с огромными глазами. Много здоровья.", bioEn: "A round glutton with huge eyes. Lots of HP." },
  sigma:  { name: "Сигма-Котяра", nameEn: "Sigma Tomcat", hp: 26, speed: 2.25, reward: 6, score: 10, size: 0.34, cost: 1, color: "#f2a44e", draw: drawSigma,
    bio: "Крутой кот в тёмных очках. Мчит очень быстро.", bioEn: "A cool cat in shades. Dashes very fast." },
  hamster:{ name: "Хома", nameEn: "Hampter", hp: 15, speed: 2.4, reward: 5, score: 9, size: 0.32, cost: 1, color: "#e0a86a", draw: drawHamster,
    bio: "Милый хомяк с большими чёрными глазами. Быстрый, но слабый.", bioEn: "A cute big-eyed hamster. Fast but weak." },
  chill:  { name: "Чиловый парень", nameEn: "Chill Guy", hp: 130, speed: 0.9, reward: 15, score: 22, size: 0.44, cost: 2, color: "#d3a869", draw: drawChill,
    bio: "Расслабленный чувак в худи, руки в карманах. Очень живучий.", bioEn: "A laid-back dude in a hoodie. Very tanky." },
  healer: { name: "Ждун", nameEn: "Zhdun", hp: 75, speed: 1.0, reward: 16, score: 24, size: 0.40, cost: 1, color: "#b7bdc6", draw: drawHealer, heal: { radius: 1.9, amount: 9, interval: 1.1 },
    bio: "Спокойный блоб. Лечит соседних монстров — бейте его первым!", bioEn: "A calm blob. Heals nearby monsters — take it out first!" },
  booster:{ name: "Ускоритель", nameEn: "Booster", hp: 60, speed: 1.3, reward: 14, score: 22, size: 0.38, cost: 1, color: "#e6a24e", draw: drawBooster, boost: { radius: 1.9, mult: 1.7 },
    bio: "Кот в наушниках. Задаёт ритм и ускоряет монстров вокруг.", bioEn: "A cat in headphones. Sets the beat and speeds up nearby monsters." },
  breaker:{ name: "Черемша", nameEn: "Cheremsha", hp: 160, speed: 0.85, reward: 18, score: 28, size: 0.46, cost: 2, color: "#9a8f83", draw: drawBreaker, attack: { radius: 1.5, dps: 24 },
    bio: "Пушистый и очень сердитый зайчик. Ломает ваши башни — чините их за золото!", bioEn: "A fluffy, very grumpy bunny. Smashes your towers — repair them for gold!" },
  boss:   { name: "Хант Вирус", nameEn: "Hunt Virus", hp: 360, speed: 0.82, reward: 55, score: 120, size: 0.66, cost: 5, color: "#d052a8", draw: drawBoss, boss: true,
    bio: "Огромный рогатый босс с короной. Очень много здоровья.", bioEn: "A huge horned boss with a crown. Tons of HP." }
};

/* ---------- Редкости пушек ---------- */
const RARITY = {
  rare:   { name: "Редкая",      nameEn: "Rare",      color: "#4da3ff", order: 0, buy: 150,  dupCoins: 25 },
  mythic: { name: "Мифическая",  nameEn: "Mythic",    color: "#b06bff", order: 1, buy: 500,  dupCoins: 70 },
  legend: { name: "Легендарная", nameEn: "Legendary", color: "#ffb020", order: 2, buy: 1500, dupCoins: 200 }
};
const RARITY_ORDER = ["rare", "mythic", "legend"];

/* ---------- Данные пушек (коллекция) ---------- */
const TOWERS = {
  /* --- Редкие --- */
  slinger: { name: "Рогатка", nameEn: "Slingshot", desc: "Быстрый выстрел", descEn: "Fast single shot", rarity: "rare", color: "#06d6a0", proj: "pea",
    levels: [{ cost: 40, dmg: 9, range: 2.4, rate: 1.7 }, { cost: 45, dmg: 15, range: 2.7, rate: 2.0 }, { cost: 70, dmg: 25, range: 3.0, rate: 2.4 }] },
  frost: { name: "Морозко", nameEn: "Frost", desc: "Замедляет врагов", descEn: "Slows enemies", rarity: "rare", color: "#4dc9e6", proj: "shard",
    slowDur: 1.4, slowByLvl: [0.42, 0.55, 0.68],
    levels: [{ cost: 55, dmg: 5, range: 2.2, rate: 1.3 }, { cost: 60, dmg: 8, range: 2.4, rate: 1.5 }, { cost: 85, dmg: 12, range: 2.6, rate: 1.7 }] },
  boomer: { name: "Бабах", nameEn: "Boomer", desc: "Урон по площади", descEn: "Area damage", rarity: "rare", color: "#ef8354", proj: "bomb", splash: 1.15,
    levels: [{ cost: 85, dmg: 22, range: 2.1, rate: 0.75 }, { cost: 80, dmg: 34, range: 2.3, rate: 0.85 }, { cost: 120, dmg: 54, range: 2.5, rate: 1.0 }] },
  sniper: { name: "Снайпер", nameEn: "Sniper", desc: "Дальний, мощный", descEn: "Long-range, powerful", rarity: "rare", color: "#ffd166", proj: "beam",
    levels: [{ cost: 110, dmg: 42, range: 4.2, rate: 0.55 }, { cost: 100, dmg: 72, range: 4.6, rate: 0.65 }, { cost: 150, dmg: 112, range: 5.0, rate: 0.8 }] },
  gatling: { name: "Пулемёт", nameEn: "Gatling", desc: "Шквал очень частых пуль", descEn: "Rapid-fire hail", rarity: "rare", color: "#9be564", proj: "pea",
    levels: [{ cost: 70, dmg: 5, range: 2.2, rate: 3.2 }, { cost: 70, dmg: 8, range: 2.4, rate: 3.6 }, { cost: 110, dmg: 13, range: 2.6, rate: 4.2 }] },

  /* --- Мифические --- */
  tesla: { name: "Тесла", nameEn: "Tesla", desc: "Молния бьёт по цепочке", descEn: "Chain lightning", rarity: "mythic", color: "#6ad1ff", proj: "chain",
    chain: { count: 2, range: 1.7, falloff: 0.7 },
    levels: [{ cost: 95, dmg: 20, range: 2.6, rate: 1.0 }, { cost: 90, dmg: 32, range: 2.8, rate: 1.2 }, { cost: 135, dmg: 52, range: 3.0, rate: 1.4 }] },
  venom: { name: "Ядоплюй", nameEn: "Venom", desc: "Отравляет врагов", descEn: "Poisons enemies", rarity: "mythic", color: "#7ed957", proj: "pea",
    poison: { dur: 2.5 }, dpsByLvl: [10, 16, 24],
    levels: [{ cost: 85, dmg: 6, range: 2.4, rate: 1.4 }, { cost: 85, dmg: 9, range: 2.6, rate: 1.6 }, { cost: 130, dmg: 14, range: 2.8, rate: 1.8 }] },
  blizzard: { name: "Вьюга", nameEn: "Blizzard", desc: "Взрыв со льдом и замедлением", descEn: "Icy blast + slow", rarity: "mythic", color: "#8fd3ff", proj: "bomb", splash: 1.3,
    slowOnSplash: { f: 0.5, dur: 1.6 },
    levels: [{ cost: 95, dmg: 14, range: 2.2, rate: 0.9 }, { cost: 90, dmg: 22, range: 2.4, rate: 1.0 }, { cost: 145, dmg: 34, range: 2.6, rate: 1.2 }] },
  twin: { name: "Двустволка", nameEn: "Twin", desc: "Бьёт по 2 целям сразу", descEn: "Hits 2 targets at once", rarity: "mythic", color: "#ff8f6b", proj: "pea", targets: 2,
    levels: [{ cost: 95, dmg: 12, range: 2.5, rate: 1.5 }, { cost: 90, dmg: 19, range: 2.7, rate: 1.7 }, { cost: 135, dmg: 30, range: 2.9, rate: 2.0 }] },

  /* --- Легендарные --- */
  railgun: { name: "Рельса", nameEn: "Railgun", desc: "Сверхмощный дальний луч", descEn: "Super long-range beam", rarity: "legend", color: "#cdd6ff", proj: "beam",
    levels: [{ cost: 165, dmg: 90, range: 5.0, rate: 0.6 }, { cost: 150, dmg: 150, range: 5.4, rate: 0.7 }, { cost: 225, dmg: 240, range: 5.8, rate: 0.85 }] },
  inferno: { name: "Инферно", nameEn: "Inferno", desc: "Огромный взрыв и поджог", descEn: "Huge blast + burn", rarity: "legend", color: "#ff6b3d", proj: "bomb", splash: 1.6,
    poison: { dur: 2.0 }, dpsByLvl: [18, 28, 42],
    levels: [{ cost: 160, dmg: 40, range: 2.4, rate: 0.8 }, { cost: 145, dmg: 62, range: 2.6, rate: 0.9 }, { cost: 225, dmg: 95, range: 2.8, rate: 1.05 }] },
  prism: { name: "Призма", nameEn: "Prism", desc: "Луч по 3 целям", descEn: "Hits 3 targets", rarity: "legend", color: "#d17bff", proj: "pea", targets: 3,
    levels: [{ cost: 170, dmg: 26, range: 3.0, rate: 1.6 }, { cost: 155, dmg: 40, range: 3.2, rate: 1.8 }, { cost: 230, dmg: 62, range: 3.4, rate: 2.1 }] }
};
const CANNON_IDS = Object.keys(TOWERS);
const DEFAULT_OWNED = ["slinger", "frost", "boomer", "sniper"];
function cannonsOfRarity(rar) { return CANNON_IDS.filter(id => TOWERS[id].rarity === rar); }
function barrelOf(def) {
  if (def.proj === "bomb") return "cannon";
  if (def.proj === "shard") return "crystal";
  if (def.proj === "beam" || def.proj === "chain") return "long";
  return "gun";
}

/* ---------- Игровое состояние ---------- */
const G = {
  state: "loading", mode: "level", level: 1,
  path: null, cfg: null,
  towers: [], enemies: [], projectiles: [], particles: [], texts: [], effects: [],
  gold: 0, lives: 0, maxLives: 0, score: 0,
  waves: [], waveIndex: -1, spawnList: [], waveActive: false, betweenTimer: 0,
  combo: 0, comboTimer: 0,
  selType: null, selTower: null, hoverCell: null,
  clock: 0, shake: 0, speed: 1,
  adPlaying: false, continueUsed: false, x2Used: false,
  pendingCoins: 0, resultStars: 0,
  hot: [], tutorialShown: false, tutorT: 0,
  shopTab: "crates", colTab: "rare",
  crateResult: null, crateAnim: 0, prevState: "menu"
};
let ysdk = null;
let audioReady = false;

/* =====================================================================
   ЯНДЕКС SDK
   ===================================================================== */
function pauseForAd(on) {
  G.adPlaying = on;
  if (on) Sound.stopMusic();
  else { if (Save.data.music) Sound.startMusic(); lastT = performance.now(); }
}
/* SDK может прислать onClose/onError не один раз — доводим показ до конца ровно однажды. */
function showInterstitial(after) {
  if (ysdk && ysdk.adv && ysdk.adv.showFullscreenAdv) {
    let done = false;
    const finish = () => { if (done) return; done = true; pauseForAd(false); if (after) after(); };
    pauseForAd(true);
    ysdk.adv.showFullscreenAdv({ callbacks: { onClose: finish, onError: finish } });
  } else { if (after) after(); }
}
/* Награда выдаётся ровно один раз: повторный onClose от SDK не должен её удваивать. */
function showRewarded(onReward) {
  if (ysdk && ysdk.adv && ysdk.adv.showRewardedVideo) {
    let ok = false, done = false;
    const finish = () => { if (done) return; done = true; pauseForAd(false); if (ok && onReward) onReward(); };
    pauseForAd(true);
    ysdk.adv.showRewardedVideo({ callbacks: {
      onRewarded: () => { ok = true; },
      onClose: finish,
      onError: finish
    }});
  } else { if (onReward) onReward(); } // локальный тест — награду выдаём сразу
}
let sdkLang = null;
/* Язык площадки: основной источник — SDK, запасной — параметр ?lang= в адресе,
   который Яндекс Игры подставляют кадру с игрой (п. 2.14). */
function normLang(v) { return String(v || "").slice(0, 2).toLowerCase() === "ru" ? "ru" : "en"; }
function urlLang() {
  try {
    const m = (location.search || "").match(/[?&]lang=([A-Za-z-]+)/);
    return m ? normLang(m[1]) : null;
  } catch (e) { return null; }
}
function initSDK() {
  if (sdkLang == null) sdkLang = urlLang();
  if (typeof YaGames === "undefined") { startGame(); return; }
  YaGames.init().then(sdk => {
    ysdk = sdk;
    try { if (ysdk.features && ysdk.features.LoadingAPI) ysdk.features.LoadingAPI.ready(); } catch (e) {}
    try { const l = ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang; if (l) sdkLang = normLang(l); } catch (e) {}
    startGame();
  }).catch(() => startGame());
}

/* =====================================================================
   ЗАПУСК
   ===================================================================== */
function startGame() {
  Save.load();
  if (!Save.data.langChosen && sdkLang) { Save.data.lang = sdkLang; Save.write(); }
  LANG = Save.data.lang === "en" ? "en" : "ru";
  applyDocTitle();
  Assets.preload();
  Sound.setSfx(Save.data.sfx);
  Sound.setMusicEnabled(Save.data.music);
  layout();
  G.state = "menu";
  bindEvents();
  lastT = performance.now();
  requestAnimationFrame(loop);
}

/* =====================================================================
   УРОВНИ / ВОЛНЫ
   ===================================================================== */
function basicPool(level) {
  const p = ["grenny", "huggy"];
  if (level >= 2) p.push("skibi");
  if (level >= 3) p.push("hamster");
  if (level >= 4) p.push("nommy");
  if (level >= 5) p.push("sigma");
  return p;
}
/* Волны уровней: мягкий старт для детей, плавный рост, спецмонстры вводятся
   аккуратно и поштучно, босс — только с 3-го уровня на последней волне. */
function genLevelWaves(level) {
  const basics = basicPool(level);
  const nW = 4 + level; // ур.1 = 5 волн ... ур.10 = 14 волн
  const waves = [];
  for (let w = 0; w < nW; w++) {
    const spawns = [];
    const count = 3 + Math.floor(w * 0.8) + Math.floor(level * 0.5);
    const types = 1 + (w >= 2 ? 1 : 0) + (level >= 6 && w >= 4 ? 1 : 0);
    const gap = Math.max(0.45, 0.9 - level * 0.018 - w * 0.012);
    for (let t = 0; t < types; t++) {
      const type = basics[(w + t * 3 + level) % basics.length];
      spawns.push({ type, count: Math.max(2, Math.round(count / types)), gap, delay: t * 0.6 });
    }
    if (level >= 4 && w >= 2 && w % 2 === 0) spawns.push({ type: "chill", count: 1, gap: 1.5, delay: 0.8 });
    if (level >= 5 && w >= 3 && w % 3 === 2) spawns.push({ type: "booster", count: 1, gap: 1.5, delay: 1 });
    if (level >= 6 && w >= 3 && w % 3 === 0) spawns.push({ type: "healer", count: 1, gap: 1.5, delay: 1 });
    if (level >= 7 && w >= 4 && w % 3 === 1) spawns.push({ type: "breaker", count: 1, gap: 1.5, delay: 1.2 });
    if (level >= 3 && w === nW - 1) spawns.push({ type: "boss", count: 1 + Math.floor((level - 3) / 4), gap: 2.6, delay: 1.5 });
    waves.push({ spawns });
  }
  return waves;
}
function genEndlessWave(n) {
  const basics = ["grenny", "huggy", "skibi", "nommy", "sigma", "hamster", "chill"];
  const spawns = [];
  const count = 6 + n * 2.5;
  const nt = Math.min(4, 2 + Math.floor(n / 3));
  for (let t = 0; t < nt; t++) {
    spawns.push({ type: basics[(n * 2 + t * 3) % basics.length], count: Math.max(3, Math.round(count / nt)),
      gap: Math.max(0.2, 0.7 - n * 0.02), delay: t * 0.3 });
  }
  // спецмонстры вводятся постепенно
  if (n >= 3) spawns.push({ type: "healer", count: 1 + Math.floor(n / 6), gap: 2, delay: 0.5 });
  if (n >= 4) spawns.push({ type: "booster", count: 1 + Math.floor(n / 7), gap: 2, delay: 1 });
  if (n >= 5) spawns.push({ type: "breaker", count: 1 + Math.floor(n / 5), gap: 1.6, delay: 1.5 });
  if (n >= 3 && n % 3 === 0) spawns.push({ type: "boss", count: 1 + Math.floor(n / 6), gap: 1.5, delay: 1 });
  return { spawns };
}
function scaleFor(gl) {
  return { hp: 1 + 0.18 * (gl - 1), spd: Math.min(1.65, 1 + 0.02 * (gl - 1)) };
}

function startLevel(n) {
  G.mode = "level"; G.level = n;
  G.cfg = LEVEL_MAPS[n - 1];
  G.waves = genLevelWaves(n);
  resetRun();
  G.state = "playing";
}
function startEndless() {
  G.mode = "endless"; G.level = 0;
  G.cfg = ENDLESS_MAP;
  G.waves = [];
  resetRun();
  G.state = "playing";
}
/* Стартовое золото. Отряд целиком из дорогих пушек иначе не может поставить
   вообще ничего: 150 золота против 165 за рельсу — поле остаётся пустым,
   убивать некому, золота не появится. Гарантируем две башни любого отряда. */
function startingGold() {
  const base = 150 + Save.data.startGold;
  const costs = Save.data.squad.map(id => TOWERS[id].levels[0].cost);
  const need = costs.length ? Math.min.apply(null, costs) * 2 : 0;
  return Math.max(base, need);
}
function resetRun() {
  G.path = makePath(G.cfg);
  G.towers = []; G.enemies = []; G.projectiles = []; G.particles = []; G.texts = []; G.effects = [];
  G.gold = startingGold();
  G.maxLives = 25 + Save.data.extraLives;
  G.lives = G.maxLives;
  G.score = 0; G.combo = 0; G.comboTimer = 0;
  G.waveIndex = -1; G.spawnList = []; G.waveActive = false; G.betweenTimer = 0;
  G.selType = null; G.selTower = null; G.hoverCell = null;
  G.clock = 0; G.shake = 0; G.speed = 1;
  G.continueUsed = false; G.x2Used = false;
  G.endlessCoins = 0; G.confirm = null; G.infoCannon = null;
  G.tutorT = Save.data.tutorial ? 0 : 6;
}
function buildSpawnList(wave) {
  const list = [];
  wave.spawns.forEach(sp => {
    for (let k = 0; k < sp.count; k++) list.push({ type: sp.type, t: (sp.delay || 0) + k * sp.gap });
  });
  return list;
}
function startNextWave() {
  G.waveIndex++;
  const wave = G.mode === "level" ? G.waves[G.waveIndex] : genEndlessWave(G.waveIndex);
  G.spawnList = buildSpawnList(wave);
  G.waveActive = true;
  Sound.play("wave");
  addText(view.w / 2, view.board.y + 30 * view.ui, L("wave") + " " + (G.waveIndex + 1), PAL.gold, F(24), 1.4);
}
function currentGL() { return G.mode === "level" ? G.level : 8 + G.waveIndex * 1.4; }
function spawnEnemy(type) {
  const base = ENEMIES[type];
  const sc = scaleFor(currentGL());
  const hp = base.hp * sc.hp;
  G.enemies.push({
    type, base, hpMax: hp, hp,
    dist: 0, baseSpeed: base.speed * sc.spd, speed: base.speed * sc.spd,
    slowT: 0, slowF: 0, poisonT: 0, poisonDps: 0, boostT: 0, boostMult: 1, healT: 0,
    size: base.size, phase: Math.random() * TAU,
    _x: 0, _y: 0
  });
}

/* =====================================================================
   ОБНОВЛЕНИЕ
   ===================================================================== */
let lastT = 0;
function loop(now) {
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.05) dt = 0.05;
  if (G.state === "playing" && !G.adPlaying) {
    // подшаги для стабильности на ускорении (x2/x5)
    let t = dt * G.speed;
    while (t > 0 && G.state === "playing") { const s = Math.min(t, 0.034); update(s); t -= s; }
  }
  if (G.state === "crate") G.crateAnim += dt;
  if (G.toast) { G.toast.life -= dt; if (G.toast.life <= 0) G.toast = null; }
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  G.clock += dt;
  if (G.tutorT > 0) G.tutorT -= dt;
  if (G.comboTimer > 0) { G.comboTimer -= dt; if (G.comboTimer <= 0) G.combo = 0; }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 3);

  // менеджер волн: 1-я волна — по кнопке; далее 5-сек. таймер с досрочным стартом
  if (G.waveActive) {
    for (let i = G.spawnList.length - 1; i >= 0; i--) {
      G.spawnList[i].t -= dt;
      if (G.spawnList[i].t <= 0) { spawnEnemy(G.spawnList[i].type); G.spawnList.splice(i, 1); }
    }
    if (G.spawnList.length === 0 && G.enemies.length === 0) {
      G.waveActive = false;
      onWaveCleared();
    }
  } else if (G.waveIndex >= 0 && G.betweenTimer > 0) {
    G.betweenTimer -= dt;
    if (G.betweenTimer <= 0) { G.betweenTimer = 0; startNextWave(); }
  }

  cacheEnemyPos();
  updateAuras(dt);
  updateEnemies(dt);
  if (G.state !== "playing") return; // проигрыш внутри updateEnemies — кадр дальше не досчитываем
  cacheEnemyPos();
  updateTowers(dt);
  updateProjectiles(dt);
  updateParticles(dt);
}

/* Экранные позиции монстров считаем один раз за такт: их читают башни, ауры,
   снаряды и взрывы, а раньше каждая башня пересчитывала путь для каждого монстра. */
function cacheEnemyPos() {
  for (const e of G.enemies) { const p = posAt(G.path, e.dist); e._x = cx(p.c); e._y = cy(p.r); }
}
function endlessWaveCoins(n) { return 4 + Math.floor(n * 1.2); }

function onWaveCleared() {
  if (G.mode === "level" && G.waveIndex >= G.waves.length - 1) { winLevel(); return; }
  const bonus = 20 + G.waveIndex * 5;
  G.gold += bonus;
  addAmount(view.w / 2, view.board.y + view.board.h - 24 * view.ui, "+", bonus, "gold", PAL.gold, F(18), 1.2);
  G.betweenTimer = 5; // таймер до следующей волны (можно начать раньше)
  if (G.mode === "endless") {
    const cw = endlessWaveCoins(G.waveIndex + 1);
    G.endlessCoins += cw;
    addAmount(view.w / 2, view.board.y + 56 * view.ui, "+", cw, "gem", PAL.gem, F(17), 1.4);
    if (G.waveIndex + 1 > Save.data.endlessBest) { Save.data.endlessBest = G.waveIndex + 1; Save.write(); }
  }
}

/* Ауры новых монстров: лечение, ускорение, атака по башням. */
function updateAuras(dt) {
  const cell = view.board.cell;
  const hpScale = scaleFor(currentGL()).hp;
  for (const e of G.enemies) { if (e.boostT > 0) e.boostT -= dt; }
  for (const e of G.enemies) {
    const base = e.base;
    if (!base.heal && !base.boost && !base.attack) continue;
    const ex = e._x, ey = e._y;
    if (base.heal) {
      e.healT -= dt;
      if (e.healT <= 0) {
        e.healT = base.heal.interval;
        let healed = false;
        for (const o of G.enemies) {
          if (o === e || o.hp >= o.hpMax) continue;
          if (Math.hypot(o._x - ex, o._y - ey) <= base.heal.radius * cell) {
            o.hp = Math.min(o.hpMax, o.hp + base.heal.amount * hpScale); healed = true;
          }
        }
        if (healed) G.effects.push({ kind: "pulse", x: ex, y: ey, r: base.heal.radius * cell, life: 0.5, max: 0.5, color: "#6fe39a" });
      }
    }
    if (base.boost) {
      for (const o of G.enemies) {
        if (o === e || o.base.boost) continue;
        if (Math.hypot(o._x - ex, o._y - ey) <= base.boost.radius * cell) { o.boostT = 0.3; o.boostMult = base.boost.mult; }
      }
    }
    if (base.attack) {
      for (const tw of G.towers) {
        if (Math.hypot(cx(tw.c + 0.5) - ex, cy(tw.r + 0.5) - ey) <= base.attack.radius * cell) {
          tw.hp -= base.attack.dps * dt;
          if (Math.random() < dt * 5) G.particles.push(makeParticle(cx(tw.c + 0.5), cy(tw.r + 0.5), "#ffb04a", 0.3, 2));
        }
      }
    }
  }
  // разрушенные башни
  for (let i = G.towers.length - 1; i >= 0; i--) {
    if (G.towers[i].hp <= 0) {
      const tw = G.towers[i]; G.towers.splice(i, 1);
      if (G.selTower === tw) G.selTower = null;
      const px = cx(tw.c + 0.5), py = cy(tw.r + 0.5);
      G.effects.push({ kind: "explosion", x: px, y: py, life: 0.35, max: 0.35, r: cell * 0.7, color: "#9aa3b2" });
      for (let k = 0; k < 10; k++) G.particles.push(makeParticle(px, py, "#8b93a3", 0.4, 3));
      G.shake = Math.min(1, G.shake + 0.35); Sound.play("boom");
    }
  }
}

function updateEnemies(dt) {
  const path = G.path;
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.poisonT > 0) {
      e.poisonT -= dt; e.hp -= e.poisonDps * dt;
      if (e.hp <= 0) { killEnemy(e, e._x, e._y); continue; }
    }
    if (e.slowT > 0) { e.slowT -= dt; }
    let eff = e.slowT > 0 ? e.baseSpeed * (1 - e.slowF) : e.baseSpeed;
    if (e.boostT > 0) eff *= e.boostMult;
    e.dist += eff * dt;
    if (e.dist >= path.total) {
      // дошёл до выхода
      G.enemies.splice(i, 1);
      G.lives -= e.base.cost;
      G.combo = 0;
      G.shake = Math.min(1, G.shake + 0.5);
      Sound.play("life");
      addAmount(view.w / 2, view.board.y + 30 * view.ui, "-", e.base.cost, "life", PAL.danger, F(22), 1.2);
      if (G.lives <= 0) { G.lives = 0; gameOver(); return; }
    }
  }
}

function updateTowers(dt) {
  const cell = view.board.cell;
  for (const tw of G.towers) {
    const def = TOWERS[tw.type];
    const st = def.levels[tw.level];
    if (tw.cooldown > 0) tw.cooldown -= dt;
    const tx = cx(tw.c + 0.5), ty = cy(tw.r + 0.5);
    const rangePx = st.range * cell;
    const inRange = [];
    for (const e of G.enemies) {
      if (Math.hypot(e._x - tx, e._y - ty) <= rangePx) inRange.push(e);
    }
    if (!inRange.length) continue;
    inRange.sort((a, b) => b.dist - a.dist);
    tw.angle = Math.atan2(inRange[0]._y - ty, inRange[0]._x - tx);
    if (tw.cooldown <= 0) {
      tw.cooldown = 1 / st.rate;
      fireTower(tw, st, def, tx, ty, inRange);
    }
  }
}
function makePayload(tw, st, def) {
  const p = { dmg: st.dmg };
  if (def.slowByLvl) { p.slowF = def.slowByLvl[tw.level]; p.slowDur = def.slowDur; }
  if (def.slowOnSplash) { p.slowF = def.slowOnSplash.f; p.slowDur = def.slowOnSplash.dur; }
  if (def.poison) { p.poisonDps = def.dpsByLvl[tw.level]; p.poisonDur = def.poison.dur; }
  if (def.splash) p.splash = def.splash * view.board.cell;
  return p;
}
function applyPayload(e, p, x, y) {
  damageEnemy(e, p.dmg, x, y);
  if (G.enemies.indexOf(e) >= 0) {
    if (p.slowF) { e.slowT = Math.max(e.slowT, p.slowDur); e.slowF = p.slowF; }
    if (p.poisonDps) { e.poisonT = Math.max(e.poisonT || 0, p.poisonDur); e.poisonDps = Math.max(e.poisonDps || 0, p.poisonDps); }
  }
}
function fireTower(tw, st, def, tx, ty, inRange) {
  const nTargets = def.targets || 1;
  if (def.proj === "chain") {
    fireChain(tw, st, def, tx, ty, inRange[0]);
    Sound.play("snipe");
    return;
  }
  if (def.proj === "beam") {
    const shots = Math.min(nTargets, inRange.length);
    for (let i = 0; i < shots; i++) {
      const e = inRange[i];
      G.effects.push({ kind: "beam", x1: tx, y1: ty, x2: e._x, y2: e._y, life: 0.16, max: 0.16, color: def.color });
      applyPayload(e, makePayload(tw, st, def), e._x, e._y);
      for (let k = 0; k < 3; k++) G.particles.push(makeParticle(e._x, e._y, def.color, rnd(0.15, 0.3), rnd(2, 4), "spark"));
    }
    G.effects.push({ kind: "flash", x: tx, y: ty, life: 0.12, max: 0.12, r: view.board.cell * 0.34, color: def.color, ang: Math.atan2(inRange[0]._y - ty, inRange[0]._x - tx) });
    Sound.play("snipe");
    return;
  }
  const shots = Math.min(nTargets, inRange.length);
  for (let i = 0; i < shots; i++) {
    const e = inRange[i];
    G.projectiles.push({
      x: tx, y: ty, target: e, type: def.proj,
      speed: (def.proj === "bomb" ? 6 : 10) * view.board.cell,
      color: def.color, payload: makePayload(tw, st, def),
      lx: e._x, ly: e._y
    });
  }
  if (shots > 0) {
    G.effects.push({
      kind: "flash", x: tx, y: ty, life: 0.09, max: 0.09,
      r: view.board.cell * (def.proj === "bomb" ? 0.3 : 0.2), color: def.color,
      ang: Math.atan2(inRange[0]._y - ty, inRange[0]._x - tx)
    });
    if (def.proj === "bomb") {
      for (let k = 0; k < 2; k++) G.particles.push(makeParticle(tx, ty, "#9aa0ad", rnd(0.35, 0.6), rnd(0.8, 1.4), "smoke"));
    }
  }
  Sound.play(def.proj === "shard" ? "frost" : "shoot");
}
function fireChain(tw, st, def, tx, ty, primary) {
  const base = makePayload(tw, st, def);
  const hit = new Set();
  const cell = view.board.cell;
  let cur = primary, px = tx, py = ty, dmg = base.dmg;
  for (let j = 0; j <= def.chain.count; j++) {
    if (!cur || G.enemies.indexOf(cur) < 0) break;
    const ex = cur._x, ey = cur._y;
    G.effects.push({ kind: "bolt", pts: boltPoints(px, py, ex, ey, cell * 0.16), life: 0.18, max: 0.18, color: def.color });
    applyPayload(cur, Object.assign({}, base, { dmg }), ex, ey);
    hit.add(cur); px = ex; py = ey; dmg *= def.chain.falloff;
    let next = null, nd = 1e9;
    for (const e of G.enemies) {
      if (hit.has(e)) continue;
      const nx = e._x, ny = e._y, d = Math.hypot(nx - ex, ny - ey);
      if (d <= def.chain.range * cell && d < nd) { nd = d; next = e; }
    }
    cur = next;
  }
}

function updateProjectiles(dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i];
    let tx, ty;
    if (p.target && p.target.hp > 0 && G.enemies.indexOf(p.target) >= 0) {
      tx = p.target._x; ty = p.target._y; p.lx = tx; p.ly = ty;
    } else { tx = p.lx; ty = p.ly; }
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    p.ang = Math.atan2(dy, dx);
    p.t = (p.t || 0) + dt;
    if (d <= step + 2) {
      // попадание
      onProjectileHit(p, tx, ty);
      G.projectiles.splice(i, 1);
      continue;
    }
    p.x += dx / d * step; p.y += dy / d * step;
  }
}
function onProjectileHit(p, x, y) {
  if (p.payload.splash) {
    const sp = p.payload.splash;
    for (const e of G.enemies.slice()) {
      const ex = e._x, ey = e._y;
      if (Math.hypot(ex - x, ey - y) <= sp) applyPayload(e, p.payload, ex, ey);
    }
    G.effects.push({ kind: "explosion", x, y, life: 0.4, max: 0.4, r: sp, color: p.color, seed: Math.random() * TAU });
    for (let k = 0; k < 7; k++) G.particles.push(makeParticle(x, y, "#ffd07a", rnd(0.25, 0.5), rnd(4, 7), "spark"));
    for (let k = 0; k < 4; k++) G.particles.push(makeParticle(x, y, "#8d8f9c", rnd(0.5, 0.9), rnd(1, 2), "smoke"));
    G.shake = Math.min(1, G.shake + 0.15);
    Sound.play("boom");
  } else {
    if (p.target && p.target.hp > 0 && G.enemies.indexOf(p.target) >= 0) {
      applyPayload(p.target, p.payload, x, y);
    }
    G.effects.push({ kind: "spark", x, y, life: 0.16, max: 0.16, r: view.board.cell * 0.22, color: p.color, seed: Math.random() * TAU });
    for (let k = 0; k < 4; k++) G.particles.push(makeParticle(x, y, p.color, rnd(0.2, 0.35), rnd(2, 3.6), "spark"));
    Sound.play("hit");
  }
}
function damageEnemy(e, dmg, x, y) {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  if (e.hp <= 0) killEnemy(e, x, y);
}
function killEnemy(e, x, y) {
  const idx = G.enemies.indexOf(e);
  if (idx < 0) return;
  G.enemies.splice(idx, 1);
  const reward = e.base.reward + Math.floor(currentGL() * 0.4);
  G.gold += reward;
  // комбо
  G.combo = Math.min(G.combo + 1, 30);
  G.comboTimer = 2.4;
  const mult = comboMult();
  G.score += Math.round(e.base.score * mult);
  if (G.combo > 1 && G.combo % 3 === 0) Sound.play("combo");
  Sound.play("pop");
  addAmount(x, y - 12 * view.ui, "+", reward, "gold", PAL.gold, F(16), 1.0);
  const n = e.base.boss ? 22 : 10;
  for (let k = 0; k < n; k++) G.particles.push(makeParticle(x, y, e.base.color, rnd(0.35, 0.7), rnd(2, 4.5)));
  for (let k = 0; k < (e.base.boss ? 10 : 4); k++) G.particles.push(makeParticle(x, y, "#fff3c4", rnd(0.3, 0.55), rnd(3, 5), "star"));
  G.effects.push({ kind: "pulse", x, y, life: 0.3, max: 0.3, r: view.board.cell * (e.base.boss ? 1.4 : 0.75), color: e.base.color });
  if (e.base.boss) {
    G.shake = Math.min(1.2, G.shake + 0.6);
    G.effects.push({ kind: "explosion", x, y, life: 0.5, max: 0.5, r: view.board.cell * 1.5, color: e.base.color, seed: Math.random() * TAU });
  }
}
function comboMult() { return 1 + Math.min(G.combo, 20) * 0.15; }

/* Смахивает монстров с поля: награда за рекламу «продолжить». Без этого
   недобитая волна съедает возвращённые жизни за пару секунд. */
function clearBoardEnemies() {
  for (const e of G.enemies) {
    const p = posAt(G.path, e.dist), x = cx(p.c), y = cy(p.r);
    G.effects.push({ kind: "explosion", x, y, life: 0.35, max: 0.35, r: view.board.cell * 0.6, color: e.base.color });
    for (let k = 0; k < 6; k++) G.particles.push(makeParticle(x, y, e.base.color, 0.4, 3));
  }
  G.enemies.length = 0;
  G.projectiles.length = 0;
  G.combo = 0; G.comboTimer = 0;
}

function makeParticle(x, y, color, life, spd, kind) {
  const a = Math.random() * TAU;
  const p = {
    x, y, kind: kind || "dot",
    vx: Math.cos(a) * spd * view.board.cell * 0.3,
    vy: Math.sin(a) * spd * view.board.cell * 0.3 - view.board.cell * 0.4,
    life, max: life, color, size: rnd(2, 4) * view.ui
  };
  if (kind === "spark") { p.size = rnd(1.4, 2.6) * view.ui; p.vx *= 1.6; p.vy *= 1.6; }
  if (kind === "star") { p.size = rnd(2.2, 3.6) * view.ui; p.spin = rnd(-9, 9); }
  if (kind === "smoke") {
    p.size = rnd(3, 6) * view.ui;
    p.vx *= 0.3; p.vy = -Math.abs(p.vy) * 0.35 - view.board.cell * 0.15;
  }
  return p;
}
function updateParticles(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === "smoke") { p.vx *= 0.94; p.vy *= 0.94; }
    else { p.vy += view.board.cell * 3 * dt; p.vx *= 0.99; }
    if (p.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i]; t.life -= dt; t.y -= 26 * view.ui * dt;
    if (t.life <= 0) G.texts.splice(i, 1);
  }
  for (let i = G.effects.length - 1; i >= 0; i--) {
    G.effects[i].life -= dt;
    if (G.effects[i].life <= 0) G.effects.splice(i, 1);
  }
}
function addText(x, y, str, color, size, life) {
  G.texts.push({ x, y, text: str, color, size, life: life || 1, max: life || 1 });
}
/* Всплывающий значок + число (вместо слов «монет/золота/жизнь»). */
function addAmount(x, y, prefix, val, icon, color, size, life) {
  G.texts.push({ x, y, prefix, val, icon, color, size, life: life || 1, max: life || 1 });
}
/* Тост-уведомление (напр. «Недостаточно монет»); reward — сколько монет за рекламу. */
function showToast(text, reward) {
  G.toast = { text, life: 2.0, max: 2.0, reward: reward || 0 };
  Sound.play("hit");
}

/* позиция вдоль пути (в координатах центров ячеек) */
function posAt(path, dist) {
  let d = dist;
  for (let i = 0; i < path.seg.length; i++) {
    if (d <= path.seg[i] || i === path.seg.length - 1) {
      const t = path.seg[i] > 0 ? clamp(d / path.seg[i], 0, 1) : 0;
      const a = path.way[i], b = path.way[i + 1];
      return { c: lerp(a.c, b.c, t), r: lerp(a.r, b.r, t), ang: Math.atan2(b.r - a.r, b.c - a.c) };
    }
    d -= path.seg[i];
  }
  const l = path.way[path.way.length - 1];
  return { c: l.c, r: l.r, ang: 0 };
}

/* ---------- Конец уровня ---------- */
function winLevel() {
  const ratio = G.lives / G.maxLives;
  const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
  G.resultStars = stars;
  if ((Save.data.stars[G.level] || 0) < stars) Save.data.stars[G.level] = stars;
  if (G.level < 10 && Save.data.unlocked < G.level + 1) Save.data.unlocked = G.level + 1;
  const coins = Math.round((25 + stars * 15 + Math.floor(G.score / 40)) * (1));
  G.pendingCoins = coins;
  Save.data.coins += coins;
  if (G.score > Save.data.highScore) Save.data.highScore = G.score;
  Save.write();
  G.x2Used = false; G.shake = 0;
  G.state = "win";
  Sound.play("win");
}
function gameOver() {
  const coins = G.mode === "endless" ? (G.endlessCoins + Math.floor(G.score / 40)) : (Math.floor(G.score / 30) + G.waveIndex * 4);
  G.pendingCoins = Math.max(0, coins);
  Save.data.coins += G.pendingCoins;
  G.endlessCoins = 0; // уже выплачены: иначе после «продолжить» начислим их второй раз
  if (G.score > Save.data.highScore) Save.data.highScore = G.score;
  if (G.mode === "endless" && G.waveIndex + 1 > Save.data.endlessBest) Save.data.endlessBest = G.waveIndex + 1;
  Save.write();
  G.x2Used = false; G.shake = 0;
  G.state = "gameover";
  Sound.play("lose");
}

/* =====================================================================
   ВВОД
   ===================================================================== */
function bindEvents() {
  canvas.addEventListener("pointerdown", onDown, { passive: false });
  canvas.addEventListener("pointermove", onMove, { passive: false });
  canvas.addEventListener("pointerup", onUp, { passive: false });
  canvas.addEventListener("pointercancel", () => { pointer.active = false; });
  // запрет контекстного меню и выделения на всей поверхности игры (п. 1.6.2.7)
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("selectstart", e => e.preventDefault());
  document.addEventListener("dragstart", e => e.preventDefault());
  window.addEventListener("resize", layout);
  window.addEventListener("orientationchange", () => setTimeout(layout, 120));
  window.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { Sound.stopMusic(); if (G.state === "playing") { G.state = "paused"; } }
    else if (audioReady && Save.data.music && !G.adPlaying) { Sound.startMusic(); lastT = performance.now(); }
  });
}
const pointer = { active: false, x: 0, y: 0, dx: 0, dy: 0, t: 0 };
function evPos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function firstGesture() {
  if (audioReady) return;
  audioReady = true;
  Sound.unlock();
  if (Save.data.music) Sound.startMusic();
}
function onDown(e) {
  e.preventDefault();
  firstGesture();
  const p = evPos(e);
  pointer.active = true; pointer.x = p.x; pointer.y = p.y; pointer.dx = p.x; pointer.dy = p.y; pointer.t = performance.now();
  if (G.state === "playing") { const c = cellAt(p.x, p.y); G.hoverCell = c; }
}
function onMove(e) {
  e.preventDefault();
  const p = evPos(e);
  pointer.x = p.x; pointer.y = p.y;
  if (G.state === "playing" && (pointer.active || true)) G.hoverCell = cellAt(p.x, p.y);
}
function onUp(e) {
  e.preventDefault();
  const p = evPos(e);
  const moved = Math.hypot(p.x - pointer.dx, p.y - pointer.dy);
  const dur = performance.now() - pointer.t;
  pointer.active = false;
  if (moved < 16 && dur < 700) onTap(p.x, p.y);
}
function onKey(e) {
  if (e.key === "Escape") {
    if (G.state === "playing") { G.state = "paused"; Sound.play("click"); }
    else if (G.state === "paused") { G.state = "playing"; lastT = performance.now(); Sound.play("click"); }
  }
  if (G.state === "playing") {
    if (e.key >= "1" && e.key <= "4") { const t = Save.data.squad[+e.key - 1]; if (t) { G.selType = t; G.selTower = null; Sound.play("click"); } }
    if (e.key === " ") { if (!G.waveActive) callNextWave(); }
    if (e.key.toLowerCase() === "f") toggleSpeed();
  }
}

function onTap(x, y) {
  firstGesture();
  const hadToast = !!G.toast;
  // сначала UI-кнопки (сверху вниз по списку — последние нарисованы поверх)
  for (let i = G.hot.length - 1; i >= 0; i--) {
    const b = G.hot[i];
    if (x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h) {
      if (b.id === "toast_ad") { if (!b.disabled) { Sound.play("click"); handleTap("toast_ad", b); } return; }
      if (hadToast) { G.toast = null; return; } // любой тап гасит тост
      if (!b.disabled) { Sound.play("click"); handleTap(b.id, b); }
      return;
    }
  }
  if (hadToast) { G.toast = null; return; }
  if (G.state === "playing") boardTap(x, y);
}

function boardTap(x, y) {
  const c = cellAt(x, y);
  if (!c) { G.selTower = null; return; }
  const existing = towerAt(c.c, c.r);
  if (existing) { G.selTower = existing; G.selType = null; return; }
  if (G.selType) {
    if (buildable(c.c, c.r)) {
      const cost = TOWERS[G.selType].levels[0].cost;
      if (G.gold >= cost) {
        G.gold -= cost;
        G.towers.push({ type: G.selType, c: c.c, r: c.r, level: 0, cooldown: 0, angle: -Math.PI / 2, invested: cost, hp: TOWER_HP, maxHp: TOWER_HP });
        Sound.play("place");
        const px = cx(c.c + 0.5), py = cy(c.r + 0.5);
        for (let k = 0; k < 8; k++) G.particles.push(makeParticle(px, py, TOWERS[G.selType].color, 0.3, 2));
        if (!Save.data.tutorial) { Save.data.tutorial = true; Save.write(); G.tutorT = 0; }
      } else {
        addAmount(cx(c.c + 0.5), cy(c.r + 0.5), L("needAmt"), cost, "gold", PAL.danger, F(14), 0.9);
        Sound.play("hit");
      }
    }
  } else {
    G.selTower = null;
  }
}
function cellAt(px, py) {
  const b = view.board;
  const c = Math.floor((px - b.x) / b.cell), r = Math.floor((py - b.y) / b.cell);
  if (c < 0 || r < 0 || c >= GRID_COLS || r >= GRID_ROWS) return null;
  return { c, r };
}
function towerAt(c, r) { return G.towers.find(t => t.c === c && t.r === r) || null; }
function buildable(c, r) { return !G.path.pathSet.has(c + "," + r) && !towerAt(c, r); }

function callNextWave() {
  if (G.waveActive) return;
  // досрочный старт: чем больше времени осталось, тем больше бонус золота
  if (G.waveIndex >= 0 && G.betweenTimer > 0) {
    const bonus = Math.ceil(G.betweenTimer * (6 + G.waveIndex));
    G.gold += bonus;
    addAmount(view.w / 2, view.board.y + view.board.h - 46 * view.ui, "+", bonus, "gold", PAL.gold, F(18), 1.3);
  }
  G.betweenTimer = 0;
  startNextWave();
}
function toggleSpeed() { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 5 : 1; Sound.play("click"); }
function exitToMenu() {
  if (G.mode === "endless" && G.endlessCoins > 0) {
    G.confirm = {
      lines: [L("exitEndless1"), L("exitEndless2")],
      coins: G.endlessCoins,
      action: () => { Save.data.coins += G.endlessCoins; Save.write(); G.endlessCoins = 0; showInterstitial(() => { G.state = "menu"; }); }
    };
    G.state = "confirm";
  } else {
    showInterstitial(() => { G.state = "menu"; });
  }
}

/* ---------- Диспетчер нажатий ---------- */
function handleTap(id, b) {
  if (id === "toast_ad") {
    const rew = G.toast && G.toast.reward; G.toast = null;
    if (rew) showRewarded(() => { Save.data.coins += rew; Save.write(); Sound.play("reward"); });
    return;
  }
  switch (G.state) {
    case "menu":
      if (id === "play") G.state = "levels";
      else if (id === "book") { G.state = "book"; G.bookMon = null; }
      else if (id === "shop") { G.state = "shop"; G.shopTab = "crates"; }
      else if (id === "squad") G.state = "squad";
      else if (id === "settings") G.state = "settings";
      break;
    case "settings":
      if (id === "back") G.state = "menu";
      else if (id === "sfx") { Save.data.sfx = !Save.data.sfx; Sound.setSfx(Save.data.sfx); Save.write(); }
      else if (id === "music") { Save.data.music = !Save.data.music; Sound.setMusicEnabled(Save.data.music); if (Save.data.music) Sound.startMusic(); Save.write(); }
      else if (id === "lang_ru" || id === "lang_en") { LANG = id === "lang_en" ? "en" : "ru"; Save.data.lang = LANG; Save.data.langChosen = true; Save.write(); applyDocTitle(); }
      break;
    case "book":
      if (G.bookMon) { if (id === "mon_close" || id === "back") G.bookMon = null; }
      else if (id === "back") G.state = "menu";
      else if (id.indexOf("mon_") === 0) { G.bookMon = id.slice(4); Sound.play("click"); }
      break;
    case "levels":
      if (id === "back") G.state = "menu";
      else if (id === "endless") startEndless();
      else if (id.indexOf("lvl_") === 0) {
        const n = +id.slice(4);
        if (n <= Save.data.unlocked) startLevel(n);
      }
      break;
    case "shop": handleShop(id); break;
    case "squad": handleSquad(id); break;
    case "crate":
      if (id === "crate_ok") { G.state = G.prevState || "shop"; }
      else if (id === "crate_add") {
        const cr = G.crateResult;
        if (cr && ownsCannon(cr.id) && !inSquad(cr.id) && Save.data.squad.length < 4) { Save.data.squad.push(cr.id); Save.write(); Sound.play("place"); }
        G.state = G.prevState || "shop";
      }
      break;
    case "playing":
      if (id === "pause") G.state = "paused";
      else if (id === "speed") toggleSpeed();
      else if (id === "startwave") callNextWave();
      else if (id === "sfxq") { Save.data.sfx = !Save.data.sfx; Sound.setSfx(Save.data.sfx); Save.write(); }
      else if (id.indexOf("tw_") === 0) { const t = id.slice(3); G.selType = (G.selType === t ? null : t); G.selTower = null; }
      else if (id === "upg") upgradeTower();
      else if (id === "repair") repairTower();
      else if (id === "sell") sellTower();
      else if (id === "closepanel") G.selTower = null;
      break;
    case "paused":
      if (id === "resume") { G.state = "playing"; lastT = performance.now(); }
      else if (id === "restart") { const m = G.mode, n = G.level; showInterstitial(() => m === "level" ? startLevel(n) : startEndless()); }
      else if (id === "tomenu") { exitToMenu(); }
      else if (id === "sfx") { Save.data.sfx = !Save.data.sfx; Sound.setSfx(Save.data.sfx); Save.write(); }
      else if (id === "music") { Save.data.music = !Save.data.music; Sound.setMusicEnabled(Save.data.music); if (Save.data.music) Sound.startMusic(); Save.write(); }
      break;
    case "confirm":
      if (id === "cf_yes") { const a = G.confirm && G.confirm.action; G.confirm = null; if (a) a(); }
      else if (id === "cf_no") { G.confirm = null; G.state = "paused"; }
      break;
    case "win":
      if (id === "next") { const n = Math.min(10, G.level + 1); showInterstitial(() => startLevel(n)); }
      else if (id === "replay") { const n = G.level; showInterstitial(() => startLevel(n)); }
      else if (id === "tomenu") { showInterstitial(() => { G.state = "menu"; }); }
      else if (id === "x2" && !G.x2Used) { showRewarded(() => { Save.data.coins += G.pendingCoins; Save.write(); G.x2Used = true; Sound.play("reward"); addAmount(view.w / 2, view.h / 2, "+", G.pendingCoins, "gem", PAL.gem, F(26), 1.6); }); }
      break;
    case "gameover":
      if (id === "continue" && !G.continueUsed) {
        showRewarded(() => { G.continueUsed = true; G.lives = Math.max(10, Math.floor(G.maxLives * 0.5)); clearBoardEnemies(); G.state = "playing"; lastT = performance.now(); Sound.play("reward"); });
      } else if (id === "x2" && !G.x2Used) {
        showRewarded(() => { Save.data.coins += G.pendingCoins; Save.write(); G.x2Used = true; Sound.play("reward"); });
      } else if (id === "restart") { const m = G.mode, n = G.level; showInterstitial(() => m === "level" ? startLevel(n) : startEndless()); }
      else if (id === "tomenu") { showInterstitial(() => { G.state = "menu"; }); }
      break;
  }
}
function upgradeTower() {
  const tw = G.selTower; if (!tw) return;
  if (tw.level >= 2) return;
  const cost = TOWERS[tw.type].levels[tw.level + 1].cost;
  if (G.gold >= cost) {
    G.gold -= cost; tw.level++; tw.invested += cost;
    tw.maxHp += 40; tw.hp = Math.min(tw.maxHp, tw.hp + 40);
    Sound.play("upgrade");
    const px = cx(tw.c + 0.5), py = cy(tw.r + 0.5);
    for (let k = 0; k < 12; k++) G.particles.push(makeParticle(px, py, PAL.gold, 0.4, 2.5));
    addText(px, py - 14 * view.ui, L("upgraded"), PAL.good, F(15), 1);
  } else { Sound.play("hit"); }
}
function repairCost(tw) { return Math.max(5, Math.ceil((1 - tw.hp / tw.maxHp) * TOWERS[tw.type].levels[0].cost * 0.9)); }
function repairTower() {
  const tw = G.selTower; if (!tw || tw.hp >= tw.maxHp) return;
  const cost = repairCost(tw);
  if (G.gold >= cost) {
    G.gold -= cost; tw.hp = tw.maxHp;
    Sound.play("upgrade");
    const px = cx(tw.c + 0.5), py = cy(tw.r + 0.5);
    for (let k = 0; k < 8; k++) G.particles.push(makeParticle(px, py, PAL.good, 0.35, 2));
    addText(px, py - 14 * view.ui, L("repaired"), PAL.good, F(14), 1);
  } else { Sound.play("hit"); }
}
function sellTower() {
  const tw = G.selTower; if (!tw) return;
  const val = Math.floor(tw.invested * 0.6);
  G.gold += val;
  G.towers.splice(G.towers.indexOf(tw), 1);
  G.selTower = null;
  Sound.play("sell");
  addAmount(cx(tw.c + 0.5), cy(tw.r + 0.5), "+", val, "gold", PAL.gold, F(15), 1);
}

/* ---------- Магазин ---------- */
const SHOP_SKINS = [
  { id: "classic", cost: 0 }, { id: "candy", cost: 150 }, { id: "midnight", cost: 300 }
];
function handleShop(id) {
  if (id === "back") { G.state = "menu"; return; }
  if (id === "tab_crates") { G.shopTab = "crates"; return; }
  if (id === "tab_skins") { G.shopTab = "skins"; return; }
  if (id === "tab_boosts") { G.shopTab = "boosts"; return; }
  if (id === "crate_basic") { buyCrateCoins("basic", CRATE_COST.basic); return; }
  if (id === "crate_gold") { buyCrateCoins("gold", CRATE_COST.gold); return; }
  if (id === "crate_ad") { buyCrateAd("ad"); return; }
  if (id.indexOf("skin_") === 0) {
    const k = id.slice(5);
    if (Save.data.skins.indexOf(k) >= 0) { Save.data.skin = k; Save.write(); }
    else {
      const it = SHOP_SKINS.find(s => s.id === k);
      if (Save.data.coins >= it.cost) { Save.data.coins -= it.cost; Save.data.skins.push(k); Save.data.skin = k; Save.write(); Sound.play("coin"); }
      else showToast(L("notEnough"), 50);
    }
  } else if (id === "buy_gold") {
    if (Save.data.startGold >= 120) return;
    if (Save.data.coins >= 200) { Save.data.coins -= 200; Save.data.startGold += 40; Save.write(); Sound.play("coin"); }
    else showToast(L("notEnough"), 50);
  } else if (id === "buy_lives") {
    if (Save.data.extraLives >= 15) return;
    if (Save.data.coins >= 250) { Save.data.coins -= 250; Save.data.extraLives += 5; Save.write(); Sound.play("coin"); }
    else showToast(L("notEnough"), 50);
  }
}

/* ---------- Ящики (гача) ---------- */
const CRATE_COST = { basic: 100, gold: 350 };
const CRATE_ODDS = {
  basic: { legend: 0.03, mythic: 0.20 },
  gold:  { legend: 0.10, mythic: 0.35 },
  ad:    { legend: 0.06, mythic: 0.30 }
};
function rollRarity(kind) {
  const o = CRATE_ODDS[kind] || CRATE_ODDS.basic;
  const r = Math.random();
  if (r < o.legend) return "legend";
  if (r < o.legend + o.mythic) return "mythic";
  return "rare";
}
function grantCrate(kind) {
  const rar = rollRarity(kind);
  const pool = cannonsOfRarity(rar);
  const id = pool[(Math.random() * pool.length) | 0];
  const def = TOWERS[id];
  const isNew = Save.data.owned.indexOf(id) < 0;
  let coins = 0;
  if (isNew) { Save.data.owned.push(id); }
  else { coins = RARITY[def.rarity].dupCoins; Save.data.coins += coins; }
  Save.write();
  G.crateResult = { id, isNew, coins };
  G.crateAnim = 0;
  if (G.state !== "crate") G.prevState = G.state;
  G.state = "crate";
  Sound.play(isNew ? "reward" : "coin");
}
function buyCrateCoins(kind, cost) {
  if (Save.data.coins < cost) { showToast(L("notEnough"), 50); return; }
  Save.data.coins -= cost; Save.write();
  grantCrate(kind);
}
function buyCrateAd(kind) { showRewarded(() => grantCrate(kind)); }

/* ---------- Коллекция / отряд ---------- */
function ownsCannon(id) { return Save.data.owned.indexOf(id) >= 0; }
function inSquad(id) { return Save.data.squad.indexOf(id) >= 0; }
function buyCannon(id) {
  if (ownsCannon(id)) return;
  const price = RARITY[TOWERS[id].rarity].buy;
  if (Save.data.coins >= price) { Save.data.coins -= price; Save.data.owned.push(id); Save.write(); Sound.play("coin"); }
  else showToast(L("notEnough"), 50);
}
function toggleSquad(id) {
  if (!ownsCannon(id)) { buyCannon(id); return; }
  const i = Save.data.squad.indexOf(id);
  if (i >= 0) { if (Save.data.squad.length > 1) { Save.data.squad.splice(i, 1); Save.write(); Sound.play("click"); } }
  else if (Save.data.squad.length < 4) { Save.data.squad.push(id); Save.write(); Sound.play("place"); }
  else Sound.play("hit");
}
function removeSquadSlot(i) {
  if (Save.data.squad.length > 1) { Save.data.squad.splice(i, 1); Save.write(); Sound.play("click"); }
}
function handleSquad(id) {
  if (G.infoCannon) {
    if (id === "info_close") { G.infoCannon = null; }
    else if (id === "info_buy") { buyCannon(G.infoCannon); }
    else if (id === "info_squad") { toggleSquad(G.infoCannon); }
    return;
  }
  if (id === "back") { G.state = "menu"; return; }
  if (id === "openbox") { G.state = "shop"; G.shopTab = "crates"; return; }
  if (id.indexOf("ctab_") === 0) { G.colTab = id.slice(5); return; }
  if (id.indexOf("slot_") === 0) { const t = Save.data.squad[+id.slice(5)]; if (t) G.infoCannon = t; return; }
  if (id.indexOf("can_") === 0) { G.infoCannon = id.slice(4); Sound.play("click"); return; }
}

/* =====================================================================
   РЕНДЕР
   ===================================================================== */
function render() { renderMain(); if (G.toast) drawToast(); }
function renderMain() {
  G.hot = [];
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, view.w, view.h);
  // фон
  const bg = ctx.createLinearGradient(0, 0, 0, view.h);
  bg.addColorStop(0, "#27507f"); bg.addColorStop(0.5, "#1f4560"); bg.addColorStop(1, "#1a3d44");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, view.w, view.h);
  drawBackdrop(G.clock || performance.now() / 1000);

  if (G.state === "menu") { drawMenu(); return; }
  if (G.state === "levels") { drawLevels(); return; }
  if (G.state === "shop") { drawShop(); return; }
  if (G.state === "squad") { drawSquad(); return; }
  if (G.state === "settings") { drawSettings(); return; }
  if (G.state === "book") { drawBook(); return; }
  if (G.state === "crate") { drawCrate(); return; }

  // игровые состояния (playing/paused/win/gameover) рисуют поле
  if (G.shake > 0) { ctx.save(); const s = G.shake * 8 * view.ui; ctx.translate(rnd(-s, s), rnd(-s, s)); }
  drawBoard();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawEffects();
  drawParticles();
  drawFloatingTexts();
  if (G.shake > 0) ctx.restore();
  drawVignette();

  drawHUD();
  drawDock();
  drawWaveInfo();
  if (G.tutorT > 0 && G.state === "playing") drawTutorial();

  if (G.state === "paused") drawPaused();
  if (G.state === "confirm") drawConfirm();
  if (G.state === "win") drawResult(true);
  if (G.state === "gameover") drawResult(false);
  if (G.adPlaying) drawAdCurtain();
}

/* Окружение вокруг поля: тёплое свечение, дальние холмы, облака и мошкара.
   Всё крупное и медленное — фон оживает, но не спорит с игрой. */
function drawBackdrop(t) {
  const b = view.board;
  const bx = b.w ? b.x + b.w / 2 : view.w / 2, by = b.h ? b.y + b.h / 2 : view.h * 0.5;
  // солнце в углу — источник тёплого света на сцене
  const sx = view.w * 0.88, sy = view.h * 0.12;
  const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.min(view.w, view.h) * 0.45);
  sun.addColorStop(0, "rgba(255,231,160,0.38)");
  sun.addColorStop(0.35, "rgba(255,208,135,0.13)");
  sun.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = sun; ctx.fillRect(0, 0, view.w, view.h);
  // дальние холмы с подсвеченным гребнем и рощами по склону
  const hy = view.h * 0.42;
  for (let layer = 0; layer < 2; layer++) {
    const amp = view.h * (0.05 - layer * 0.015), base = hy + layer * view.h * 0.12;
    const crest = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const x = view.w * i / steps;
      crest.push({ x: x, y: base + Math.sin(i * 0.9 + layer * 2.1) * amp + Math.sin(i * 2.3 + layer) * amp * 0.4 });
    }
    ctx.fillStyle = layer ? "rgba(58,126,92,0.66)" : "rgba(40,92,86,0.52)";
    ctx.beginPath(); ctx.moveTo(0, view.h); ctx.lineTo(crest[0].x, crest[0].y);
    for (const pt of crest) ctx.lineTo(pt.x, pt.y);
    ctx.lineTo(view.w, view.h); ctx.closePath(); ctx.fill();
    // подсветка гребня
    ctx.strokeStyle = layer ? "rgba(150,215,160,0.18)" : "rgba(140,200,170,0.13)";
    ctx.lineWidth = Math.max(1, 2 * view.ui); ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(crest[0].x, crest[0].y);
    for (const pt of crest) ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    // деревья по гребню — вид обрамляется рощами, а поле остаётся в центре
    const trees = 26, tone = layer ? "rgba(32,86,62,0.72)" : "rgba(26,66,64,0.58)";
    for (let i = 0; i < trees; i++) {
      const tx = view.w * (i + 0.5) / trees;
      const seg = Math.min(steps - 1, Math.floor(tx / view.w * steps));
      const f = (tx - crest[seg].x) / (crest[seg + 1].x - crest[seg].x || 1);
      const ty = lerp(crest[seg].y, crest[seg + 1].y, f) + view.h * 0.004;
      const th = view.h * (0.035 + ((i * 7) % 5) * 0.004) * (layer ? 1 : 0.8);
      ctx.fillStyle = tone;
      ctx.beginPath(); ctx.moveTo(tx, ty - th * 1.5);
      ctx.lineTo(tx + th * 0.42, ty + th * 0.1);
      ctx.lineTo(tx - th * 0.42, ty + th * 0.1);
      ctx.closePath(); ctx.fill();
      if ((i * 3) % 4 === 0) {
        ctx.beginPath(); ctx.ellipse(tx + th * 0.7, ty, th * 0.38, th * 0.45, 0, 0, TAU); ctx.fill();
      }
    }
  }
  // облака: каждый ком — мягкое пятно с растушёванным краем, иначе на тёмном небе
  // они читаются как серые блины
  for (let i = 0; i < 4; i++) {
    const sp = 5 + i * 2.5, w = view.w * (0.16 + (i % 3) * 0.05);
    const x = ((t * sp + i * 520) % (view.w + w * 2)) - w;
    const y = view.h * (0.07 + (i % 4) * 0.06);
    const a0 = 0.07 + (i % 2) * 0.025;
    for (const pt of [[0, 0, 1], [0.3, -0.16, 0.8], [0.6, 0.04, 0.88], [0.86, -0.07, 0.62]]) {
      const px = x + w * pt[0], py = y + w * pt[1], rad = w * 0.3 * pt[2];
      const puff = ctx.createRadialGradient(px, py - rad * 0.15, 0, px, py, rad);
      puff.addColorStop(0, "rgba(255,255,255," + a0.toFixed(3) + ")");
      puff.addColorStop(0.55, "rgba(255,255,255," + (a0 * 0.6).toFixed(3) + ")");
      puff.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.52); ctx.translate(-px, -py);
      ctx.fillStyle = puff;
      ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  // тёплое свечение под полем — доска выглядит освещённой, а не брошенной в темноте
  const glow = ctx.createRadialGradient(bx, by, Math.min(view.w, view.h) * 0.08, bx, by, Math.max(view.w, view.h) * 0.72);
  glow.addColorStop(0, "rgba(120,190,150,0.22)");
  glow.addColorStop(0.5, "rgba(90,160,150,0.10)");
  glow.addColorStop(1, "rgba(10,20,35,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, view.w, view.h);
  // мошкара в тёплом свете
  for (let i = 0; i < 14; i++) {
    const seed = i * 1.7;
    const x = view.w * (0.03 + ((i * 7) % 20) / 20 * 0.94) + Math.sin(t * 0.35 + seed) * view.w * 0.03;
    const y = view.h * (0.1 + ((i * 11) % 17) / 17 * 0.82) + Math.cos(t * 0.42 + seed * 1.3) * view.h * 0.035;
    const a = 0.14 + Math.abs(Math.sin(t * 0.8 + seed)) * 0.22;
    ctx.fillStyle = "rgba(255,232,160," + a.toFixed(3) + ")";
    ctx.beginPath(); ctx.arc(x, y, Math.max(1, view.ui * (1.4 + (i % 3) * 0.6)), 0, TAU); ctx.fill();
  }
}

/* ---------- Текст ---------- */
function text(str, x, y, size, color, align, baseline, weight) {
  ctx.font = (weight || "bold") + " " + size + "px \"Trebuchet MS\", \"Segoe UI\", sans-serif";
  ctx.fillStyle = color; ctx.textAlign = align || "center"; ctx.textBaseline = baseline || "middle";
  ctx.fillText(str, x, y);
}
function textShadow(str, x, y, size, color, align, baseline) {
  ctx.font = "bold " + size + "px \"Trebuchet MS\", sans-serif";
  ctx.textAlign = align || "center"; ctx.textBaseline = baseline || "middle";
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillText(str, x + 2, y + 2);
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
/* Ширина строки при заданном кегле. */
function textW(str, size) {
  ctx.font = "bold " + size + "px \"Trebuchet MS\", \"Segoe UI\", sans-serif";
  return ctx.measureText(str).width;
}
/* Строка, ужатая под maxW: сперва мельче кегль, затем обрезка многоточием. */
function textClip(str, x, y, maxW, size, color, align) {
  let s = size;
  while (s > 8 && textW(str, s) > maxW) s--;
  let out = str;
  if (textW(out, s) > maxW) {
    while (out.length > 1 && textW(out + "…", s) > maxW) out = out.slice(0, -1);
    out += "…";
  }
  text(out, x, y, s, color, align || "left");
}
function btn(id, x, y, w, h, label, opt) {
  opt = opt || {};
  const col = opt.color || PAL.good;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 8 * view.ui; ctx.shadowOffsetY = 3 * view.ui;
  rr(ctx, x, y, w, h, 12 * view.ui);
  ctx.fillStyle = opt.disabled ? "#3a4763" : col; ctx.fill();
  ctx.restore();
  if (!opt.disabled) {
    rr(ctx, x + 2, y + 2, w - 4, h * 0.42, 10 * view.ui);
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fill();
  }
  const tc = opt.disabled ? "#7d8aa5" : (opt.textColor || "#0e1626");
  if (label) text(label, x + w / 2, y + h / 2, opt.fs || F(17), tc, "center", "middle");
  G.hot.push({ id, x, y, w, h, disabled: !!opt.disabled });
  return { x, y, w, h };
}

/* ---------- Поле / лабиринт ---------- */
/* Трава, декор и дорога не меняются от кадра к кадру, поэтому рисуются один раз
   в offscreen-канвас и дальше выводятся одной картинкой. Кэш сбрасывается при
   смене раскладки, скина или карты — только тогда что-то из этого меняется. */
const BoardArt = { canvas: null, key: "", path: null };
function boardArtKey() {
  const b = view.board;
  return b.x + "|" + b.y + "|" + b.cell + "|" + view.dpr + "|" + Save.data.skin;
}
function boardArt() {
  const b = view.board, key = boardArtKey();
  if (BoardArt.canvas && BoardArt.key === key && BoardArt.path === G.path) return BoardArt.canvas;
  const dpr = view.dpr || 1;
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(b.w * dpr));
  cv.height = Math.max(1, Math.round(b.h * dpr));
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, -b.x * dpr, -b.y * dpr);
  paintBoard(g);
  BoardArt.canvas = cv; BoardArt.key = key; BoardArt.path = G.path;
  return cv;
}
function paintBoard(g) {
  const b = view.board, sk = skin();
  // трава: шахматка приглушена (тёмная клетка подмешана к светлой) плюс лёгкий разброс тона
  const gA = sk.grassA, gB = mixHex(sk.grassB, sk.grassA, 0.4);
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const h = cellHash(c, r), base = ((c + r) & 1) ? gA : gB;
      g.fillStyle = shade(base, 0.985 + (h % 7) * 0.005);
      g.fillRect(cx(c), cy(r), b.cell + 1, b.cell + 1);
    }
  }
  // мягкие светлые прогалины — газон дышит, но не рябит
  for (let r = 0; r < GRID_ROWS; r++) for (let c = 0; c < GRID_COLS; c++) {
    const h = cellHash(c * 3 + 1, r * 5 + 2);
    if ((h >>> 7) % 3) continue;
    const px = cx(c + 0.25 + ((h >>> 2 & 15) / 15) * 0.5), py = cy(r + 0.25 + ((h >>> 11 & 15) / 15) * 0.5);
    g.fillStyle = ((h >>> 9) & 1) ? "rgba(255,255,255,0.05)" : "rgba(12,44,24,0.05)";
    g.beginPath(); g.ellipse(px, py, b.cell * 0.3, b.cell * 0.2, (h % 6) * 0.5, 0, TAU); g.fill();
  }
  // выгоревшие и густые пятна поверх шахматки
  for (let i = 0; i < 9; i++) {
    const h = cellHash(i * 17 + 3, i * 11 + 5);
    const px = cx((h % 997) / 997 * GRID_COLS), py = cy(((h >>> 10) % 997) / 997 * GRID_ROWS);
    const rad = b.cell * (0.7 + ((h >>> 20) % 100) / 100 * 1.3);
    g.fillStyle = (i % 3 === 0) ? "rgba(255,247,200,0.05)" : "rgba(18,58,30,0.06)";
    g.beginPath(); g.ellipse(px, py, rad, rad * 0.68, (h % 7) * 0.4, 0, TAU); g.fill();
  }
  // мягкое верхнее освещение поля
  const lg = g.createLinearGradient(0, b.y, 0, b.y + b.h);
  lg.addColorStop(0, "rgba(255,255,255,0.10)");
  lg.addColorStop(0.5, "rgba(255,255,255,0)");
  lg.addColorStop(1, "rgba(0,0,0,0.13)");
  g.fillStyle = lg; g.fillRect(b.x, b.y, b.w, b.h);
  // декор на траве (детерминированный, без мерцания)
  for (let r = 0; r < GRID_ROWS; r++) for (let c = 0; c < GRID_COLS; c++) {
    if (G.path.pathSet.has(c + "," + r)) continue;
    drawGrassDecor(g, c, r);
  }
  paintRoad(g);
  // внутренняя тень по краям поля — доска выглядит утопленной в фон
  const e = b.cell * 0.6;
  const edges = [
    [b.x, b.y, b.w, e, 0, b.y, 0, b.y + e],
    [b.x, b.y + b.h - e, b.w, e, 0, b.y + b.h, 0, b.y + b.h - e],
    [b.x, b.y, e, b.h, b.x, 0, b.x + e, 0],
    [b.x + b.w - e, b.y, e, b.h, b.x + b.w, 0, b.x + b.w - e, 0]
  ];
  for (const ed of edges) {
    const gr = g.createLinearGradient(ed[4], ed[5], ed[6], ed[7]);
    gr.addColorStop(0, "rgba(8,18,34,0.28)");
    gr.addColorStop(1, "rgba(8,18,34,0)");
    g.fillStyle = gr; g.fillRect(ed[0], ed[1], ed[2], ed[3]);
  }
  // рамка поля
  const fw = Math.max(2, 3 * view.ui);
  g.strokeStyle = "rgba(9,20,38,0.75)"; g.lineWidth = fw;
  g.strokeRect(b.x + fw / 2, b.y + fw / 2, b.w - fw, b.h - fw);
  g.strokeStyle = "rgba(255,255,255,0.10)"; g.lineWidth = Math.max(1, fw * 0.5);
  g.strokeRect(b.x + fw * 1.4, b.y + fw * 1.4, b.w - fw * 2.8, b.h - fw * 2.8);
  // указатели вход/выход
  const pts = G.path.way;
  drawFlag(g, cx(pts[1].c), cy(pts[1].r), PAL.good);
  drawFlag(g, cx(pts[pts.length - 2].c), cy(pts[pts.length - 2].r), PAL.danger);
}
/* Дорога: тень на траве, слои покрытия, колея, обкусанный травой край и камешки. */
function paintRoad(g) {
  const b = view.board, sk = skin(), cell = b.cell;
  const pts = G.path.way.map(pp => ({ x: cx(pp.c), y: cy(pp.r) }));
  const wob1 = wobblePoly(pts, cell * 0.05, 1.7), wob2 = wobblePoly(pts, cell * 0.04, 4.3);
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = "rgba(16,42,24,0.22)"; g.lineWidth = cell * 1.02; strokePoly(g, wob1);
  g.strokeStyle = shade(sk.pathEdge, 0.74); g.lineWidth = cell * 0.92; strokePoly(g, wob1);
  g.strokeStyle = sk.pathEdge; g.lineWidth = cell * 0.84; strokePoly(g, wob2);
  g.strokeStyle = sk.path; g.lineWidth = cell * 0.64; strokePoly(g, wob1);
  g.strokeStyle = shade(sk.path, 1.12); g.lineWidth = cell * 0.26; strokePoly(g, pts);
  // накатанная колея
  g.strokeStyle = "rgba(120,88,52,0.16)"; g.lineWidth = cell * 0.05;
  g.setLineDash([cell * 0.3, cell * 0.55]); strokePoly(g, wob2); g.setLineDash([]);
  const cells = G.path.cells;
  for (let i = 0; i < cells.length; i++) {
    const cc = cells[i], h = cellHash(cc[0], cc[1]);
    const px = cx(cc[0] + 0.5), py = cy(cc[1] + 0.5);
    // направление участка, чтобы понять, где у дороги обочина
    const prev = cells[i - 1] || cells[i], next = cells[i + 1] || cells[i];
    const dx = next[0] - prev[0], dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    // мягкая тень травы на обочине — край дороги не выглядит вырезанным ножницами
    for (const sgn of [-1, 1]) {
      if ((h >> (sgn > 0 ? 3 : 9) & 3) === 0) continue;
      const t = ((h >> (sgn > 0 ? 5 : 11) & 7) / 7 - 0.5) * 0.6;
      const gx = px + nx * sgn * cell * 0.4 + (dx / len) * cell * t;
      const gy = py + ny * sgn * cell * 0.4 + (dy / len) * cell * t;
      g.fillStyle = "rgba(24,60,32,0.13)";
      g.beginPath(); g.ellipse(gx, gy, cell * 0.13, cell * 0.07, Math.atan2(dy, dx), 0, TAU); g.fill();
    }
    // камешки и пыль на полотне
    if (h % 3 === 0) {
      const sx = px + ((h >> 3 & 7) / 7 - 0.5) * cell * 0.45;
      const sy = py + ((h >> 6 & 7) / 7 - 0.5) * cell * 0.45;
      g.fillStyle = shade(sk.pathEdge, 0.82);
      g.beginPath(); g.ellipse(sx, sy, cell * 0.065, cell * 0.045, (h % 5) * 0.6, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.beginPath(); g.ellipse(sx - cell * 0.015, sy - cell * 0.015, cell * 0.028, cell * 0.018, 0, 0, TAU); g.fill();
    }
    if (h % 4 === 1) {
      g.fillStyle = shade(sk.path, 0.9);
      for (let k = 0; k < 3; k++) {
        const a = (h >> (k * 3) & 7) / 7 * TAU;
        g.beginPath(); g.arc(px + Math.cos(a) * cell * 0.24, py + Math.sin(a) * cell * 0.2, cell * 0.022, 0, TAU); g.fill();
      }
    }
  }
}
function drawBoard() {
  const b = view.board;
  ctx.drawImage(boardArt(), b.x, b.y, b.w, b.h);
  // подсветка ячеек под строительство
  if (G.state === "playing" && G.selType) {
    ctx.lineWidth = 2 * view.ui;
    for (let r = 0; r < GRID_ROWS; r++) for (let c = 0; c < GRID_COLS; c++) {
      if (buildable(c, r)) {
        rr(ctx, cx(c) + 3, cy(r) + 3, b.cell - 6, b.cell - 6, 6 * view.ui);
        ctx.fillStyle = "rgba(6,214,160,0.12)"; ctx.fill();
        ctx.strokeStyle = "rgba(6,214,160,0.35)"; ctx.stroke();
      }
    }
    // предпросмотр радиуса
    if (G.hoverCell && buildable(G.hoverCell.c, G.hoverCell.r)) {
      const st = TOWERS[G.selType].levels[0];
      const px = cx(G.hoverCell.c + 0.5), py = cy(G.hoverCell.r + 0.5);
      ctx.beginPath(); ctx.arc(px, py, st.range * b.cell, 0, TAU);
      ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
      ctx.strokeStyle = TOWERS[G.selType].color; ctx.lineWidth = 2 * view.ui; ctx.stroke();
    }
  }
  // радиус выбранной башни
  if (G.selTower) {
    const st = TOWERS[G.selTower.type].levels[G.selTower.level];
    const px = cx(G.selTower.c + 0.5), py = cy(G.selTower.r + 0.5);
    ctx.beginPath(); ctx.arc(px, py, st.range * b.cell, 0, TAU);
    ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill();
    ctx.strokeStyle = TOWERS[G.selTower.type].color; ctx.lineWidth = 2 * view.ui; ctx.stroke();
  }
}
/* Смешать два цвета — нужно, чтобы приглушить контраст шахматки. */
function mixHex(a, bq, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(bq.slice(1), 16);
  const r = Math.round(((A >> 16) & 255) * (1 - t) + ((B >> 16) & 255) * t);
  const gg = Math.round(((A >> 8) & 255) * (1 - t) + ((B >> 8) & 255) * t);
  const bb = Math.round((A & 255) * (1 - t) + (B & 255) * t);
  return "#" + ((1 << 24) + (r << 16) + (gg << 8) + bb).toString(16).slice(1);
}
/* Осевая линия дороги, разбитая на короткие отрезки и слегка уведённая в сторону:
   край получается нарисованным от руки, а не по линейке. Ходят враги по-прежнему
   по настоящей осевой — это только графика. */
function wobblePoly(pts, amp, seed) {
  const out = [], step = view.board.cell * 0.45;
  let idx = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], bq = pts[i + 1];
    const dx = bq.x - a.x, dy = bq.y - a.y, len = Math.hypot(dx, dy) || 1;
    const n = Math.max(1, Math.round(len / step));
    const nx = -dy / len, ny = dx / len;
    for (let k = 0; k < n; k++) {
      const t = k / n, o = (Math.sin(idx * 0.9 + seed) * 0.6 + Math.sin(idx * 2.3 + seed * 3) * 0.4) * amp;
      out.push({ x: a.x + dx * t + nx * o, y: a.y + dy * t + ny * o });
      idx++;
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function strokePoly(g, pts) {
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.stroke();
}
function drawFlag(g, x, y, color) {
  const s = view.board.cell * 0.22, wave = s * 0.14;
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.beginPath(); g.ellipse(x, y + s * 1.02, s * 0.34, s * 0.12, 0, 0, TAU); g.fill();
  g.strokeStyle = "#5a4632"; g.lineWidth = Math.max(2, s * 0.25); g.lineCap = "round";
  g.beginPath(); g.moveTo(x, y + s); g.lineTo(x, y - s * 1.4); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = Math.max(1, s * 0.08);
  g.beginPath(); g.moveTo(x - s * 0.06, y + s * 0.8); g.lineTo(x - s * 0.06, y - s * 1.2); g.stroke();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y - s * 1.4);
  g.quadraticCurveTo(x + s * 0.8, y - s * 1.4 + wave, x + s * 1.4, y - s * 0.9);
  g.quadraticCurveTo(x + s * 0.7, y - s * 0.55 - wave, x, y - s * 0.35);
  g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.25)";
  g.beginPath(); g.moveTo(x, y - s * 1.4); g.lineTo(x + s * 0.7, y - s * 1.15); g.lineTo(x, y - s * 0.9); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,0.14)";
  g.beginPath(); g.moveTo(x, y - s * 0.9); g.lineTo(x + s * 0.7, y - s * 0.72); g.lineTo(x, y - s * 0.35); g.closePath(); g.fill();
  g.fillStyle = "#c8b48a";
  g.beginPath(); g.arc(x, y - s * 1.46, s * 0.13, 0, TAU); g.fill();
}
/* детерминированный хэш ячейки — стабильный декор без мерцания */
function cellHash(c, r) {
  let h = (Math.imul(c, 73856093) ^ Math.imul(r, 19349663) ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}
function drawGrassDecor(g, c, r) {
  const b = view.board, h = cellHash(c, r), kind = h % 12;
  if (kind >= 9) return; // часть клеток пустая — не перегружаем
  const ox = ((h >> 4 & 15) / 15 - 0.5) * 0.44, oy = ((h >> 8 & 15) / 15 - 0.5) * 0.44;
  const x = cx(c + 0.5 + ox), y = cy(r + 0.5 + oy), s = b.cell;
  if (kind < 3) { // кустик
    g.fillStyle = "rgba(0,0,0,0.12)"; g.beginPath(); g.ellipse(x, y + s * 0.14, s * 0.2, s * 0.06, 0, 0, TAU); g.fill();
    const gc = "#3c7a43"; g.fillStyle = gc;
    for (const dx of [-0.13, 0, 0.13]) { g.beginPath(); g.arc(x + dx * s, y, s * 0.115, 0, TAU); g.fill(); }
    g.fillStyle = shade(gc, 1.22); g.beginPath(); g.arc(x - s * 0.05, y - s * 0.04, s * 0.06, 0, TAU); g.fill();
    g.fillStyle = shade(gc, 0.72);
    g.beginPath(); g.ellipse(x + s * 0.1, y + s * 0.06, s * 0.07, s * 0.05, 0, 0, TAU); g.fill();
    if ((h >> 16 & 3) === 0) { // ягодки
      g.fillStyle = "#e2545f";
      for (const dx of [-0.08, 0.06]) { g.beginPath(); g.arc(x + dx * s, y - s * 0.04, s * 0.028, 0, TAU); g.fill(); }
    }
  } else if (kind < 5) { // цветок
    const col = ["#ef6f9a", "#ffd166", "#8f7bff", "#ff9f45"][h >> 12 & 3];
    g.strokeStyle = "#3c7a43"; g.lineWidth = Math.max(1, s * 0.03); g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y + s * 0.14); g.lineTo(x, y - s * 0.02); g.stroke();
    g.beginPath(); g.moveTo(x, y + s * 0.06); g.lineTo(x + s * 0.06, y + s * 0.02); g.stroke();
    g.fillStyle = "rgba(0,0,0,0.10)"; g.beginPath(); g.ellipse(x, y + s * 0.16, s * 0.09, s * 0.03, 0, 0, TAU); g.fill();
    g.fillStyle = col;
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * s * 0.07, y - s * 0.05 + Math.sin(a) * s * 0.07, s * 0.045, 0, TAU); g.fill(); }
    g.fillStyle = shade(col, 0.82);
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * s * 0.085, y - s * 0.03 + Math.sin(a) * s * 0.085, s * 0.018, 0, TAU); g.fill(); }
    g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(x, y - s * 0.05, s * 0.035, 0, TAU); g.fill();
  } else if (kind < 6) { // камень
    g.fillStyle = "rgba(0,0,0,0.12)"; g.beginPath(); g.ellipse(x, y + s * 0.1, s * 0.16, s * 0.05, 0, 0, TAU); g.fill();
    g.fillStyle = "#8b93a3"; g.beginPath(); g.ellipse(x, y, s * 0.14, s * 0.1, 0, 0, TAU); g.fill();
    g.fillStyle = "#aab1bd"; g.beginPath(); g.ellipse(x - s * 0.03, y - s * 0.03, s * 0.07, s * 0.05, 0, 0, TAU); g.fill();
    g.strokeStyle = "rgba(60,70,85,0.5)"; g.lineWidth = Math.max(1, s * 0.016);
    g.beginPath(); g.moveTo(x - s * 0.06, y + s * 0.02); g.lineTo(x + s * 0.03, y + s * 0.05); g.stroke();
  } else if (kind < 7) { // грибок
    g.fillStyle = "rgba(0,0,0,0.10)"; g.beginPath(); g.ellipse(x, y + s * 0.11, s * 0.1, s * 0.035, 0, 0, TAU); g.fill();
    g.fillStyle = "#efe6d2"; rr(g, x - s * 0.025, y - s * 0.02, s * 0.05, s * 0.12, s * 0.02); g.fill();
    g.fillStyle = "#d0574f";
    g.beginPath(); g.ellipse(x, y - s * 0.03, s * 0.085, s * 0.06, 0, Math.PI, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.beginPath(); g.arc(x - s * 0.03, y - s * 0.05, s * 0.018, 0, TAU); g.fill();
    g.beginPath(); g.arc(x + s * 0.025, y - s * 0.035, s * 0.013, 0, TAU); g.fill();
  } else { // пучки травы
    g.strokeStyle = shade(skin().grassA, 0.72); g.lineWidth = Math.max(1, s * 0.03); g.lineCap = "round";
    for (let i = -1; i <= 1; i++) {
      const bx = x + i * s * 0.07;
      g.beginPath(); g.moveTo(bx, y + s * 0.08); g.quadraticCurveTo(bx + s * 0.03, y - s * 0.02, bx + i * s * 0.05, y - s * 0.11); g.stroke();
    }
    g.strokeStyle = shade(skin().grassA, 1.18); g.lineWidth = Math.max(1, s * 0.02);
    g.beginPath(); g.moveTo(x + s * 0.02, y + s * 0.07); g.quadraticCurveTo(x + s * 0.06, y - s * 0.01, x + s * 0.09, y - s * 0.08); g.stroke();
  }
}

/* ---------- Башни ---------- */
function drawTowers() {
  const s = view.board.cell;
  for (const tw of G.towers) {
    const x = cx(tw.c + 0.5), y = cy(tw.r + 0.5);
    drawTower(ctx, x, y, s, tw.type, tw.angle, tw.level);
    // полоса прочности башни (если повреждена)
    if (tw.hp < tw.maxHp) {
      const bw = s * 0.7, bh = Math.max(3, s * 0.08), bx = x - bw / 2, by = y - s * 0.32;
      rr(ctx, bx - 1, by - 1, bw + 2, bh + 2, (bh + 2) / 2); ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fill();
      const rt = clamp(tw.hp / tw.maxHp, 0, 1);
      rr(ctx, bx, by, bw * rt, bh, bh / 2);
      ctx.fillStyle = rt > 0.5 ? PAL.good : rt > 0.25 ? PAL.gold : PAL.danger; ctx.fill();
    }
  }
}
/* Уникальная форма «гаджета» для каждой пушки. */
const CANNON_SHAPE = {
  slinger: "sling", frost: "crystal", boomer: "mortar", sniper: "rifle", gatling: "gatling",
  tesla: "coil", venom: "sprayer", blizzard: "blower", twin: "double",
  railgun: "rails", inferno: "flame", prism: "prism"
};
function drawTowerBase(g, x, y, s, level) {
  const lw = Math.max(1.5, s * 0.05), lv = level || 0;
  g.lineJoin = "round";
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.beginPath(); g.ellipse(x, y + s * 0.34, s * 0.4, s * 0.16, 0, 0, TAU); g.fill();
  // опорные ножки из-под плиты
  g.fillStyle = "#3d4557"; g.strokeStyle = PAL.outline; g.lineWidth = Math.max(1, s * 0.03);
  for (const dx of [-0.26, 0.26]) { rr(g, x + dx * s - s * 0.07, y + s * 0.2, s * 0.14, s * 0.15, s * 0.04); g.fill(); g.stroke(); }
  // плита
  rr(g, x - s * 0.38, y - s * 0.18, s * 0.76, s * 0.52, s * 0.13);
  g.fillStyle = radial(g, x - s * 0.1, y - s * 0.1, s * 0.04, x, y + s * 0.12, s * 0.72, [[0, shade("#6a7690", 1.25)], [1, shade("#6a7690", 0.72)]]);
  g.fill();
  g.strokeStyle = PAL.outline; g.lineWidth = lw; g.stroke();
  // верхняя фаска
  rr(g, x - s * 0.32, y - s * 0.16, s * 0.64, s * 0.15, s * 0.08);
  g.fillStyle = "rgba(255,255,255,0.22)"; g.fill();
  // шов панели и тень у нижнего края
  g.strokeStyle = "rgba(10,20,40,0.3)"; g.lineWidth = Math.max(1, s * 0.018);
  g.beginPath(); g.moveTo(x - s * 0.32, y + s * 0.13); g.lineTo(x + s * 0.32, y + s * 0.13); g.stroke();
  g.fillStyle = "rgba(10,20,40,0.16)";
  rr(g, x - s * 0.36, y + s * 0.2, s * 0.72, s * 0.12, s * 0.05); g.fill();
  // заклёпки по углам плиты
  g.fillStyle = "#aab6cc";
  for (const dx of [-0.3, 0.3]) for (const dy of [-0.09, 0.07]) {
    g.beginPath(); g.arc(x + dx * s, y + dy * s, s * 0.026, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.5)";
    g.beginPath(); g.arc(x + dx * s - s * 0.008, y + dy * s - s * 0.008, s * 0.011, 0, TAU); g.fill();
    g.fillStyle = "#aab6cc";
  }
  // гнездо под турель
  g.fillStyle = "rgba(10,18,34,0.34)";
  g.beginPath(); g.ellipse(x, y - s * 0.01, s * 0.31, s * 0.2, 0, 0, TAU); g.fill();
  // накладки за уровень: стальной кант, потом золотой
  if (lv >= 1) {
    g.strokeStyle = "#c2ccdd"; g.lineWidth = Math.max(1, s * 0.022);
    rr(g, x - s * 0.34, y - s * 0.14, s * 0.68, s * 0.44, s * 0.1); g.stroke();
  }
  if (lv >= 2) {
    g.strokeStyle = PAL.gold; g.lineWidth = Math.max(1, s * 0.026);
    g.beginPath(); g.moveTo(x - s * 0.36, y + s * 0.05); g.lineTo(x - s * 0.36, y + s * 0.24);
    g.moveTo(x + s * 0.36, y + s * 0.05); g.lineTo(x + s * 0.36, y + s * 0.24); g.stroke();
  }
}
function drawTower(g, x, y, s, type, angle, level) {
  drawTowerBase(g, x, y, s, level);
  drawCannonDevice(g, x, y - s * 0.02, s, type, angle, level);
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.arc(x - s * 0.16 + i * s * 0.16, y + s * 0.24, s * 0.045, 0, TAU);
    g.fillStyle = i <= level ? PAL.gold : "rgba(0,0,0,0.32)"; g.fill();
    g.strokeStyle = "rgba(10,18,34,0.45)"; g.lineWidth = Math.max(1, s * 0.014); g.stroke();
    if (i <= level) { g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(x - s * 0.17 + i * s * 0.16, y + s * 0.23, s * 0.015, 0, TAU); g.fill(); }
  }
}
function drawTowerIcon(g, x, y, s, type) {
  drawTowerBase(g, x, y, s * 0.9, 0);
  drawCannonDevice(g, x, y - s * 0.02, s * 0.9, type, -0.55, 0);
}
function drawCannonDevice(g, x, y, s, type, angle, level) {
  const def = TOWERS[type], C = def.color, lw = Math.max(1.3, s * 0.05), dark = shade(C, 0.45);
  const shape = CANNON_SHAPE[type] || "sling";
  const upright = (shape === "crystal" || shape === "coil" || shape === "prism");
  const lv = level || 0;
  // турель-основание цвета пушки
  g.beginPath(); g.arc(x, y, s * 0.24, 0, TAU);
  g.fillStyle = radial(g, x - s * 0.08, y - s * 0.09, s * 0.03, x, y, s * 0.27, [[0, shade(C, 1.35)], [1, shade(C, 0.72)]]);
  g.fill(); g.strokeStyle = PAL.outline; g.lineWidth = lw; g.stroke();
  // воротник турели и блик по верхнему краю
  g.strokeStyle = shade(C, 0.6); g.lineWidth = Math.max(1, s * 0.018);
  g.beginPath(); g.arc(x, y, s * 0.19, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = Math.max(1, s * 0.022);
  g.beginPath(); g.arc(x, y, s * 0.21, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
  g.beginPath(); g.arc(x - s * 0.07, y - s * 0.08, s * 0.07, 0, TAU); g.fillStyle = "rgba(255,255,255,0.5)"; g.fill();
  // кольца прокачки: сталь на 2-м уровне, золото с заклёпками на 3-м
  if (lv >= 1) {
    g.strokeStyle = "#c2ccdd"; g.lineWidth = Math.max(1, s * 0.022);
    g.beginPath(); g.arc(x, y, s * 0.25, 0, TAU); g.stroke();
  }
  if (lv >= 2) {
    g.strokeStyle = PAL.gold; g.lineWidth = Math.max(1, s * 0.024);
    g.beginPath(); g.arc(x, y, s * 0.29, 0, TAU); g.stroke();
    g.fillStyle = PAL.gold;
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4 + 0.78;
      g.beginPath(); g.arc(x + Math.cos(a) * s * 0.29, y + Math.sin(a) * s * 0.29, s * 0.032, 0, TAU); g.fill();
    }
  }
  g.save(); g.translate(x, y);
  if (!upright) g.rotate(angle);
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = PAL.outline; g.lineWidth = lw;
  switch (shape) {
    case "sling": // рогатка
      g.strokeStyle = "#8a5a34"; g.lineWidth = s * 0.08;
      g.beginPath(); g.moveTo(s * 0.05, s * 0.06); g.lineTo(s * 0.22, 0); g.stroke();
      g.beginPath(); g.moveTo(s * 0.22, 0); g.lineTo(s * 0.44, -s * 0.16); g.moveTo(s * 0.22, 0); g.lineTo(s * 0.44, s * 0.16); g.stroke();
      g.strokeStyle = shade(C, 0.75); g.lineWidth = s * 0.035;
      g.beginPath(); g.moveTo(s * 0.44, -s * 0.16); g.lineTo(s * 0.3, 0); g.lineTo(s * 0.44, s * 0.16); g.stroke();
      g.fillStyle = C; g.beginPath(); g.arc(s * 0.3, 0, s * 0.07, 0, TAU); g.fill(); g.strokeStyle = dark; g.lineWidth = lw; g.stroke();
      break;
    case "crystal": // ледяной кристалл (без вращения)
      g.strokeStyle = PAL.outline; g.lineWidth = lw; g.fillStyle = "#cdeffb";
      g.beginPath(); g.moveTo(0, -s * 0.42); g.lineTo(s * 0.15, -s * 0.05); g.lineTo(0, s * 0.12); g.lineTo(-s * 0.15, -s * 0.05); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = shade(C, 1.15);
      g.beginPath(); g.moveTo(-s * 0.23, 0); g.lineTo(-s * 0.12, -s * 0.3); g.lineTo(-s * 0.05, 0); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(s * 0.23, 0); g.lineTo(s * 0.12, -s * 0.3); g.lineTo(s * 0.05, 0); g.closePath(); g.fill(); g.stroke();
      break;
    case "mortar": // толстая мортира
      g.fillStyle = "#3a3f52"; rr(g, s * 0.02, -s * 0.15, s * 0.34, s * 0.3, s * 0.08); g.fill(); g.stroke();
      g.beginPath(); g.arc(s * 0.36, 0, s * 0.16, 0, TAU); g.fillStyle = "#2a2e3d"; g.fill(); g.stroke();
      g.fillStyle = "#15171f"; g.beginPath(); g.arc(s * 0.36, 0, s * 0.09, 0, TAU); g.fill();
      break;
    case "rifle": // снайперская винтовка со скопом
      g.fillStyle = "#33405c"; rr(g, s * 0.02, -s * 0.045, s * 0.56, s * 0.09, s * 0.03); g.fill(); g.stroke();
      g.fillStyle = C; rr(g, -s * 0.2, -s * 0.06, s * 0.14, s * 0.12, s * 0.04); g.fill(); g.stroke();
      g.strokeStyle = C; g.lineWidth = lw * 1.4; g.beginPath(); g.arc(s * 0.16, -s * 0.05, s * 0.08, 0, TAU); g.stroke();
      g.strokeStyle = PAL.outline; g.lineWidth = lw; g.fillStyle = "#15171f"; g.beginPath(); g.arc(s * 0.56, 0, s * 0.05, 0, TAU); g.fill();
      break;
    case "gatling": // блок из стволов
      g.fillStyle = "#2a2e3d";
      for (const dy of [-s * 0.13, 0, s * 0.13]) { rr(g, s * 0.06, dy - s * 0.04, s * 0.4, s * 0.08, s * 0.03); g.fill(); g.stroke(); }
      g.fillStyle = C; g.beginPath(); g.arc(s * 0.08, 0, s * 0.15, 0, TAU); g.fill(); g.strokeStyle = dark; g.lineWidth = lw; g.stroke();
      break;
    case "coil": // тесла-катушка (без вращения)
      g.strokeStyle = "#8090ab"; g.lineWidth = s * 0.06;
      g.beginPath(); g.moveTo(0, s * 0.14); g.lineTo(0, -s * 0.16); g.stroke();
      for (let i = 0; i < 3; i++) { g.strokeStyle = shade(C, 0.85); g.lineWidth = s * 0.04; g.beginPath(); g.ellipse(0, s * 0.02 - i * s * 0.08, s * 0.13 - i * s * 0.025, s * 0.03, 0, 0, TAU); g.stroke(); }
      g.fillStyle = C; g.beginPath(); g.arc(0, -s * 0.26, s * 0.12, 0, TAU); g.fill(); g.strokeStyle = PAL.outline; g.lineWidth = lw; g.stroke();
      g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(-s * 0.04, -s * 0.3, s * 0.04, 0, TAU); g.fill();
      g.strokeStyle = "#bfe9ff"; g.lineWidth = lw; g.beginPath(); g.moveTo(0, -s * 0.26); g.lineTo(s * 0.16, -s * 0.4); g.moveTo(0, -s * 0.26); g.lineTo(-s * 0.14, -s * 0.42); g.stroke();
      break;
    case "sprayer": // бак с ядом и соплом
      g.fillStyle = radial(g, -s * 0.06, -s * 0.08, s * 0.02, 0, 0, s * 0.26, [[0, shade(C, 1.35)], [1, shade(C, 0.78)]]);
      g.beginPath(); g.arc(0, 0, s * 0.22, 0, TAU); g.fill(); g.strokeStyle = dark; g.lineWidth = lw; g.stroke();
      g.fillStyle = "#2a2e3d"; g.strokeStyle = PAL.outline; rr(g, s * 0.16, -s * 0.05, s * 0.3, s * 0.1, s * 0.03); g.fill(); g.stroke();
      g.fillStyle = shade(C, 0.7); g.beginPath(); g.arc(s * 0.48, s * 0.02, s * 0.05, 0, TAU); g.fill();
      break;
    case "blower": // снегомёт-раструб
      g.fillStyle = "#e6f6ff"; g.strokeStyle = PAL.outline;
      g.beginPath(); g.moveTo(s * 0.04, -s * 0.09); g.lineTo(s * 0.46, -s * 0.22); g.lineTo(s * 0.46, s * 0.22); g.lineTo(s * 0.04, s * 0.09); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = "#7fc7e6"; g.lineWidth = lw; g.beginPath(); g.arc(s * 0.44, 0, s * 0.1, 0.15 * TAU, 0.95 * TAU); g.stroke();
      break;
    case "double": // двустволка
      g.fillStyle = "#33405c"; g.strokeStyle = PAL.outline;
      rr(g, s * 0.02, -s * 0.14, s * 0.44, s * 0.1, s * 0.03); g.fill(); g.stroke();
      rr(g, s * 0.02, s * 0.04, s * 0.44, s * 0.1, s * 0.03); g.fill(); g.stroke();
      g.fillStyle = "#15171f"; g.beginPath(); g.arc(s * 0.46, -s * 0.09, s * 0.045, 0, TAU); g.arc(s * 0.46, s * 0.09, s * 0.045, 0, TAU); g.fill();
      break;
    case "rails": // рельсотрон
      g.fillStyle = "#33405c"; g.strokeStyle = PAL.outline;
      rr(g, s * 0.02, -s * 0.16, s * 0.56, s * 0.07, s * 0.02); g.fill(); g.stroke();
      rr(g, s * 0.02, s * 0.09, s * 0.56, s * 0.07, s * 0.02); g.fill(); g.stroke();
      g.strokeStyle = C; g.lineWidth = lw * 1.2; g.beginPath(); g.moveTo(s * 0.16, 0); g.lineTo(s * 0.5, 0); g.stroke();
      g.fillStyle = C; g.beginPath(); g.arc(s * 0.5, 0, s * 0.07, 0, TAU); g.fill();
      break;
    case "flame": // огнемёт
      g.fillStyle = "#3a2e2a"; g.strokeStyle = PAL.outline;
      rr(g, s * 0.02, -s * 0.09, s * 0.3, s * 0.18, s * 0.05); g.fill(); g.stroke();
      g.fillStyle = "#ff7a2e"; g.beginPath(); g.moveTo(s * 0.32, -s * 0.12); g.lineTo(s * 0.56, 0); g.lineTo(s * 0.32, s * 0.12); g.closePath(); g.fill();
      g.fillStyle = "#ffd15a"; g.beginPath(); g.moveTo(s * 0.34, -s * 0.06); g.lineTo(s * 0.48, 0); g.lineTo(s * 0.34, s * 0.06); g.closePath(); g.fill();
      break;
    case "prism": // призма с тремя лучами (без вращения)
      g.strokeStyle = C; g.lineWidth = lw;
      g.beginPath(); g.moveTo(0, -s * 0.04); g.lineTo(0, -s * 0.46); g.moveTo(0, -s * 0.04); g.lineTo(s * 0.36, s * 0.16); g.moveTo(0, -s * 0.04); g.lineTo(-s * 0.36, s * 0.16); g.stroke();
      g.fillStyle = radial(g, -s * 0.06, -s * 0.18, s * 0.02, 0, -s * 0.02, s * 0.3, [[0, shade(C, 1.18)], [0.45, C], [1, shade(C, 0.68)]]);
      g.beginPath(); g.moveTo(0, -s * 0.3); g.lineTo(s * 0.2, s * 0.1); g.lineTo(-s * 0.2, s * 0.1); g.closePath(); g.fill(); g.strokeStyle = PAL.outline; g.lineWidth = lw; g.stroke();
      break;
  }
  cannonDetail(g, s, shape, C, lv, lw);
  g.restore();
}
/* Мелкая доводка ствола: блики, ободки, накладки за уровень.
   Вызывается внутри повёрнутой системы координат пушки. */
function cannonDetail(g, s, shape, C, lv, lw) {
  g.lineJoin = "round"; g.lineCap = "round";
  const steel = "#c2ccdd", dk = "rgba(10,18,34,0.45)";
  switch (shape) {
    case "sling":
      g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = Math.max(1, s * 0.016);
      g.beginPath(); g.moveTo(s * 0.08, s * 0.04); g.lineTo(s * 0.2, -s * 0.01); g.stroke();
      g.fillStyle = "#5f3d22";
      g.beginPath(); g.ellipse(s * 0.3, 0, s * 0.05, s * 0.075, 0, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.beginPath(); g.arc(s * 0.28, -s * 0.02, s * 0.02, 0, TAU); g.fill();
      break;
    case "crystal":
      g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = Math.max(1, s * 0.016);
      g.beginPath(); g.moveTo(0, -s * 0.38); g.lineTo(0, s * 0.08);
      g.moveTo(-s * 0.1, -s * 0.12); g.lineTo(s * 0.1, -s * 0.12); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.85)";
      for (const pnt of [[s * 0.2, -s * 0.3], [-s * 0.22, -s * 0.2]]) {
        g.beginPath(); g.arc(pnt[0], pnt[1], s * 0.022, 0, TAU); g.fill();
      }
      break;
    case "mortar":
      g.strokeStyle = steel; g.lineWidth = Math.max(1, s * 0.022);
      g.beginPath(); g.moveTo(s * 0.1, -s * 0.15); g.lineTo(s * 0.1, s * 0.15);
      g.moveTo(s * 0.22, -s * 0.15); g.lineTo(s * 0.22, s * 0.15); g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = Math.max(1, s * 0.02);
      g.beginPath(); g.moveTo(s * 0.05, -s * 0.1); g.lineTo(s * 0.32, -s * 0.1); g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = Math.max(1, s * 0.02);
      g.beginPath(); g.arc(s * 0.36, 0, s * 0.13, Math.PI * 1.05, Math.PI * 1.8); g.stroke();
      break;
    case "rifle":
      g.fillStyle = "rgba(160,220,255,0.75)";
      g.beginPath(); g.arc(s * 0.16, -s * 0.05, s * 0.045, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,0.9)";
      g.beginPath(); g.arc(s * 0.145, -s * 0.065, s * 0.018, 0, TAU); g.fill();
      g.strokeStyle = steel; g.lineWidth = Math.max(1, s * 0.018);
      g.beginPath(); g.moveTo(s * 0.46, -s * 0.045); g.lineTo(s * 0.46, s * 0.045); g.stroke();
      break;
    case "gatling":
      g.fillStyle = "#15171f";
      for (const dy of [-s * 0.13, 0, s * 0.13]) { g.beginPath(); g.arc(s * 0.46, dy, s * 0.032, 0, TAU); g.fill(); }
      g.strokeStyle = "rgba(255,255,255,0.28)"; g.lineWidth = Math.max(1, s * 0.016);
      for (const dy of [-s * 0.13, 0, s * 0.13]) { g.beginPath(); g.moveTo(s * 0.1, dy - s * 0.025); g.lineTo(s * 0.42, dy - s * 0.025); g.stroke(); }
      break;
    case "coil":
      g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = Math.max(1, s * 0.014);
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-s * 0.1 + i * s * 0.02, s * 0.02 - i * s * 0.08); g.lineTo(s * 0.1 - i * s * 0.02, s * 0.02 - i * s * 0.08); g.stroke(); }
      g.fillStyle = "rgba(191,233,255,0.9)";
      g.beginPath(); g.arc(s * 0.16, -s * 0.4, s * 0.022, 0, TAU); g.fill();
      g.beginPath(); g.arc(-s * 0.14, -s * 0.42, s * 0.022, 0, TAU); g.fill();
      g.strokeStyle = "#6a7690"; g.lineWidth = Math.max(1, s * 0.02);
      g.beginPath(); g.moveTo(-s * 0.12, s * 0.14); g.lineTo(s * 0.12, s * 0.14); g.stroke();
      break;
    case "sprayer":
      g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = Math.max(1, s * 0.02);
      g.beginPath(); g.arc(0, 0, s * 0.14, Math.PI * 0.95, Math.PI * 1.5); g.stroke();
      g.strokeStyle = "#2a2e3d"; g.lineWidth = Math.max(1, s * 0.026);
      g.beginPath(); g.moveTo(s * 0.18, -s * 0.05); g.quadraticCurveTo(s * 0.24, -s * 0.16, s * 0.34, -s * 0.1); g.stroke();
      g.fillStyle = shade(C, 1.25);
      g.beginPath(); g.arc(s * 0.54, s * 0.04, s * 0.03, 0, TAU); g.fill();
      break;
    case "blower":
      g.strokeStyle = "rgba(120,190,220,0.55)"; g.lineWidth = Math.max(1, s * 0.016);
      g.beginPath(); g.moveTo(s * 0.18, -s * 0.13); g.lineTo(s * 0.18, s * 0.13);
      g.moveTo(s * 0.32, -s * 0.18); g.lineTo(s * 0.32, s * 0.18); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.beginPath(); g.arc(s * 0.5, -s * 0.06, s * 0.022, 0, TAU); g.fill();
      g.beginPath(); g.arc(s * 0.54, s * 0.08, s * 0.016, 0, TAU); g.fill();
      break;
    case "double":
      g.strokeStyle = steel; g.lineWidth = Math.max(1, s * 0.02);
      g.beginPath(); g.moveTo(s * 0.2, -s * 0.14); g.lineTo(s * 0.2, s * 0.14); g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = Math.max(1, s * 0.016);
      g.beginPath(); g.moveTo(s * 0.06, -s * 0.12); g.lineTo(s * 0.42, -s * 0.12);
      g.moveTo(s * 0.06, s * 0.06); g.lineTo(s * 0.42, s * 0.06); g.stroke();
      break;
    case "rails":
      g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = Math.max(1, s * 0.014);
      for (const t of [0.26, 0.4]) {
        g.beginPath(); g.moveTo(s * t, -s * 0.11); g.lineTo(s * (t + 0.04), -s * 0.02);
        g.lineTo(s * (t - 0.02), s * 0.02); g.lineTo(s * (t + 0.03), s * 0.11); g.stroke();
      }
      g.fillStyle = "#2a3247";
      for (const t of [0.12, 0.2]) { rr(g, s * t, -s * 0.2, s * 0.05, s * 0.4, s * 0.02); g.fill(); }
      break;
    case "flame":
      g.strokeStyle = steel; g.lineWidth = Math.max(1, s * 0.02);
      g.beginPath(); g.moveTo(s * 0.1, -s * 0.09); g.lineTo(s * 0.1, s * 0.09);
      g.moveTo(s * 0.22, -s * 0.09); g.lineTo(s * 0.22, s * 0.09); g.stroke();
      g.fillStyle = "rgba(255,240,190,0.95)";
      g.beginPath(); g.moveTo(s * 0.36, -s * 0.03); g.lineTo(s * 0.44, 0); g.lineTo(s * 0.36, s * 0.03); g.closePath(); g.fill();
      g.fillStyle = "#ffb347";
      g.beginPath(); g.arc(s * 0.3, -s * 0.13, s * 0.025, 0, TAU); g.fill();
      break;
    case "prism":
      g.fillStyle = "rgba(255,255,255,0.22)";
      g.beginPath(); g.moveTo(-s * 0.02, -s * 0.27); g.lineTo(-s * 0.14, s * 0.06); g.lineTo(-s * 0.05, s * 0.06); g.closePath(); g.fill();
      g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = Math.max(1, s * 0.016);
      g.beginPath(); g.moveTo(0, -s * 0.26); g.lineTo(0, s * 0.08);
      g.moveTo(-s * 0.14, s * 0.06); g.lineTo(s * 0.14, s * 0.06); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.9)";
      g.beginPath(); g.arc(0, -s * 0.44, s * 0.025, 0, TAU); g.fill();
      g.beginPath(); g.arc(s * 0.34, s * 0.15, s * 0.02, 0, TAU); g.fill();
      g.beginPath(); g.arc(-s * 0.34, s * 0.15, s * 0.02, 0, TAU); g.fill();
      break;
  }
  // накладки за уровень: стальной хомут, затем золотое кольцо у дула
  g.strokeStyle = dk;
}

/* ---------- Враги ---------- */
function drawEnemies() {
  const s = view.board.cell;
  for (const e of G.enemies) {
    const p = posAt(G.path, e.dist);
    const x = cx(p.c), y = cy(p.r);
    const ph = G.clock + e.phase;
    const bob = Math.sin(ph * 7) * s * 0.05;
    const r = e.size * s;
    // мягкая контактная тень
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.98, r * 0.8, r * 0.26, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.98, r * 0.55, r * 0.17, 0, 0, TAU); ctx.fill();
    drawCreature(e.type, x, y + bob, r, ph);
    // индикатор заморозки
    if (e.slowT > 0) {
      ctx.strokeStyle = "rgba(130,228,255,0.9)"; ctx.lineWidth = 2.5 * view.ui;
      ctx.setLineDash([r * 0.4, r * 0.3]);
      ctx.beginPath(); ctx.arc(x, y + bob, r * 1.2, ph, ph + TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    // индикатор яда
    if (e.poisonT > 0) {
      for (let k = 0; k < 3; k++) {
        const a = ph * 3 + k * TAU / 3;
        ctx.fillStyle = "rgba(126,217,87,0.85)";
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.95, y + bob + Math.sin(a) * r * 0.95 - r * 0.2, r * 0.11, 0, TAU); ctx.fill();
      }
    }
    // полоса здоровья
    if (e.hp < e.hpMax) {
      const bw = r * 1.9, bh = Math.max(4, s * 0.085), bx = x - bw / 2, by = y - r * 1.28 + bob;
      rr(ctx, bx - 1.5, by - 1.5, bw + 3, bh + 3, (bh + 3) / 2); ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fill();
      const rt = clamp(e.hp / e.hpMax, 0, 1);
      rr(ctx, bx, by, bw * rt, bh, bh / 2);
      ctx.fillStyle = rt > 0.5 ? PAL.good : rt > 0.25 ? PAL.gold : PAL.danger; ctx.fill();
    }
  }
}
/* --- художественные помощники для монстров --- */
function blinkOf(ph) { return ((ph * 0.5) % 5) < 0.13 ? 0.14 : 1; }
function eye(g, x, y, r, lookX, lookY, open) {
  open = open == null ? 1 : open;
  // белок с лёгким объёмом
  g.fillStyle = radial(g, x - r * 0.2, y - r * 0.28, r * 0.08, x, y, r * 1.08, [[0, "#ffffff"], [1, "#e2e8f3"]]);
  g.beginPath(); g.ellipse(x, y, r, r * open, 0, 0, TAU); g.fill();
  g.lineWidth = Math.max(1, r * 0.12); g.strokeStyle = "rgba(18,24,40,0.34)"; g.stroke();
  // зрачок со взглядом
  const px = x + (lookX || 0) * r * 0.34, py = y + (lookY || 0) * r * 0.34 * open;
  g.fillStyle = "#20283a";
  g.beginPath(); g.arc(px, py, r * 0.58 * Math.max(0.35, open), 0, TAU); g.fill();
  // двойной блик — «живой» мультяшный глаз
  g.fillStyle = "rgba(255,255,255,0.95)";
  g.beginPath(); g.arc(px - r * 0.22, py - r * 0.24, r * 0.19 * Math.max(0.4, open), 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,0.6)";
  g.beginPath(); g.arc(px + r * 0.17, py + r * 0.16, r * 0.08 * Math.max(0.3, open), 0, TAU); g.fill();
}
function teethRow(g, x0, x1, yBase, h, n, down) {
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    g.beginPath();
    g.moveTo(x0 + w * i, yBase);
    g.lineTo(x0 + w * (i + 1), yBase);
    g.lineTo(x0 + w * (i + 0.5), yBase + (down ? h : -h));
    g.closePath();
    g.fillStyle = "#f6f9ff"; g.fill();
    // тонкая обводка — зубы читаются по-отдельности даже в мелком размере
    g.strokeStyle = "rgba(110,80,90,0.3)"; g.lineWidth = Math.max(0.8, h * 0.06); g.stroke();
  }
}
function furBlob(g, cxp, cyp, rx, ry, n, ph) {
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU;
    const spike = (i % 2 === 0) ? 1.0 : 1.06 + Math.sin(ph * 2.5 + i) * 0.02;
    const px = cxp + Math.cos(a) * rx * spike;
    const py = cyp + Math.sin(a) * ry * spike;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
}

/* --- мелкая детализация: шерсть, блики, крапинки, строчка --- */
function dHash(i, j) { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) ^ 0x5bf03635; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
/* клочки шерсти вдоль дуги контура — тело перестаёт быть гладкой каплей */
function furTufts(g, x, y, rx, ry, a0, a1, n, len, color, lw, seed) {
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const t = a0 + (a1 - a0) * ((i + 0.5) / n);
    const px = x + Math.cos(t) * rx, py = y + Math.sin(t) * ry;
    const l = len * (0.65 + dHash(seed || 0, i) * 0.7), a = t + (dHash(i, seed || 0) - 0.5) * 0.5;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke();
  }
}
/* мягкий блик по форме — объём без лишних градиентов */
function gloss(g, x, y, rx, ry, a, rot) {
  g.save(); g.translate(x, y); if (rot) g.rotate(rot);
  g.fillStyle = "rgba(255,255,255," + (a == null ? 0.18 : a) + ")";
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); g.restore();
}
/* крапинки: веснушки, пятнышки шерсти, фактура ткани (детерминированные) */
function speckles(g, x, y, rx, ry, n, seed, color, sz) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = dHash(seed, i) * TAU, d = Math.sqrt(dHash(i, seed + 11));
    g.beginPath(); g.arc(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, sz * (0.55 + dHash(i, seed + 5) * 0.9), 0, TAU); g.fill();
  }
}
/* строчка-шов: игрушечность и линии кроя одежды */
function stitch(g, x0, y0, x1, y1, n, color, lw) {
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = t0 + 0.55 / n;
    g.beginPath(); g.moveTo(lerp(x0, x1, t0), lerp(y0, y1, t0)); g.lineTo(lerp(x0, x1, t1), lerp(y0, y1, t1)); g.stroke();
  }
}
function drawGrenny(g, x, y, r, ph) {
  const gown = "#4d7d8c", skin = "#e7d1ba", bl = blinkOf(ph);
  g.lineJoin = "round"; g.lineCap = "round";
  // трость
  g.strokeStyle = "#7a5230"; g.lineWidth = Math.max(2, r * 0.07);
  g.beginPath(); g.moveTo(x + r * 0.64, y + r * 0.15); g.lineTo(x + r * 0.78, y + r * 1.05); g.stroke();
  g.beginPath(); g.arc(x + r * 0.62, y + r * 0.18, r * 0.1, Math.PI * 0.35, Math.PI * 1.7); g.stroke();
  // ночная сорочка
  g.fillStyle = radial(g, x, y + r * 0.2, r * 0.1, x, y + r * 0.5, r * 1.25, [[0, shade(gown, 1.22)], [1, shade(gown, 0.74)]]);
  g.beginPath();
  g.moveTo(x - r * 0.48, y + r * 0.02);
  g.quadraticCurveTo(x - r * 0.9, y + r * 1.05, x - r * 0.5, y + r * 1.06);
  g.lineTo(x + r * 0.5, y + r * 1.06);
  g.quadraticCurveTo(x + r * 0.9, y + r * 1.05, x + r * 0.48, y + r * 0.02);
  g.closePath(); g.fill();
  g.strokeStyle = shade(gown, 0.5); g.lineWidth = Math.max(1.6, r * 0.06); g.stroke();
  // складки
  g.strokeStyle = shade(gown, 0.82); g.lineWidth = Math.max(1, r * 0.03);
  for (const dx of [-0.2, 0.12]) { g.beginPath(); g.moveTo(x + dx * r, y + r * 0.2); g.lineTo(x + dx * r * 1.5, y + r * 0.98); g.stroke(); }
  // руки с ладошками
  g.strokeStyle = shade(gown, 0.9); g.lineWidth = r * 0.15;
  g.beginPath(); g.moveTo(x - r * 0.4, y + r * 0.12); g.lineTo(x - r * 0.6, y + r * 0.55); g.stroke();
  g.beginPath(); g.moveTo(x + r * 0.4, y + r * 0.12); g.lineTo(x + r * 0.6, y + r * 0.3); g.stroke();
  g.fillStyle = skin; g.beginPath(); g.arc(x - r * 0.62, y + r * 0.58, r * 0.1, 0, TAU); g.arc(x + r * 0.62, y + r * 0.28, r * 0.1, 0, TAU); g.fill();
  // воротник
  g.fillStyle = shade(gown, 1.28);
  g.beginPath(); g.ellipse(x, y + r * 0.05, r * 0.42, r * 0.16, 0, 0, TAU); g.fill(); g.stroke();
  // дикие седые космы
  g.fillStyle = "#eef1f5";
  g.beginPath();
  const hn = 12;
  for (let i = 0; i <= hn; i++) {
    const a = Math.PI + i / hn * Math.PI, spk = (i % 2 === 0) ? 0.9 : 1.14;
    g.lineTo(x + Math.cos(a) * r * 0.66 * spk, y - r * 0.36 + Math.sin(a) * r * 0.64 * spk);
  }
  g.lineTo(x + r * 0.54, y - r * 0.08); g.lineTo(x - r * 0.54, y - r * 0.08); g.closePath();
  g.fill(); g.strokeStyle = "#cdd2dc"; g.lineWidth = Math.max(1.3, r * 0.04); g.stroke();
  // бледное лицо
  g.fillStyle = radial(g, x - r * 0.12, y - r * 0.42, r * 0.05, x, y - r * 0.28, r * 0.58, [[0, "#f2e1ce"], [1, "#d9bfa1"]]);
  g.beginPath(); g.arc(x, y - r * 0.28, r * 0.5, 0, TAU); g.fill();
  g.strokeStyle = shade("#d9bfa1", 0.75); g.lineWidth = Math.max(1.3, r * 0.04); g.stroke();
  // морщины
  g.strokeStyle = "rgba(150,120,95,0.45)"; g.lineWidth = Math.max(1, r * 0.025);
  g.beginPath(); g.arc(x - r * 0.22, y - r * 0.08, r * 0.12, Math.PI * 1.1, Math.PI * 1.8); g.stroke();
  g.beginPath(); g.arc(x + r * 0.22, y - r * 0.08, r * 0.12, Math.PI * 1.2, Math.PI * 1.9); g.stroke();
  // нахмуренные седые брови
  g.strokeStyle = "#e2e6ee"; g.lineWidth = Math.max(2, r * 0.07);
  g.beginPath(); g.moveTo(x - r * 0.36, y - r * 0.44); g.lineTo(x - r * 0.1, y - r * 0.36);
  g.moveTo(x + r * 0.36, y - r * 0.44); g.lineTo(x + r * 0.1, y - r * 0.36); g.stroke();
  // глаза
  eye(g, x - r * 0.19, y - r * 0.28, r * 0.11, 0, 0.05, bl);
  eye(g, x + r * 0.19, y - r * 0.28, r * 0.11, 0, 0.05, bl);
  // крупный нос
  g.fillStyle = "#e0c2a2"; g.strokeStyle = shade("#d9bfa1", 0.62); g.lineWidth = Math.max(1.3, r * 0.04);
  g.beginPath(); g.moveTo(x - r * 0.05, y - r * 0.16); g.quadraticCurveTo(x + r * 0.13, y - r * 0.04, x - r * 0.02, y + r * 0.03); g.quadraticCurveTo(x - r * 0.11, y - r * 0.01, x - r * 0.05, y - r * 0.16); g.closePath(); g.fill(); g.stroke();
  // хитрая улыбка
  g.strokeStyle = "#9c5f4a"; g.lineWidth = Math.max(1.5, r * 0.05);
  g.beginPath(); g.moveTo(x - r * 0.18, y + r * 0.13); g.quadraticCurveTo(x, y + r * 0.21, x + r * 0.18, y + r * 0.11); g.stroke();
  // румянец
  g.fillStyle = "rgba(220,130,130,0.3)";
  g.beginPath(); g.arc(x - r * 0.3, y - r * 0.04, r * 0.09, 0, TAU); g.arc(x + r * 0.3, y - r * 0.04, r * 0.09, 0, TAU); g.fill();
  // вязаный узор на сорочке
  speckles(g, x, y + r * 0.62, r * 0.34, r * 0.34, 7, 3, "rgba(255,255,255,0.16)", r * 0.035);
  g.strokeStyle = "rgba(255,255,255,0.14)"; g.lineWidth = Math.max(1, r * 0.022);
  g.beginPath(); g.moveTo(x - r * 0.42, y + r * 0.86); g.quadraticCurveTo(x, y + r * 0.94, x + r * 0.42, y + r * 0.86); g.stroke();
  // тапочки
  g.fillStyle = "#b8646f"; g.strokeStyle = "#8d4551"; g.lineWidth = Math.max(1.2, r * 0.035);
  for (const s2 of [-1, 1]) { g.beginPath(); g.ellipse(x + s2 * r * 0.3, y + r * 1.14, r * 0.21, r * 0.09, 0, 0, TAU); g.fill(); g.stroke(); }
  // очки на кончике носа
  const gy = y - r * 0.26, gr = r * 0.17;
  g.fillStyle = "rgba(226,240,255,0.22)";
  g.beginPath(); g.arc(x - r * 0.19, gy, gr, 0, TAU); g.fill();
  g.beginPath(); g.arc(x + r * 0.19, gy, gr, 0, TAU); g.fill();
  g.strokeStyle = "#c9a227"; g.lineWidth = Math.max(1.2, r * 0.035);
  g.beginPath(); g.arc(x - r * 0.19, gy, gr, 0, TAU); g.stroke();
  g.beginPath(); g.arc(x + r * 0.19, gy, gr, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(x - r * 0.02, gy - r * 0.02); g.quadraticCurveTo(x, gy - r * 0.09, x + r * 0.02, gy - r * 0.02); g.stroke();
  g.beginPath(); g.moveTo(x - r * 0.36, gy - r * 0.03); g.lineTo(x - r * 0.5, gy - r * 0.1);
  g.moveTo(x + r * 0.36, gy - r * 0.03); g.lineTo(x + r * 0.5, gy - r * 0.1); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = Math.max(1, r * 0.025);
  g.beginPath(); g.moveTo(x - r * 0.28, gy - r * 0.07); g.lineTo(x - r * 0.2, gy + r * 0.03);
  g.moveTo(x + r * 0.1, gy - r * 0.07); g.lineTo(x + r * 0.18, gy + r * 0.03); g.stroke();
  // отдельные седые пряди
  g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = Math.max(1, r * 0.025);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (1.12 + i * 0.19);
    g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.42, y - r * 0.36 + Math.sin(a) * r * 0.4);
    g.lineTo(x + Math.cos(a) * r * 0.72, y - r * 0.36 + Math.sin(a) * r * 0.7); g.stroke();
  }
}
function drawHuggy(g, x, y, r, ph) {
  const C = "#2b82ff", bl = blinkOf(ph);
  const sway = Math.sin(ph * 2) * r * 0.14;
  g.lineJoin = "round"; g.lineCap = "round";
  // очень длинные тонкие руки
  g.strokeStyle = shade(C, 0.55); g.lineWidth = r * 0.2;
  g.beginPath(); g.moveTo(x - r * 0.42, y - r * 0.1); g.quadraticCurveTo(x - r * 1.05, y + r * 0.35, x - r * 0.82 + sway, y + r * 0.95); g.stroke();
  g.beginPath(); g.moveTo(x + r * 0.42, y - r * 0.1); g.quadraticCurveTo(x + r * 1.05, y + r * 0.35, x + r * 0.82 - sway, y + r * 0.95); g.stroke();
  // четырёхпалые ладони
  for (const hx of [x - r * 0.82 + sway, x + r * 0.82 - sway]) {
    g.fillStyle = C; g.beginPath(); g.arc(hx, y + r * 0.98, r * 0.16, 0, TAU); g.fill();
    g.strokeStyle = shade(C, 0.45); g.lineWidth = Math.max(1.4, r * 0.045); g.stroke();
    g.strokeStyle = shade(C, 0.6); g.lineWidth = r * 0.05;
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(hx + k * r * 0.08, y + r * 1.05); g.lineTo(hx + k * r * 0.1, y + r * 1.18); g.stroke(); }
  }
  // короткие ножки
  g.fillStyle = shade(C, 0.82);
  for (const lx of [x - r * 0.26, x + r * 0.26]) { rr(g, lx - r * 0.16, y + r * 0.72, r * 0.32, r * 0.42, r * 0.14); g.fill(); g.strokeStyle = shade(C, 0.45); g.lineWidth = Math.max(1.4, r * 0.045); g.stroke(); }
  // высокое пушистое тело
  g.fillStyle = radial(g, x - r * 0.28, y - r * 0.62, r * 0.1, x, y - r * 0.05, r * 1.35, [[0, shade(C, 1.42)], [0.55, C], [1, shade(C, 0.66)]]);
  g.beginPath(); furBlob(g, x, y - r * 0.12, r * 0.6, r * 1.0, 30, ph); g.fill();
  g.strokeStyle = shade(C, 0.45); g.lineWidth = Math.max(1.7, r * 0.07); g.stroke();
  // большие глаза
  const ey = y - r * 0.56;
  eye(g, x - r * 0.26, ey, r * 0.26, 0, 0.06, bl);
  eye(g, x + r * 0.26, ey, r * 0.26, 0, 0.06, bl);
  // веки — характерный «нависший» взгляд
  g.strokeStyle = shade(C, 0.7); g.lineWidth = r * 0.07;
  g.beginPath(); g.arc(x - r * 0.26, ey, r * 0.28, Math.PI * 1.12, Math.PI * 1.9); g.stroke();
  g.beginPath(); g.arc(x + r * 0.26, ey, r * 0.28, Math.PI * 1.12, Math.PI * 1.9); g.stroke();
  // закрытый рот: мягкая улыбка вместо распахнутой зубастой пасти (п. 2.7 — не пугать малышей)
  const my = y + r * 0.14;
  g.lineCap = "round";
  g.strokeStyle = shade(C, 0.4); g.lineWidth = Math.max(2.2, r * 0.1);
  g.beginPath();
  g.moveTo(x - r * 0.34, my - r * 0.06);
  g.quadraticCurveTo(x, my + r * 0.24, x + r * 0.34, my - r * 0.06);
  g.stroke();
  // тонкая тёплая линия губ поверх — рот читается, но остаётся закрытым
  g.strokeStyle = "#e07b8e"; g.lineWidth = Math.max(1.2, r * 0.045);
  g.beginPath();
  g.moveTo(x - r * 0.29, my - r * 0.05);
  g.quadraticCurveTo(x, my + r * 0.19, x + r * 0.29, my - r * 0.05);
  g.stroke();
  // щёчки — добавляют добродушия
  g.fillStyle = "rgba(255,138,160,0.28)";
  g.beginPath(); g.ellipse(x - r * 0.44, my - r * 0.02, r * 0.13, r * 0.09, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(x + r * 0.44, my - r * 0.02, r * 0.13, r * 0.09, 0, 0, TAU); g.fill();
  const CC = "#2b82ff";
  // светлое пузико со строчкой — плюшевая игрушка, а не гладкая капля
  g.fillStyle = "rgba(255,255,255,0.14)";
  g.beginPath(); g.ellipse(x, y + r * 0.5, r * 0.36, r * 0.32, 0, 0, TAU); g.fill();
  g.strokeStyle = "rgba(12,40,80,0.3)"; g.lineWidth = Math.max(1, r * 0.025);
  g.setLineDash([r * 0.07, r * 0.06]);
  g.beginPath(); g.ellipse(x, y + r * 0.5, r * 0.36, r * 0.32, 0, 0, TAU); g.stroke();
  g.setLineDash([]);
  // ворс по контуру тела
  furTufts(g, x, y - r * 0.12, r * 0.6, r * 1.0, Math.PI * 1.05, Math.PI * 1.95, 10, r * 0.05, shade(CC, 0.78), Math.max(1, r * 0.028), 2);
  furTufts(g, x, y - r * 0.12, r * 0.6, r * 1.0, Math.PI * 0.12, Math.PI * 0.88, 8, r * 0.045, shade(CC, 0.6), Math.max(1, r * 0.025), 5);
  // коготки на ладонях
  const swayC = Math.sin(ph * 2) * r * 0.14;
  g.strokeStyle = "#eaf2ff"; g.lineWidth = Math.max(1, r * 0.03);
  for (const hx of [x - r * 0.82 + swayC, x + r * 0.82 - swayC]) {
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(hx + k * r * 0.1, y + r * 1.16); g.lineTo(hx + k * r * 0.11, y + r * 1.23); g.stroke(); }
  }
  // блик на макушке
  gloss(g, x - r * 0.28, y - r * 0.86, r * 0.2, r * 0.11, 0.22, -0.5);
}
function drawSkibi(g, x, y, r, ph) {
  // бачок за чашей — рисуется первым, поэтому уходит на задний план
  const tank = "#e8ecf3";
  g.lineJoin = "round";
  g.fillStyle = radial(g, x - r * 0.3, y - r * 0.5, r * 0.08, x, y - r * 0.3, r * 1.1, [[0, "#ffffff"], [1, shade(tank, 0.82)]]);
  g.strokeStyle = shade(tank, 0.58); g.lineWidth = Math.max(1.5, r * 0.055);
  rr(g, x - r * 0.6, y - r * 0.42, r * 1.2, r * 0.56, r * 0.1); g.fill(); g.stroke();
  g.fillStyle = shade(tank, 0.92);
  rr(g, x - r * 0.64, y - r * 0.5, r * 1.28, r * 0.12, r * 0.05); g.fill(); g.stroke();
  // кнопка смыва
  g.fillStyle = "#b9c2d0"; g.beginPath(); g.arc(x + r * 0.42, y - r * 0.44, r * 0.07, 0, TAU); g.fill(); g.stroke();
  const porc = "#eef1f7", bl = blinkOf(ph);
  g.lineJoin = "round";
  g.strokeStyle = shade(porc, 0.6); g.lineWidth = Math.max(1.6, r * 0.06);
  // ножка-основание унитаза
  g.fillStyle = radial(g, x, y + r * 0.3, r * 0.1, x, y + r * 0.55, r * 1.1, [[0, "#ffffff"], [1, shade(porc, 0.8)]]);
  g.beginPath();
  g.moveTo(x - r * 0.42, y + r * 0.12);
  g.quadraticCurveTo(x - r * 0.5, y + r * 1.05, x - r * 0.22, y + r * 1.05);
  g.lineTo(x + r * 0.22, y + r * 1.05);
  g.quadraticCurveTo(x + r * 0.5, y + r * 1.05, x + r * 0.42, y + r * 0.12);
  g.closePath(); g.fill(); g.stroke();
  // чаша
  g.fillStyle = radial(g, x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r * 0.9, [[0, "#ffffff"], [1, shade(porc, 0.86)]]);
  rr(g, x - r * 0.7, y - r * 0.28, r * 1.4, r * 0.62, r * 0.26); g.fill(); g.stroke();
  // сиденье-обод
  g.fillStyle = "#ffffff";
  g.beginPath(); g.ellipse(x, y - r * 0.24, r * 0.68, r * 0.24, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = shade(porc, 0.66);
  g.beginPath(); g.ellipse(x, y - r * 0.21, r * 0.47, r * 0.15, 0, 0, TAU); g.fill();
  // голова из чаши
  const hy = y - r * 0.64;
  g.fillStyle = radial(g, x - r * 0.13, hy - r * 0.14, r * 0.05, x, hy, r * 0.52, [[0, "#ffe1bf"], [1, "#e2ad80"]]);
  g.beginPath(); g.arc(x, hy, r * 0.42, 0, TAU); g.fill();
  g.strokeStyle = shade("#e2ad80", 0.72); g.lineWidth = Math.max(1.4, r * 0.045); g.stroke();
  // короткие волосы с пробором
  g.fillStyle = "#2f241d";
  g.beginPath(); g.arc(x, hy - r * 0.14, r * 0.43, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = "#2f241d"; g.lineWidth = Math.max(1.4, r * 0.04);
  g.beginPath(); g.moveTo(x - r * 0.34, hy - r * 0.1); g.quadraticCurveTo(x - r * 0.28, hy - r * 0.26, x - r * 0.1, hy - r * 0.32); g.stroke();
  // серьёзные брови (поёт с надрывом)
  g.strokeStyle = "#2f241d"; g.lineWidth = Math.max(1.8, r * 0.06);
  g.beginPath(); g.moveTo(x - r * 0.3, hy - r * 0.09); g.lineTo(x - r * 0.07, hy - r * 0.16);
  g.moveTo(x + r * 0.3, hy - r * 0.09); g.lineTo(x + r * 0.07, hy - r * 0.16); g.stroke();
  // глаза, устремлённые вверх
  eye(g, x - r * 0.15, hy - r * 0.02, r * 0.1, 0.1, -0.28, bl);
  eye(g, x + r * 0.15, hy - r * 0.02, r * 0.1, 0.1, -0.28, bl);
  // широко открытый поющий рот
  g.save();
  g.fillStyle = "#57121c";
  g.beginPath(); g.ellipse(x, hy + r * 0.26, r * 0.17, r * 0.22, 0, 0, TAU); g.fill();
  g.clip();
  g.fillStyle = "#fff"; g.fillRect(x - r * 0.15, hy + r * 0.08, r * 0.3, r * 0.055);
  g.fillStyle = "#ff6f85"; g.beginPath(); g.ellipse(x, hy + r * 0.42, r * 0.12, r * 0.1, 0, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = shade("#e2ad80", 0.58); g.lineWidth = Math.max(1.4, r * 0.045);
  g.beginPath(); g.ellipse(x, hy + r * 0.26, r * 0.17, r * 0.22, 0, 0, TAU); g.stroke();
  // нотки музыки
  g.fillStyle = "#2f3547";
  for (const nn of [[0.52, -0.12, 1], [0.68, -0.32, 0.8]]) {
    const bxn = x + nn[0] * r, byn = hy + nn[1] * r;
    g.fillRect(bxn, byn - r * 0.26 * nn[2], r * 0.035, r * 0.26 * nn[2]);
    g.beginPath(); g.ellipse(bxn - r * 0.02, byn, r * 0.07 * nn[2], r * 0.05 * nn[2], -0.4, 0, TAU); g.fill();
  }
  // блик на фарфоре и тень под ободом
  gloss(g, x - r * 0.42, y + r * 0.02, r * 0.12, r * 0.2, 0.5, -0.25);
  gloss(g, x - r * 0.26, y + r * 0.62, r * 0.08, r * 0.22, 0.28, -0.1);
  g.strokeStyle = "rgba(90,105,130,0.22)"; g.lineWidth = Math.max(1, r * 0.03);
  g.beginPath(); g.moveTo(x - r * 0.36, y + r * 0.5); g.quadraticCurveTo(x, y + r * 0.6, x + r * 0.36, y + r * 0.5); g.stroke();
  // воротник рубашки под головой
  const hy2 = y - r * 0.64;
  g.fillStyle = "#cfd8e6"; g.strokeStyle = "#9aa6b8"; g.lineWidth = Math.max(1.1, r * 0.03);
  g.beginPath(); g.moveTo(x - r * 0.3, hy2 + r * 0.3); g.lineTo(x - r * 0.08, hy2 + r * 0.5); g.lineTo(x - r * 0.02, hy2 + r * 0.3); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x + r * 0.3, hy2 + r * 0.3); g.lineTo(x + r * 0.08, hy2 + r * 0.5); g.lineTo(x + r * 0.02, hy2 + r * 0.3); g.closePath(); g.fill(); g.stroke();
  // прядки волос
  g.strokeStyle = "#241b16"; g.lineWidth = Math.max(1, r * 0.028);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (1.15 + i * 0.22);
    g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.24, hy2 - r * 0.14 + Math.sin(a) * r * 0.24);
    g.lineTo(x + Math.cos(a) * r * 0.44, hy2 - r * 0.14 + Math.sin(a) * r * 0.46); g.stroke();
  }
}
function drawNommy(g, x, y, r, ph) {
  const C = "#5fc247";
  g.lineJoin = "round"; g.lineCap = "round";
  // лапки
  for (const s2 of [-1, 1]) {
    g.strokeStyle = shade(C, 0.55); g.lineWidth = r * 0.15;
    g.beginPath(); g.moveTo(x + s2 * r * 0.66, y + r * 0.05); g.lineTo(x + s2 * r * 0.92, y + r * 0.32); g.stroke();
    g.fillStyle = shade(C, 0.85);
    g.beginPath(); g.ellipse(x + s2 * r * 0.4, y + r * 0.82, r * 0.2, r * 0.13, 0, 0, TAU); g.fill();
    g.strokeStyle = shade(C, 0.5); g.lineWidth = Math.max(1.5, r * 0.06); g.stroke();
  }
  // круглое тело
  g.fillStyle = radial(g, x - r * 0.28, y - r * 0.22, r * 0.1, x, y + r * 0.12, r * 1.0, [[0, shade(C, 1.42)], [0.6, C], [1, shade(C, 0.68)]]);
  g.beginPath(); g.ellipse(x, y + r * 0.16, r * 0.8, r * 0.82, 0, 0, TAU); g.fill();
  g.strokeStyle = shade(C, 0.5); g.lineWidth = Math.max(1.7, r * 0.075); g.stroke();
  // широкий рот
  g.save();
  g.fillStyle = "#5a1622";
  g.beginPath(); g.arc(x, y + r * 0.26, r * 0.5, 0.04 * Math.PI, 0.96 * Math.PI); g.closePath(); g.fill();
  g.clip();
  g.fillStyle = "#ff5e7a"; g.beginPath(); g.ellipse(x, y + r * 0.74, r * 0.32, r * 0.2, 0, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = shade(C, 0.5); g.lineWidth = Math.max(1.6, r * 0.06);
  g.beginPath(); g.arc(x, y + r * 0.26, r * 0.5, 0.04 * Math.PI, 0.96 * Math.PI); g.closePath(); g.stroke();
  // два клычка
  g.fillStyle = "#fff";
  for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(x + s2 * r * 0.13, y + r * 0.28); g.lineTo(x + s2 * r * 0.27, y + r * 0.28); g.lineTo(x + s2 * r * 0.2, y + r * 0.44); g.closePath(); g.fill(); }
  // ОГРОМНЫЕ глаза — главная примета Ам-Няма (у каждого свой отдельный зрачок)
  const ey = y - r * 0.46, er = r * 0.34, lookY = Math.sin(ph * 1.3) * 0.07;
  for (const s2 of [-1, 1]) {
    const exx = x + s2 * r * 0.33;
    g.fillStyle = "#fbfdff";
    g.beginPath(); g.arc(exx, ey, er, 0, TAU); g.fill();
    g.strokeStyle = shade(C, 0.5); g.lineWidth = Math.max(1.7, r * 0.07); g.stroke();
  }
  for (const s2 of [-1, 1]) {
    const exx = x + s2 * r * 0.33;
    const px = exx - s2 * r * 0.09, py = ey + r * 0.07 + lookY * r;
    g.fillStyle = "#242b39";
    g.beginPath(); g.arc(px, py, r * 0.16, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.beginPath(); g.arc(px - r * 0.06, py - r * 0.06, r * 0.055, 0, TAU); g.fill();
  }
  // бровки
  g.strokeStyle = shade(C, 0.45); g.lineWidth = Math.max(1.5, r * 0.055);
  g.beginPath(); g.moveTo(x - r * 0.62, ey - r * 0.28); g.lineTo(x - r * 0.36, ey - r * 0.4);
  g.moveTo(x + r * 0.62, ey - r * 0.28); g.lineTo(x + r * 0.36, ey - r * 0.4); g.stroke();
  const CN = "#5fc247";
  // светлое пузико
  g.fillStyle = "rgba(255,255,255,0.12)";
  g.beginPath(); g.ellipse(x, y + r * 0.62, r * 0.36, r * 0.26, 0, 0, TAU); g.fill();
  // маленькие ушки-рожки
  g.fillStyle = shade(CN, 0.88); g.strokeStyle = shade(CN, 0.5); g.lineWidth = Math.max(1.3, r * 0.045);
  for (const s3 of [-1, 1]) {
    g.beginPath(); g.moveTo(x + s3 * r * 0.5, y - r * 0.66); g.quadraticCurveTo(x + s3 * r * 0.72, y - r * 0.98, x + s3 * r * 0.3, y - r * 0.86); g.closePath(); g.fill(); g.stroke();
  }
  // блик на макушке
  gloss(g, x - r * 0.34, y - r * 0.72, r * 0.16, r * 0.09, 0.26, -0.5);
}
function drawSigma(g, x, y, r, ph) {
  const C = "#f0a04b";
  g.lineJoin = "round"; g.lineCap = "round";
  // тело
  g.fillStyle = radial(g, x, y + r * 0.4, r * 0.1, x, y + r * 0.6, r * 0.9, [[0, shade(C, 1.2)], [1, shade(C, 0.78)]]);
  g.beginPath(); g.ellipse(x, y + r * 0.62, r * 0.5, r * 0.42, 0, 0, TAU); g.fill();
  g.strokeStyle = shade(C, 0.5); g.lineWidth = Math.max(1.6, r * 0.07); g.stroke();
  // хвост
  g.strokeStyle = C; g.lineWidth = r * 0.17;
  g.beginPath(); g.moveTo(x + r * 0.45, y + r * 0.72); g.quadraticCurveTo(x + r * 1.05, y + r * 0.5, x + r * 0.85, y - r * 0.05); g.stroke();
  g.strokeStyle = shade(C, 0.7); g.lineWidth = r * 0.06;
  g.beginPath(); g.moveTo(x + r * 0.9, y + r * 0.2); g.lineTo(x + r * 0.82, y + r * 0.08); g.stroke();
  // золотая цепь
  g.fillStyle = PAL.gold;
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(x + i * r * 0.15, y + r * 0.44 + Math.abs(i) * r * 0.03, r * 0.05, 0, TAU); g.fill(); }
  // уши
  for (const s2 of [-1, 1]) {
    g.fillStyle = C; g.strokeStyle = shade(C, 0.5); g.lineWidth = Math.max(1.6, r * 0.06);
    g.beginPath(); g.moveTo(x + s2 * r * 0.62, y - r * 0.2); g.lineTo(x + s2 * r * 0.42, y - r * 0.92); g.lineTo(x + s2 * r * 0.1, y - r * 0.42); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#ffb6c1"; g.beginPath(); g.moveTo(x + s2 * r * 0.48, y - r * 0.3); g.lineTo(x + s2 * r * 0.4, y - r * 0.68); g.lineTo(x + s2 * r * 0.22, y - r * 0.42); g.closePath(); g.fill();
  }
  // голова
  g.fillStyle = radial(g, x - r * 0.25, y - r * 0.35, r * 0.08, x, y - r * 0.08, r * 0.85, [[0, shade(C, 1.25)], [0.7, C], [1, shade(C, 0.8)]]);
  g.beginPath(); g.arc(x, y - r * 0.05, r * 0.72, 0, TAU); g.fill();
  g.strokeStyle = shade(C, 0.5); g.lineWidth = Math.max(1.7, r * 0.07); g.stroke();
  // полоски
  g.strokeStyle = shade(C, 0.72); g.lineWidth = Math.max(1.4, r * 0.055);
  g.beginPath();
  g.moveTo(x - r * 0.12, y - r * 0.72); g.lineTo(x - r * 0.06, y - r * 0.52);
  g.moveTo(x + r * 0.12, y - r * 0.72); g.lineTo(x + r * 0.06, y - r * 0.52);
  g.moveTo(x, y - r * 0.76); g.lineTo(x, y - r * 0.54); g.stroke();
  // солнцезащитные очки
  g.fillStyle = "#14161c";
  g.beginPath();
  g.moveTo(x - r * 0.62, y - r * 0.26);
  g.lineTo(x + r * 0.62, y - r * 0.26);
  g.lineTo(x + r * 0.5, y - r * 0.02);
  g.quadraticCurveTo(x + r * 0.28, y + r * 0.12, x + r * 0.12, y - r * 0.06);
  g.lineTo(x - r * 0.12, y - r * 0.06);
  g.quadraticCurveTo(x - r * 0.28, y + r * 0.12, x - r * 0.5, y - r * 0.02);
  g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = Math.max(1.5, r * 0.045);
  g.beginPath(); g.moveTo(x - r * 0.46, y - r * 0.19); g.lineTo(x - r * 0.28, y - r * 0.15); g.stroke();
  // нос
  g.fillStyle = "#7a4a2a"; g.beginPath(); g.moveTo(x, y + r * 0.12); g.lineTo(x - r * 0.08, y + r * 0.2); g.lineTo(x + r * 0.08, y + r * 0.2); g.closePath(); g.fill();
  // смуглая ухмылка
  g.strokeStyle = shade(C, 0.5); g.lineWidth = Math.max(1.5, r * 0.05);
  g.beginPath();
  g.moveTo(x, y + r * 0.2); g.lineTo(x, y + r * 0.28);
  g.moveTo(x - r * 0.18, y + r * 0.3); g.quadraticCurveTo(x - r * 0.02, y + r * 0.3, x, y + r * 0.28);
  g.moveTo(x, y + r * 0.28); g.quadraticCurveTo(x + r * 0.06, y + r * 0.36, x + r * 0.2, y + r * 0.28); g.stroke();
  // усы
  g.strokeStyle = "rgba(255,255,255,0.72)"; g.lineWidth = Math.max(1, r * 0.028);
  for (const s2 of [-1, 1]) {
    g.beginPath(); g.moveTo(x + s2 * r * 0.1, y + r * 0.16); g.lineTo(x + s2 * r * 0.62, y + r * 0.1);
    g.moveTo(x + s2 * r * 0.1, y + r * 0.22); g.lineTo(x + s2 * r * 0.62, y + r * 0.24); g.stroke();
  }
  const CS = "#f0a04b";
  // передние лапки
  g.fillStyle = shade(CS, 1.08); g.strokeStyle = shade(CS, 0.5); g.lineWidth = Math.max(1.3, r * 0.05);
  for (const s3 of [-1, 1]) {
    g.beginPath(); g.ellipse(x + s3 * r * 0.26, y + r * 0.95, r * 0.17, r * 0.11, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = shade(CS, 0.62); g.lineWidth = Math.max(1, r * 0.025);
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + s3 * r * 0.26 + k * r * 0.06, y + r * 0.9); g.lineTo(x + s3 * r * 0.26 + k * r * 0.07, y + r * 0.99); g.stroke(); }
    g.strokeStyle = shade(CS, 0.5); g.lineWidth = Math.max(1.3, r * 0.05);
  }
  // полоски на теле и хвосте
  g.strokeStyle = shade(CS, 0.72); g.lineWidth = Math.max(1.2, r * 0.05); g.lineCap = "round";
  g.beginPath(); g.moveTo(x - r * 0.34, y + r * 0.5); g.lineTo(x - r * 0.2, y + r * 0.56);
  g.moveTo(x - r * 0.3, y + r * 0.72); g.lineTo(x - r * 0.16, y + r * 0.76); g.stroke();
  g.beginPath(); g.moveTo(x + r * 0.94, y + r * 0.34); g.lineTo(x + r * 0.8, y + r * 0.3);
  g.moveTo(x + r * 0.92, y + r * 0.02); g.lineTo(x + r * 0.78, y + r * 0.06); g.stroke();
  // подвеска на цепи
  g.fillStyle = PAL.gold; g.strokeStyle = shade("#c98f16", 0.9); g.lineWidth = Math.max(1, r * 0.025);
  g.beginPath(); g.moveTo(x, y + r * 0.56); g.lineTo(x + r * 0.07, y + r * 0.66); g.lineTo(x, y + r * 0.76); g.lineTo(x - r * 0.07, y + r * 0.66); g.closePath(); g.fill(); g.stroke();
  // пух на щеках — короткие штрихи внутри силуэта, контур головы остаётся чистым
  g.strokeStyle = shade(CS, 0.8); g.lineWidth = Math.max(1, r * 0.022); g.lineCap = "round";
  for (const s4 of [-1, 1]) for (let i = 0; i < 3; i++) {
    const yy = y + r * (0.02 + i * 0.12);
    g.beginPath(); g.moveTo(x + s4 * r * 0.5, yy); g.lineTo(x + s4 * r * (0.62 - i * 0.03), yy + r * 0.05); g.stroke();
  }
  // второй блик на очках
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = Math.max(1, r * 0.03);
  g.beginPath(); g.moveTo(x + r * 0.16, y - r * 0.19); g.lineTo(x + r * 0.32, y - r * 0.15); g.stroke();
}
function drawBoss(g, x, y, r, ph) {
  const C = "#d0409a", bl = blinkOf(ph);
  const sway = Math.sin(ph * 2) * r * 0.1;
  g.lineJoin = "round"; g.lineCap = "round";
  // когтистые руки
  g.strokeStyle = shade(C, 0.55); g.lineWidth = r * 0.2;
  g.beginPath(); g.moveTo(x - r * 0.7, y); g.quadraticCurveTo(x - r * 1.18, y + r * 0.3, x - r * 0.95 + sway, y + r * 0.8); g.stroke();
  g.beginPath(); g.moveTo(x + r * 0.7, y); g.quadraticCurveTo(x + r * 1.18, y + r * 0.3, x + r * 0.95 - sway, y + r * 0.8); g.stroke();
  for (const hx of [x - r * 0.95 + sway, x + r * 0.95 - sway]) {
    g.fillStyle = C; g.beginPath(); g.arc(hx, y + r * 0.82, r * 0.17, 0, TAU); g.fill();
    g.strokeStyle = shade(C, 0.45); g.lineWidth = Math.max(1.6, r * 0.05); g.stroke();
    g.fillStyle = "#efeff5";
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(hx + k * r * 0.1, y + r * 0.9); g.lineTo(hx + k * r * 0.1 + r * 0.02, y + r * 1.05); g.lineTo(hx + k * r * 0.1 + r * 0.08, y + r * 0.92); g.closePath(); g.fill(); }
  }
  // рога
  g.fillStyle = "#3a2340"; g.strokeStyle = shade(C, 0.4); g.lineWidth = Math.max(1.6, r * 0.05);
  for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(x + s2 * r * 0.5, y - r * 0.58); g.quadraticCurveTo(x + s2 * r * 0.88, y - r * 0.9, x + s2 * r * 0.72, y - r * 1.16); g.quadraticCurveTo(x + s2 * r * 0.5, y - r * 0.86, x + s2 * r * 0.3, y - r * 0.6); g.closePath(); g.fill(); g.stroke(); }
  // тело меховое
  g.fillStyle = radial(g, x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.25, [[0, shade(C, 1.3)], [0.55, C], [1, shade(C, 0.66)]]);
  g.beginPath(); furBlob(g, x, y, r * 0.94, r * 0.94, 26, ph); g.fill();
  g.strokeStyle = shade(C, 0.42); g.lineWidth = Math.max(2, r * 0.065); g.stroke();
  // корона
  g.fillStyle = PAL.gold; g.strokeStyle = shade(PAL.gold, 0.6); g.lineWidth = Math.max(1.6, r * 0.045);
  g.beginPath();
  g.moveTo(x - r * 0.5, y - r * 0.62);
  g.lineTo(x - r * 0.5, y - r * 0.98); g.lineTo(x - r * 0.25, y - r * 0.74);
  g.lineTo(x, y - r * 1.1); g.lineTo(x + r * 0.25, y - r * 0.74);
  g.lineTo(x + r * 0.5, y - r * 0.98); g.lineTo(x + r * 0.5, y - r * 0.62);
  g.closePath(); g.fill(); g.stroke();
  for (const gx of [-0.5, 0, 0.5]) { g.fillStyle = "#ff5a7a"; g.beginPath(); g.arc(x + gx * r, y - (gx === 0 ? 1.1 : 0.98) * r, r * 0.05, 0, TAU); g.fill(); }
  // светящиеся глаза
  g.save(); g.shadowColor = "#ffe08a"; g.shadowBlur = r * 0.4;
  g.fillStyle = "#fff2a8";
  g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.16, r * 0.22, r * 0.26 * bl, 0, 0, TAU); g.ellipse(x + r * 0.3, y - r * 0.16, r * 0.22, r * 0.26 * bl, 0, 0, TAU); g.fill();
  g.restore();
  g.fillStyle = "#c81e5a";
  g.beginPath(); g.arc(x - r * 0.3, y - r * 0.12, r * 0.1, 0, TAU); g.arc(x + r * 0.3, y - r * 0.12, r * 0.1, 0, TAU); g.fill();
  // злые брови
  g.strokeStyle = shade(C, 0.4); g.lineWidth = Math.max(2, r * 0.07);
  g.beginPath(); g.moveTo(x - r * 0.54, y - r * 0.48); g.lineTo(x - r * 0.13, y - r * 0.3);
  g.moveTo(x + r * 0.54, y - r * 0.48); g.lineTo(x + r * 0.13, y - r * 0.3); g.stroke();
  // пасть с клыками
  g.save();
  g.fillStyle = "#4a0f1a";
  g.beginPath(); g.ellipse(x, y + r * 0.36, r * 0.5, r * 0.3, 0, 0, TAU); g.fill();
  g.clip();
  teethRow(g, x - r * 0.5, x + r * 0.5, y + r * 0.12, r * 0.22, 7, true);
  teethRow(g, x - r * 0.5, x + r * 0.5, y + r * 0.6, r * 0.22, 7, false);
  g.fillStyle = "#c33"; g.beginPath(); g.ellipse(x, y + r * 0.5, r * 0.26, r * 0.12, 0, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = shade(C, 0.42); g.lineWidth = Math.max(1.7, r * 0.05);
  g.beginPath(); g.ellipse(x, y + r * 0.36, r * 0.5, r * 0.3, 0, 0, TAU); g.stroke();
  const CBs = "#d0409a";
  // рубцы на рогах
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = Math.max(1, r * 0.022);
  for (const s3 of [-1, 1]) for (let i = 0; i < 3; i++) {
    const t = 0.3 + i * 0.22;
    g.beginPath();
    g.moveTo(x + s3 * r * (0.52 + t * 0.22), y - r * (0.62 + t * 0.5));
    g.lineTo(x + s3 * r * (0.36 + t * 0.2), y - r * (0.6 + t * 0.42)); g.stroke();
  }
  // блеск короны
  gloss(g, x - r * 0.34, y - r * 0.82, r * 0.1, r * 0.05, 0.45, -0.5);
  // чешуйки-пластины на теле
  speckles(g, x - r * 0.62, y + r * 0.06, r * 0.18, r * 0.4, 5, 41, "rgba(255,255,255,0.12)", r * 0.055);
  speckles(g, x + r * 0.62, y + r * 0.1, r * 0.18, r * 0.4, 5, 43, "rgba(255,255,255,0.12)", r * 0.055);
  // когти на лапах
  const swayB = Math.sin(ph * 2) * r * 0.1;
  g.strokeStyle = "#ffe6f4"; g.lineWidth = Math.max(1.1, r * 0.03);
  for (const hx of [x - r * 0.95 + swayB, x + r * 0.95 - swayB]) {
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(hx + k * r * 0.1, y + r * 0.96); g.lineTo(hx + k * r * 0.12, y + r * 1.05); g.stroke(); }
  }
  // тлеющие искры вокруг силуэта
  g.fillStyle = "rgba(255,150,215," + (0.3 + Math.sin(ph * 2) * 0.12).toFixed(3) + ")";
  for (let i = 0; i < 5; i++) {
    const a = ph * 0.7 + i * TAU / 5, rr2 = r * (1.04 + Math.sin(ph * 2 + i) * 0.05);
    g.beginPath(); g.arc(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2 * 0.92, r * 0.045, 0, TAU); g.fill();
  }
}
function drawHamster(g, x, y, r, ph) {
  const C = "#e0a86a";
  g.lineJoin = "round"; g.lineCap = "round";
  // ушки
  g.fillStyle = shade(C, 0.9); g.strokeStyle = shade(C, 0.55); g.lineWidth = Math.max(1.5, r * 0.06);
  for (const s2 of [-1, 1]) { g.beginPath(); g.arc(x + s2 * r * 0.45, y - r * 0.6, r * 0.2, 0, TAU); g.fill(); g.stroke(); }
  // тело
  g.fillStyle = radial(g, x - r * 0.25, y - r * 0.3, r * 0.1, x, y + r * 0.1, r * 1.0, [[0, shade(C, 1.35)], [0.6, C], [1, shade(C, 0.72)]]);
  g.beginPath(); g.ellipse(x, y + r * 0.12, r * 0.78, r * 0.82, 0, 0, TAU); g.fill();
  g.strokeStyle = shade(C, 0.5); g.lineWidth = Math.max(1.6, r * 0.07); g.stroke();
  // светлая мордочка/живот
  g.fillStyle = shade(C, 1.3); g.beginPath(); g.ellipse(x, y + r * 0.28, r * 0.5, r * 0.52, 0, 0, TAU); g.fill();
  // толстые щёчки
  g.fillStyle = shade(C, 1.18);
  g.beginPath(); g.arc(x - r * 0.42, y + r * 0.18, r * 0.26, 0, TAU); g.arc(x + r * 0.42, y + r * 0.18, r * 0.26, 0, TAU); g.fill();
  // огромные чёрные блестящие глаза
  const ey = y - r * 0.16;
  g.fillStyle = "#141821";
  g.beginPath(); g.arc(x - r * 0.28, ey, r * 0.24, 0, TAU); g.arc(x + r * 0.28, ey, r * 0.24, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,0.95)";
  g.beginPath(); g.arc(x - r * 0.34, ey - r * 0.08, r * 0.09, 0, TAU); g.arc(x + r * 0.22, ey - r * 0.08, r * 0.09, 0, TAU); g.fill();
  g.beginPath(); g.arc(x - r * 0.22, ey + r * 0.06, r * 0.04, 0, TAU); g.arc(x + r * 0.34, ey + r * 0.06, r * 0.04, 0, TAU); g.fill();
  // носик + рот
  g.fillStyle = "#d16b7a"; g.beginPath(); g.ellipse(x, y + r * 0.08, r * 0.06, r * 0.045, 0, 0, TAU); g.fill();
  g.strokeStyle = shade(C, 0.5); g.lineWidth = Math.max(1.3, r * 0.04);
  g.beginPath(); g.moveTo(x, y + r * 0.13); g.lineTo(x, y + r * 0.2);
  g.moveTo(x, y + r * 0.2); g.arc(x - r * 0.07, y + r * 0.18, r * 0.07, 0.1 * TAU, 0.3 * TAU);
  g.moveTo(x, y + r * 0.2); g.arc(x + r * 0.07, y + r * 0.18, r * 0.07, 0.2 * TAU, 0.4 * TAU, true); g.stroke();
  // передние зубки
  g.fillStyle = "#fff"; g.fillRect(x - r * 0.05, y + r * 0.2, r * 0.1, r * 0.09);
  g.strokeStyle = shade(C, 0.5); g.beginPath(); g.moveTo(x, y + r * 0.2); g.lineTo(x, y + r * 0.29); g.stroke();
  // лапки
  g.fillStyle = shade(C, 0.8);
  g.beginPath(); g.ellipse(x - r * 0.22, y + r * 0.82, r * 0.12, r * 0.08, 0, 0, TAU); g.ellipse(x + r * 0.22, y + r * 0.82, r * 0.12, r * 0.08, 0, 0, TAU); g.fill();
  const CH = "#e0a86a";
  // внутреннее ухо и пух по краю
  g.fillStyle = "rgba(214,140,140,0.55)";
  for (const s3 of [-1, 1]) { g.beginPath(); g.arc(x + s3 * r * 0.45, y - r * 0.6, r * 0.1, 0, TAU); g.fill(); }
  furTufts(g, x, y + r * 0.12, r * 0.78, r * 0.82, Math.PI * 1.08, Math.PI * 1.92, 9, r * 0.05, shade(CH, 0.72), Math.max(1, r * 0.025), 12);
  // лапки держат зёрнышко
  g.fillStyle = shade(CH, 1.2); g.strokeStyle = shade(CH, 0.55); g.lineWidth = Math.max(1.2, r * 0.035);
  for (const s3 of [-1, 1]) { g.beginPath(); g.ellipse(x + s3 * r * 0.17, y + r * 0.6, r * 0.11, r * 0.09, s3 * 0.3, 0, TAU); g.fill(); g.stroke(); }
  g.fillStyle = "#c98f4e"; g.strokeStyle = "#8f6231";
  g.beginPath(); g.ellipse(x, y + r * 0.58, r * 0.09, r * 0.07, 0.3, 0, TAU); g.fill(); g.stroke();
  // румянец на щеках
  g.fillStyle = "rgba(228,130,130,0.28)";
  g.beginPath(); g.ellipse(x - r * 0.5, y + r * 0.26, r * 0.12, r * 0.08, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(x + r * 0.5, y + r * 0.26, r * 0.12, r * 0.08, 0, 0, TAU); g.fill();
  // шерсть на щёчках
  g.strokeStyle = shade(CH, 0.78); g.lineWidth = Math.max(1, r * 0.02);
  for (const s3 of [-1, 1]) for (let i = 0; i < 3; i++) {
    const yy = y + r * (0.08 + i * 0.1);
    g.beginPath(); g.moveTo(x + s3 * r * 0.5, yy); g.lineTo(x + s3 * r * 0.62, yy + r * 0.03); g.stroke();
  }
  gloss(g, x - r * 0.3, y - r * 0.5, r * 0.18, r * 0.1, 0.2, -0.5);
}
function drawChill(g, x, y, r, ph) {
  const fur = "#d3a869", sweater = "#c3c9d4", jeans = "#a6ccdd", shoe = "#e0533a";
  g.lineJoin = "round"; g.lineCap = "round";
  // красные кроссовки с белой подошвой
  for (const s2 of [-1, 1]) {
    g.fillStyle = shoe; g.strokeStyle = shade(shoe, 0.62); g.lineWidth = Math.max(1.4, r * 0.05);
    rr(g, x + s2 * r * 0.24 - r * 0.21, y + r * 0.82, r * 0.42, r * 0.19, r * 0.09); g.fill(); g.stroke();
    g.fillStyle = "#f4f6fa"; rr(g, x + s2 * r * 0.24 - r * 0.21, y + r * 0.95, r * 0.42, r * 0.07, r * 0.03); g.fill();
  }
  // джинсы
  g.fillStyle = jeans; g.strokeStyle = shade(jeans, 0.62); g.lineWidth = Math.max(1.5, r * 0.05);
  for (const s2 of [-1, 1]) { rr(g, x + s2 * r * 0.24 - r * 0.16, y + r * 0.4, r * 0.32, r * 0.48, r * 0.1); g.fill(); g.stroke(); }
  g.strokeStyle = shade(jeans, 0.7); g.lineWidth = Math.max(1, r * 0.03);
  for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(x + s2 * r * 0.24, y + r * 0.5); g.lineTo(x + s2 * r * 0.24, y + r * 0.84); g.stroke(); }
  // свитер (руки в карманах)
  g.fillStyle = radial(g, x - r * 0.2, y - r * 0.05, r * 0.1, x, y + r * 0.2, r * 1.0, [[0, shade(sweater, 1.12)], [1, shade(sweater, 0.82)]]);
  g.beginPath();
  g.moveTo(x - r * 0.5, y + r * 0.5);
  g.quadraticCurveTo(x - r * 0.58, y - r * 0.12, x - r * 0.3, y - r * 0.2);
  g.lineTo(x + r * 0.3, y - r * 0.2);
  g.quadraticCurveTo(x + r * 0.58, y - r * 0.12, x + r * 0.5, y + r * 0.5);
  g.closePath(); g.fill();
  g.strokeStyle = shade(sweater, 0.55); g.lineWidth = Math.max(1.6, r * 0.055); g.stroke();
  // резинка снизу + вязка
  g.strokeStyle = shade(sweater, 0.62); g.lineWidth = Math.max(1.2, r * 0.03);
  g.beginPath(); g.moveTo(x - r * 0.46, y + r * 0.42); g.lineTo(x + r * 0.46, y + r * 0.42); g.stroke();
  // руки в карманах (складки)
  g.beginPath(); g.moveTo(x - r * 0.3, y + r * 0.08); g.lineTo(x - r * 0.14, y + r * 0.34);
  g.moveTo(x + r * 0.3, y + r * 0.08); g.lineTo(x + r * 0.14, y + r * 0.34); g.stroke();
  // уши (пёсьи)
  g.fillStyle = shade(fur, 0.9); g.strokeStyle = shade(fur, 0.58); g.lineWidth = Math.max(1.4, r * 0.045);
  for (const s2 of [-1, 1]) {
    g.beginPath(); g.moveTo(x + s2 * r * 0.3, y - r * 0.74); g.quadraticCurveTo(x + s2 * r * 0.6, y - r * 1.04, x + s2 * r * 0.48, y - r * 0.64); g.closePath(); g.fill(); g.stroke();
  }
  // голова
  g.fillStyle = radial(g, x - r * 0.14, y - r * 0.64, r * 0.06, x, y - r * 0.46, r * 0.6, [[0, shade(fur, 1.14)], [1, shade(fur, 0.9)]]);
  g.beginPath(); g.arc(x, y - r * 0.46, r * 0.44, 0, TAU); g.fill();
  g.strokeStyle = shade(fur, 0.58); g.lineWidth = Math.max(1.5, r * 0.05); g.stroke();
  // морда + чёрный нос
  g.fillStyle = shade(fur, 1.06);
  g.beginPath(); g.ellipse(x, y - r * 0.28, r * 0.27, r * 0.2, 0, 0, TAU); g.fill();
  g.fillStyle = "#241d18";
  g.beginPath(); g.ellipse(x, y - r * 0.35, r * 0.15, r * 0.12, 0, 0, TAU); g.fill();
  // расслабленные полуприкрытые глаза
  g.strokeStyle = "#3a2f27"; g.lineWidth = Math.max(1.6, r * 0.05);
  g.beginPath(); g.arc(x - r * 0.17, y - r * 0.54, r * 0.12, Math.PI * 0.08, Math.PI * 0.92);
  g.arc(x + r * 0.17, y - r * 0.54, r * 0.12, Math.PI * 0.08, Math.PI * 0.92); g.stroke();
  g.fillStyle = "#2a2119";
  g.beginPath(); g.arc(x - r * 0.17, y - r * 0.5, r * 0.045, 0, TAU); g.arc(x + r * 0.17, y - r * 0.5, r * 0.045, 0, TAU); g.fill();
  // спокойные брови
  g.strokeStyle = shade(fur, 0.5); g.lineWidth = Math.max(1.3, r * 0.04);
  g.beginPath(); g.moveTo(x - r * 0.28, y - r * 0.68); g.lineTo(x - r * 0.08, y - r * 0.7);
  g.moveTo(x + r * 0.08, y - r * 0.7); g.lineTo(x + r * 0.28, y - r * 0.68); g.stroke();
  // лёгкая ухмылка
  g.strokeStyle = "#6b4a34"; g.lineWidth = Math.max(1.4, r * 0.045);
  g.beginPath(); g.moveTo(x - r * 0.02, y - r * 0.2); g.quadraticCurveTo(x + r * 0.16, y - r * 0.15, x + r * 0.24, y - r * 0.24); g.stroke();
  // румяные щёки
  g.fillStyle = "rgba(230,120,110,0.32)";
  g.beginPath(); g.arc(x - r * 0.3, y - r * 0.32, r * 0.09, 0, TAU); g.arc(x + r * 0.3, y - r * 0.32, r * 0.09, 0, TAU); g.fill();
  const sw = "#c3c9d4", jn = "#a6ccdd";
  // ворот худи
  g.strokeStyle = shade(sw, 0.55); g.lineWidth = Math.max(1.3, r * 0.04);
  g.beginPath(); g.moveTo(x - r * 0.3, y - r * 0.17); g.quadraticCurveTo(x, y - r * 0.04, x + r * 0.3, y - r * 0.17); g.stroke();
  // шнурки худи
  g.strokeStyle = "#f2f5fa"; g.lineWidth = Math.max(1.2, r * 0.035);
  g.beginPath(); g.moveTo(x - r * 0.12, y - r * 0.1); g.quadraticCurveTo(x - r * 0.16, y + r * 0.08, x - r * 0.1, y + r * 0.18);
  g.moveTo(x + r * 0.12, y - r * 0.1); g.quadraticCurveTo(x + r * 0.16, y + r * 0.08, x + r * 0.1, y + r * 0.18); g.stroke();
  g.fillStyle = "#e8ecf3";
  g.beginPath(); g.arc(x - r * 0.1, y + r * 0.2, r * 0.035, 0, TAU); g.arc(x + r * 0.1, y + r * 0.2, r * 0.035, 0, TAU); g.fill();
  // карман-кенгуру
  g.strokeStyle = shade(sw, 0.62); g.lineWidth = Math.max(1.1, r * 0.03);
  g.beginPath(); g.moveTo(x - r * 0.34, y + r * 0.16); g.quadraticCurveTo(x, y + r * 0.3, x + r * 0.34, y + r * 0.16); g.stroke();
  // фактура вязки
  speckles(g, x, y + r * 0.1, r * 0.36, r * 0.24, 8, 21, "rgba(255,255,255,0.13)", r * 0.03);
  // шнуровка на кроссовках
  g.strokeStyle = "#f4f6fa"; g.lineWidth = Math.max(1, r * 0.022);
  for (const s3 of [-1, 1]) for (let i = 0; i < 2; i++) {
    const bx0 = x + s3 * r * 0.24 - r * 0.12 + i * r * 0.1;
    g.beginPath(); g.moveTo(bx0, y + r * 0.86); g.lineTo(bx0 + r * 0.08, y + r * 0.92); g.stroke();
  }
  // швы на джинсах
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = Math.max(1, r * 0.018);
  for (const s3 of [-1, 1]) { g.beginPath(); g.moveTo(x + s3 * r * 0.38, y + r * 0.46); g.lineTo(x + s3 * r * 0.38, y + r * 0.8); g.stroke(); }
}
function drawHealer(g, x, y, r, ph) {
  const C = "#b7bdc6";
  g.lineJoin = "round"; g.lineCap = "round";
  // грушевидное серое тело (спокойный «ждущий» блоб)
  g.fillStyle = radial(g, x - r * 0.24, y - r * 0.3, r * 0.1, x, y + r * 0.2, r * 1.1, [[0, shade(C, 1.18)], [0.6, C], [1, shade(C, 0.76)]]);
  g.beginPath();
  g.moveTo(x - r * 0.72, y + r * 0.88);
  g.quadraticCurveTo(x - r * 0.98, y + r * 0.1, x - r * 0.34, y - r * 0.5);
  g.quadraticCurveTo(x, y - r * 0.7, x + r * 0.34, y - r * 0.5);
  g.quadraticCurveTo(x + r * 0.98, y + r * 0.1, x + r * 0.72, y + r * 0.88);
  g.quadraticCurveTo(x, y + r * 1.04, x - r * 0.72, y + r * 0.88);
  g.closePath(); g.fill();
  g.strokeStyle = shade(C, 0.6); g.lineWidth = Math.max(1.7, r * 0.06); g.stroke();
  // гладкая голова
  g.fillStyle = radial(g, x - r * 0.12, y - r * 0.72, r * 0.05, x, y - r * 0.55, r * 0.55, [[0, shade(C, 1.2)], [1, shade(C, 0.88)]]);
  g.beginPath(); g.ellipse(x, y - r * 0.55, r * 0.4, r * 0.42, 0, 0, TAU); g.fill();
  g.strokeStyle = shade(C, 0.6); g.lineWidth = Math.max(1.5, r * 0.05); g.stroke();
  // длинный тупой нос-хоботок
  g.fillStyle = shade(C, 1.03);
  g.beginPath(); g.ellipse(x, y - r * 0.28, r * 0.19, r * 0.24, 0, 0, TAU); g.fill(); g.stroke();
  // маленькие спокойные глазки
  g.fillStyle = "#3a4048";
  g.beginPath(); g.arc(x - r * 0.16, y - r * 0.66, r * 0.055, 0, TAU); g.arc(x + r * 0.16, y - r * 0.66, r * 0.055, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,0.8)";
  g.beginPath(); g.arc(x - r * 0.175, y - r * 0.675, r * 0.02, 0, TAU); g.arc(x + r * 0.145, y - r * 0.675, r * 0.02, 0, TAU); g.fill();
  // сложенные ласты-ручки на животе
  g.fillStyle = shade(C, 0.92); g.strokeStyle = shade(C, 0.6); g.lineWidth = Math.max(1.4, r * 0.045);
  g.beginPath(); g.ellipse(x - r * 0.26, y + r * 0.5, r * 0.34, r * 0.15, 0.42, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(x + r * 0.26, y + r * 0.5, r * 0.34, r * 0.15, -0.42, 0, TAU); g.fill(); g.stroke();
  // маленький медицинский значок — роль лекаря
  g.fillStyle = "#e8f6ee"; g.strokeStyle = "#4fae7a"; g.lineWidth = Math.max(1.3, r * 0.045);
  g.beginPath(); g.arc(x, y + r * 0.12, r * 0.17, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#4fae7a";
  g.fillRect(x - r * 0.035, y + r * 0.02, r * 0.07, r * 0.2);
  g.fillRect(x - r * 0.09, y + r * 0.075, r * 0.18, r * 0.07);
  const CHl = "#b7bdc6";
  // мягкие складки на теле и блик
  g.strokeStyle = "rgba(90,100,115,0.25)"; g.lineWidth = Math.max(1, r * 0.025); g.lineCap = "round";
  g.beginPath(); g.moveTo(x - r * 0.5, y + r * 0.74); g.quadraticCurveTo(x, y + r * 0.86, x + r * 0.5, y + r * 0.74); g.stroke();
  g.beginPath(); g.moveTo(x - r * 0.42, y + r * 0.9); g.quadraticCurveTo(x, y + r * 1.0, x + r * 0.42, y + r * 0.9); g.stroke();
  gloss(g, x - r * 0.3, y - r * 0.66, r * 0.16, r * 0.1, 0.3, -0.55);
  gloss(g, x - r * 0.46, y + r * 0.28, r * 0.08, r * 0.26, 0.16, -0.12);
  // сестринская шапочка с крестом
  g.fillStyle = "#f6fbff"; g.strokeStyle = "#9fb0c8"; g.lineWidth = Math.max(1.2, r * 0.035);
  g.beginPath(); g.moveTo(x - r * 0.26, y - r * 0.86); g.lineTo(x + r * 0.26, y - r * 0.86);
  g.lineTo(x + r * 0.2, y - r * 1.02); g.lineTo(x - r * 0.2, y - r * 1.02); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#4fae7a";
  g.fillRect(x - r * 0.025, y - r * 0.99, r * 0.05, r * 0.1);
  g.fillRect(x - r * 0.06, y - r * 0.965, r * 0.12, r * 0.05);
  // щёчки и спокойная улыбка
  g.fillStyle = "rgba(210,130,130,0.22)";
  g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.5, r * 0.1, r * 0.07, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(x + r * 0.3, y - r * 0.5, r * 0.1, r * 0.07, 0, 0, TAU); g.fill();
  // лёгкое лечебное свечение вокруг значка
  g.fillStyle = "rgba(79,174,122,0.16)";
  g.beginPath(); g.arc(x, y + r * 0.12, r * 0.26 + Math.sin(ph * 2) * r * 0.02, 0, TAU); g.fill();
}
function drawBooster(g, x, y, r, ph) {
  const fur = "#e6a24e", cup = "#2f3b57", accent = "#ffd05a", bow = "#ff7aa8";
  g.lineJoin = "round"; g.lineCap = "round";
  // линии скорости (ускоряет союзников)
  g.strokeStyle = "rgba(255,220,120,0.7)"; g.lineWidth = Math.max(1.5, r * 0.05);
  for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x - r * 0.95, y + r * 0.15 + i * r * 0.26); g.lineTo(x - r * 1.4, y + r * 0.15 + i * r * 0.26); g.stroke(); }
  // хвост
  g.strokeStyle = fur; g.lineWidth = r * 0.15;
  g.beginPath(); g.moveTo(x + r * 0.4, y + r * 0.72); g.quadraticCurveTo(x + r * 1.02, y + r * 0.55, x + r * 0.82, y - r * 0.02); g.stroke();
  // тело кота (сидит)
  g.fillStyle = radial(g, x - r * 0.2, y + r * 0.2, r * 0.1, x, y + r * 0.5, r * 0.9, [[0, shade(fur, 1.18)], [0.6, fur], [1, shade(fur, 0.78)]]);
  g.beginPath(); g.ellipse(x, y + r * 0.52, r * 0.5, r * 0.44, 0, 0, TAU); g.fill();
  g.strokeStyle = shade(fur, 0.55); g.lineWidth = Math.max(1.6, r * 0.06); g.stroke();
  g.fillStyle = shade(fur, 1.25); g.beginPath(); g.ellipse(x, y + r * 0.62, r * 0.24, r * 0.3, 0, 0, TAU); g.fill();
  g.fillStyle = fur; g.strokeStyle = shade(fur, 0.55); g.lineWidth = Math.max(1.4, r * 0.045);
  for (const s2 of [-1, 1]) { g.beginPath(); g.ellipse(x + s2 * r * 0.2, y + r * 0.88, r * 0.15, r * 0.1, 0, 0, TAU); g.fill(); g.stroke(); }
  // уши
  g.fillStyle = fur;
  for (const s2 of [-1, 1]) {
    g.beginPath(); g.moveTo(x + s2 * r * 0.34, y - r * 0.42); g.lineTo(x + s2 * r * 0.5, y - r * 0.82); g.lineTo(x + s2 * r * 0.12, y - r * 0.58); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#ffb6c1"; g.beginPath(); g.moveTo(x + s2 * r * 0.34, y - r * 0.46); g.lineTo(x + s2 * r * 0.44, y - r * 0.72); g.lineTo(x + s2 * r * 0.2, y - r * 0.56); g.closePath(); g.fill(); g.fillStyle = fur;
  }
  // голова
  g.fillStyle = radial(g, x - r * 0.16, y - r * 0.28, r * 0.06, x, y - r * 0.1, r * 0.6, [[0, shade(fur, 1.16)], [1, shade(fur, 0.9)]]);
  g.beginPath(); g.arc(x, y - r * 0.12, r * 0.5, 0, TAU); g.fill();
  g.strokeStyle = shade(fur, 0.55); g.lineWidth = Math.max(1.5, r * 0.05); g.stroke();
  // полоски таби
  g.strokeStyle = shade(fur, 0.72); g.lineWidth = Math.max(1.2, r * 0.045);
  g.beginPath(); g.moveTo(x, y - r * 0.56); g.lineTo(x, y - r * 0.34);
  g.moveTo(x - r * 0.12, y - r * 0.54); g.lineTo(x - r * 0.08, y - r * 0.34);
  g.moveTo(x + r * 0.12, y - r * 0.54); g.lineTo(x + r * 0.08, y - r * 0.34); g.stroke();
  // наушники: дужка + чашки
  g.strokeStyle = cup; g.lineWidth = r * 0.1;
  g.beginPath(); g.arc(x, y - r * 0.12, r * 0.6, Math.PI * 1.18, Math.PI * 1.82); g.stroke();
  for (const s2 of [-1, 1]) {
    g.fillStyle = cup; g.strokeStyle = shade(cup, 0.6); g.lineWidth = Math.max(1.4, r * 0.045);
    g.beginPath(); g.ellipse(x + s2 * r * 0.54, y - r * 0.1, r * 0.17, r * 0.26, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = accent; g.beginPath(); g.ellipse(x + s2 * r * 0.54, y - r * 0.1, r * 0.09, r * 0.16, 0, 0, TAU); g.fill();
  }
  // бантик на дужке
  const bxx = x - r * 0.22, byy = y - r * 0.66;
  g.fillStyle = bow; g.strokeStyle = shade(bow, 0.7); g.lineWidth = Math.max(1.2, r * 0.04);
  g.beginPath(); g.moveTo(bxx, byy); g.lineTo(bxx - r * 0.16, byy - r * 0.1); g.lineTo(bxx - r * 0.16, byy + r * 0.1); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(bxx, byy); g.lineTo(bxx + r * 0.16, byy - r * 0.1); g.lineTo(bxx + r * 0.16, byy + r * 0.1); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = shade(bow, 0.85); g.beginPath(); g.arc(bxx, byy, r * 0.05, 0, TAU); g.fill();
  // мордочка
  g.fillStyle = "#232a38";
  g.beginPath(); g.arc(x - r * 0.17, y - r * 0.12, r * 0.07, 0, TAU); g.arc(x + r * 0.17, y - r * 0.12, r * 0.07, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(x - r * 0.19, y - r * 0.15, r * 0.025, 0, TAU); g.arc(x + r * 0.15, y - r * 0.15, r * 0.025, 0, TAU); g.fill();
  g.fillStyle = "#e08a9a"; g.beginPath(); g.moveTo(x - r * 0.05, y + r * 0.02); g.lineTo(x + r * 0.05, y + r * 0.02); g.lineTo(x, y + r * 0.08); g.closePath(); g.fill();
  g.strokeStyle = shade(fur, 0.5); g.lineWidth = Math.max(1.3, r * 0.04);
  g.beginPath(); g.moveTo(x, y + r * 0.08); g.lineTo(x, y + r * 0.13);
  g.moveTo(x, y + r * 0.13); g.arc(x - r * 0.06, y + r * 0.11, r * 0.06, 0.1 * TAU, 0.35 * TAU);
  g.moveTo(x, y + r * 0.13); g.arc(x + r * 0.06, y + r * 0.11, r * 0.06, 0.15 * TAU, 0.4 * TAU, true); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = Math.max(1, r * 0.025);
  for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(x + s2 * r * 0.08, y + r * 0.04); g.lineTo(x + s2 * r * 0.4, y - r * 0.02); g.moveTo(x + s2 * r * 0.08, y + r * 0.1); g.lineTo(x + s2 * r * 0.4, y + r * 0.1); g.stroke(); }
  // нотка
  g.fillStyle = "#2f3547";
  g.fillRect(x - r * 0.72, y - r * 0.56, r * 0.03, r * 0.22);
  g.beginPath(); g.ellipse(x - r * 0.74, y - r * 0.34, r * 0.06, r * 0.045, -0.4, 0, TAU); g.fill();
  const CB = "#e6a24e", cup2 = "#2f3b57";
  // подушки наушников и кабель
  g.fillStyle = "rgba(255,255,255,0.2)";
  for (const s3 of [-1, 1]) { g.beginPath(); g.ellipse(x + s3 * r * 0.54, y - r * 0.18, r * 0.07, r * 0.1, 0, 0, TAU); g.fill(); }
  g.strokeStyle = shade(cup2, 1.35); g.lineWidth = Math.max(1, r * 0.03);
  g.beginPath(); g.moveTo(x + r * 0.62, y + r * 0.02); g.quadraticCurveTo(x + r * 0.86, y + r * 0.3, x + r * 0.66, y + r * 0.5); g.stroke();
  // вторая нотка и «ритм»
  g.fillStyle = "#2f3547";
  g.fillRect(x - r * 0.92, y - r * 0.24, r * 0.028, r * 0.18);
  g.beginPath(); g.ellipse(x - r * 0.94, y - r * 0.06, r * 0.05, r * 0.038, -0.4, 0, TAU); g.fill();
  // пух на груди и полоски на лапках
  furTufts(g, x, y + r * 0.52, r * 0.5, r * 0.44, Math.PI * 1.15, Math.PI * 1.85, 6, r * 0.045, shade(CB, 0.72), Math.max(1, r * 0.022), 17);
  g.strokeStyle = shade(CB, 0.7); g.lineWidth = Math.max(1, r * 0.022);
  for (const s3 of [-1, 1]) for (let k = -1; k <= 1; k++) {
    g.beginPath(); g.moveTo(x + s3 * r * 0.2 + k * r * 0.05, y + r * 0.84); g.lineTo(x + s3 * r * 0.2 + k * r * 0.055, y + r * 0.91); g.stroke();
  }
  gloss(g, x - r * 0.26, y - r * 0.42, r * 0.14, r * 0.08, 0.2, -0.5);
}
function drawBreaker(g, x, y, r, ph) {
  const fur = "#9a8f83", light = "#c8c0b5";
  g.lineJoin = "round"; g.lineCap = "round";
  // длинные уши
  for (const s2 of [-1, 1]) {
    g.fillStyle = fur; g.strokeStyle = shade(fur, 0.55); g.lineWidth = Math.max(1.5, r * 0.05);
    g.beginPath(); g.ellipse(x + s2 * r * 0.28, y - r * 0.78, r * 0.15, r * 0.5, s2 * 0.14, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = "#e6b7b0"; g.beginPath(); g.ellipse(x + s2 * r * 0.28, y - r * 0.78, r * 0.07, r * 0.36, s2 * 0.14, 0, TAU); g.fill();
  }
  // пушистое тело-грива
  g.fillStyle = radial(g, x - r * 0.28, y - r * 0.2, r * 0.1, x, y + r * 0.2, r * 1.15, [[0, shade(fur, 1.2)], [0.6, fur], [1, shade(fur, 0.72)]]);
  g.beginPath(); furBlob(g, x, y + r * 0.12, r * 0.88, r * 0.82, 34, ph); g.fill();
  g.strokeStyle = shade(fur, 0.5); g.lineWidth = Math.max(1.7, r * 0.06); g.stroke();
  // пушистая светлая грудка
  g.fillStyle = light; g.beginPath(); furBlob(g, x, y + r * 0.42, r * 0.5, r * 0.4, 22, ph + 2); g.fill();
  // лапки
  g.fillStyle = light; g.strokeStyle = shade(fur, 0.5); g.lineWidth = Math.max(1.3, r * 0.04);
  for (const s2 of [-1, 1]) { g.beginPath(); g.ellipse(x + s2 * r * 0.34, y + r * 0.86, r * 0.16, r * 0.1, 0, 0, TAU); g.fill(); g.stroke(); }
  // морда
  g.fillStyle = radial(g, x - r * 0.1, y - r * 0.3, r * 0.05, x, y - r * 0.12, r * 0.5, [[0, shade(fur, 1.18)], [1, shade(fur, 0.94)]]);
  g.beginPath(); g.arc(x, y - r * 0.1, r * 0.42, 0, TAU); g.fill();
  g.strokeStyle = shade(fur, 0.5); g.lineWidth = Math.max(1.4, r * 0.045); g.stroke();
  // сердитые брови
  g.strokeStyle = shade(fur, 0.4); g.lineWidth = Math.max(2, r * 0.06);
  g.beginPath(); g.moveTo(x - r * 0.34, y - r * 0.28); g.lineTo(x - r * 0.1, y - r * 0.14);
  g.moveTo(x + r * 0.34, y - r * 0.28); g.lineTo(x + r * 0.1, y - r * 0.14); g.stroke();
  // грозные янтарные глаза
  g.fillStyle = "#e0b23a";
  g.beginPath(); g.ellipse(x - r * 0.16, y - r * 0.1, r * 0.09, r * 0.11, 0, 0, TAU); g.ellipse(x + r * 0.16, y - r * 0.1, r * 0.09, r * 0.11, 0, 0, TAU); g.fill();
  g.fillStyle = "#1a1410";
  g.beginPath(); g.arc(x - r * 0.16, y - r * 0.08, r * 0.045, 0, TAU); g.arc(x + r * 0.16, y - r * 0.08, r * 0.045, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.arc(x - r * 0.18, y - r * 0.12, r * 0.02, 0, TAU); g.arc(x + r * 0.14, y - r * 0.12, r * 0.02, 0, TAU); g.fill();
  // нос + рот
  g.fillStyle = "#7a4a52";
  g.beginPath(); g.moveTo(x, y + r * 0.06); g.lineTo(x - r * 0.06, y - r * 0.01); g.lineTo(x + r * 0.06, y - r * 0.01); g.closePath(); g.fill();
  g.strokeStyle = shade(fur, 0.45); g.lineWidth = Math.max(1.3, r * 0.04);
  g.beginPath(); g.moveTo(x, y + r * 0.06); g.lineTo(x, y + r * 0.13);
  g.moveTo(x, y + r * 0.13); g.arc(x - r * 0.07, y + r * 0.1, r * 0.07, 0.05 * TAU, 0.28 * TAU);
  g.moveTo(x, y + r * 0.13); g.arc(x + r * 0.07, y + r * 0.1, r * 0.07, 0.22 * TAU, 0.45 * TAU, true); g.stroke();
  // два передних зуба
  g.fillStyle = "#fff"; g.fillRect(x - r * 0.05, y + r * 0.13, r * 0.045, r * 0.08); g.fillRect(x + r * 0.005, y + r * 0.13, r * 0.045, r * 0.08);
  // усы
  g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = Math.max(1, r * 0.022);
  for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(x + s2 * r * 0.06, y + r * 0.04); g.lineTo(x + s2 * r * 0.4, y - r * 0.02); g.moveTo(x + s2 * r * 0.06, y + r * 0.09); g.lineTo(x + s2 * r * 0.4, y + r * 0.1); g.stroke(); }
  const CBr = "#9a8f83";
  // кулаки — он ломает башни
  g.fillStyle = shade(CBr, 1.1); g.strokeStyle = shade(CBr, 0.5); g.lineWidth = Math.max(1.4, r * 0.045);
  for (const s3 of [-1, 1]) {
    const fx = x + s3 * r * 0.74, fy = y + r * 0.42 + Math.sin(ph * 3 + (s3 > 0 ? 1.6 : 0)) * r * 0.05;
    g.strokeStyle = shade(CBr, 0.66); g.lineWidth = r * 0.13;
    g.beginPath(); g.moveTo(x + s3 * r * 0.5, y + r * 0.24); g.lineTo(fx, fy - r * 0.04); g.stroke();
    g.fillStyle = shade(CBr, 1.1); g.strokeStyle = shade(CBr, 0.5); g.lineWidth = Math.max(1.3, r * 0.04);
    g.beginPath(); g.arc(fx, fy, r * 0.15, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = shade(CBr, 0.7);
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(fx + s3 * r * 0.03, fy + k * r * 0.07, r * 0.022, 0, TAU); g.fill(); }
    g.fillStyle = shade(CBr, 1.1);
  }
  // клочья шерсти по контуру
  furTufts(g, x, y + r * 0.12, r * 0.88, r * 0.82, Math.PI * 1.02, Math.PI * 1.98, 13, r * 0.07, shade(CBr, 0.66), Math.max(1, r * 0.03), 31);
  furTufts(g, x, y + r * 0.12, r * 0.88, r * 0.82, Math.PI * 0.08, Math.PI * 0.92, 9, r * 0.06, shade(CBr, 0.6), Math.max(1, r * 0.026), 33);
  // шрам на щеке и пластырь на ухе
  g.strokeStyle = "rgba(90,70,60,0.5)"; g.lineWidth = Math.max(1, r * 0.022);
  g.beginPath(); g.moveTo(x - r * 0.3, y - r * 0.02); g.lineTo(x - r * 0.24, y + r * 0.1); g.stroke();
  g.beginPath(); g.moveTo(x - r * 0.33, y + r * 0.02); g.lineTo(x - r * 0.21, y + r * 0.06); g.stroke();
  g.fillStyle = "#e8d3ad"; g.strokeStyle = "#c6ab7f"; g.lineWidth = Math.max(1, r * 0.02);
  g.save(); g.translate(x + r * 0.3, y - r * 0.9); g.rotate(0.3);
  rr(g, -r * 0.11, -r * 0.05, r * 0.22, r * 0.1, r * 0.03); g.fill(); g.stroke(); g.restore();
}

/* ---------- Снаряды / эффекты / частицы ---------- */
/* Хвост снаряда: короткий сужающийся след по направлению полёта. */
function projTrail(x, y, ang, len, w, color) {
  const tx = x - Math.cos(ang) * len, ty = y - Math.sin(ang) * len;
  const gr = ctx.createLinearGradient(x, y, tx, ty);
  gr.addColorStop(0, color);
  gr.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = gr; ctx.lineWidth = w; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
}
function drawProjectiles() {
  const cell = view.board.cell;
  for (const p of G.projectiles) {
    const ang = p.ang || 0;
    if (p.type === "pea") {
      const r = cell * 0.095;
      projTrail(p.x, p.y, ang, cell * 0.5, r * 1.5, shade(p.color, 0.9));
      ctx.fillStyle = radial(ctx, p.x - r * 0.3, p.y - r * 0.35, r * 0.1, p.x, p.y, r * 1.2,
        [[0, shade(p.color, 1.5)], [0.6, p.color], [1, shade(p.color, 0.7)]]);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = PAL.outline; ctx.lineWidth = 1.5 * view.ui; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.arc(p.x - r * 0.32, p.y - r * 0.34, r * 0.28, 0, TAU); ctx.fill();
    } else if (p.type === "shard") {
      const s = cell * 0.115;
      projTrail(p.x, p.y, ang, cell * 0.45, s * 1.1, "rgba(150,225,255,0.75)");
      // морозная пыль позади
      for (let k = 1; k <= 2; k++) {
        const d = cell * 0.22 * k, a = ang + Math.sin((p.t || 0) * 14 + k) * 0.5;
        ctx.fillStyle = "rgba(205,239,251," + (0.4 / k).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(p.x - Math.cos(a) * d, p.y - Math.sin(a) * d, s * (0.32 / k), 0, TAU); ctx.fill();
      }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(G.clock * 6);
      ctx.fillStyle = radial(ctx, -s * 0.2, -s * 0.3, s * 0.05, 0, 0, s * 1.1, [[0, "#ffffff"], [1, "#a9dcf2"]]);
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, 0); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = "#4dc9e6"; ctx.lineWidth = 1.5 * view.ui; ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1 * view.ui;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.75); ctx.lineTo(0, s * 0.75); ctx.stroke();
      ctx.restore();
    } else if (p.type === "bomb") {
      const r = cell * 0.125;
      // дымный след
      for (let k = 1; k <= 3; k++) {
        const d = cell * 0.2 * k;
        ctx.fillStyle = "rgba(120,120,130," + (0.22 / k).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(p.x - Math.cos(ang) * d, p.y - Math.sin(ang) * d, r * (0.5 + k * 0.14), 0, TAU); ctx.fill();
      }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.t || 0) * 5);
      ctx.fillStyle = radial(ctx, -r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.25, [[0, "#5a6076"], [0.6, "#343a4b"], [1, "#1d2130"]]);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = PAL.outline; ctx.lineWidth = 1.4 * view.ui; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.ellipse(-r * 0.33, -r * 0.36, r * 0.26, r * 0.16, -0.6, 0, TAU); ctx.fill();
      // фитиль
      ctx.strokeStyle = "#8a6a45"; ctx.lineWidth = Math.max(1, r * 0.16); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.quadraticCurveTo(r * 0.3, -r * 1.3, r * 0.12, -r * 1.55); ctx.stroke();
      ctx.restore();
      // искра на фитиле
      const fx = p.x + Math.cos((p.t || 0) * 5 - Math.PI / 2 + 0.4) * r * 1.5;
      const fy = p.y + Math.sin((p.t || 0) * 5 - Math.PI / 2 + 0.4) * r * 1.5;
      const fl = 1 + Math.sin(G.clock * 30) * 0.3;
      ctx.fillStyle = "rgba(255,190,80,0.5)";
      ctx.beginPath(); ctx.arc(fx, fy, r * 0.42 * fl, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff0b8";
      ctx.beginPath(); ctx.arc(fx, fy, r * 0.18 * fl, 0, TAU); ctx.fill();
    }
  }
}
/* Ломаная молнии — считается один раз при выстреле, чтобы разряд не дёргался. */
function boltPoints(x1, y1, x2, y2, amp) {
  const d = Math.hypot(x2 - x1, y2 - y1) || 1;
  const n = clamp(Math.round(d / (amp * 1.6)), 3, 10);
  const nx = -(y2 - y1) / d, ny = (x2 - x1) / d;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, edge = Math.sin(t * Math.PI);
    const o = (i === 0 || i === n) ? 0 : rnd(-amp, amp) * edge;
    pts.push({ x: lerp(x1, x2, t) + nx * o, y: lerp(y1, y2, t) + ny * o });
  }
  return pts;
}
function drawEffects() {
  const cell = view.board.cell;
  for (const ef of G.effects) {
    const k = clamp(ef.life / ef.max, 0, 1);
    if (ef.kind === "beam") {
      // три прохода: широкое свечение, тело луча, белая сердцевина
      ctx.lineCap = "round";
      ctx.globalAlpha = k * 0.28; ctx.strokeStyle = ef.color; ctx.lineWidth = 10 * view.ui * k + 2;
      ctx.beginPath(); ctx.moveTo(ef.x1, ef.y1); ctx.lineTo(ef.x2, ef.y2); ctx.stroke();
      ctx.globalAlpha = k * 0.9; ctx.lineWidth = 4 * view.ui * k + 1;
      ctx.beginPath(); ctx.moveTo(ef.x1, ef.y1); ctx.lineTo(ef.x2, ef.y2); ctx.stroke();
      ctx.globalAlpha = k; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.6 * view.ui * k + 0.6;
      ctx.beginPath(); ctx.moveTo(ef.x1, ef.y1); ctx.lineTo(ef.x2, ef.y2); ctx.stroke();
      // вспышка в точке попадания
      ctx.globalAlpha = k * 0.8; ctx.fillStyle = ef.color;
      ctx.beginPath(); ctx.arc(ef.x2, ef.y2, cell * 0.16 * k, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (ef.kind === "bolt") {
      const pts = ef.pts;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const pass of [[0.3, 9, ef.color], [0.95, 3.2, ef.color], [1, 1.4, "#ffffff"]]) {
        ctx.globalAlpha = k * pass[0]; ctx.strokeStyle = pass[2]; ctx.lineWidth = pass[1] * view.ui * (0.5 + k * 0.5);
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      ctx.globalAlpha = k * 0.85; ctx.fillStyle = "#eaf9ff";
      ctx.beginPath(); ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, cell * 0.13 * k, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (ef.kind === "explosion") {
      const grow = 1.15 - k * 0.85;
      // огненный шар
      const rr2 = ef.r * grow;
      const fire = radial(ctx, ef.x, ef.y, rr2 * 0.1, ef.x, ef.y, rr2,
        [[0, "rgba(255,255,235," + (k * 0.95).toFixed(3) + ")"],
         [0.35, "rgba(255,205,110," + (k * 0.8).toFixed(3) + ")"],
         [0.7, "rgba(240,120,60," + (k * 0.45).toFixed(3) + ")"],
         [1, "rgba(180,70,40,0)"]]);
      ctx.fillStyle = fire;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, rr2, 0, TAU); ctx.fill();
      // ударная волна
      ctx.globalAlpha = k * k;
      ctx.strokeStyle = "#ffe9a8"; ctx.lineWidth = (3.5 * view.ui) * k + 0.5;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r * (1.35 - k * 0.9), 0, TAU); ctx.stroke();
      // осколки
      ctx.strokeStyle = "rgba(255,214,140," + (k * 0.9).toFixed(3) + ")";
      ctx.lineWidth = 2 * view.ui; ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const a = (ef.seed || 0) + i * TAU / 7;
        const r0 = ef.r * (0.5 + (1 - k) * 0.7), r1 = r0 + ef.r * 0.22 * k;
        ctx.beginPath();
        ctx.moveTo(ef.x + Math.cos(a) * r0, ef.y + Math.sin(a) * r0);
        ctx.lineTo(ef.x + Math.cos(a) * r1, ef.y + Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (ef.kind === "flash") {
      // дульная вспышка: ядро плюс короткие лучи по направлению выстрела
      const a0 = ef.ang || 0, rr2 = ef.r * (0.6 + k * 0.6);
      ctx.globalAlpha = k;
      ctx.fillStyle = radial(ctx, ef.x, ef.y, 0, ef.x, ef.y, rr2,
        [[0, "rgba(255,255,240,0.95)"], [0.4, ef.color], [1, "rgba(255,255,255,0)"]]);
      ctx.beginPath(); ctx.arc(ef.x, ef.y, rr2, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,248,215," + (k * 0.85).toFixed(3) + ")";
      ctx.lineWidth = 2 * view.ui; ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        const a = a0 + i * 0.45;
        ctx.beginPath(); ctx.moveTo(ef.x + Math.cos(a) * rr2 * 0.5, ef.y + Math.sin(a) * rr2 * 0.5);
        ctx.lineTo(ef.x + Math.cos(a) * rr2 * (1.5 - Math.abs(i) * 0.4), ef.y + Math.sin(a) * rr2 * (1.5 - Math.abs(i) * 0.4));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (ef.kind === "spark") {
      // короткая звёздочка попадания
      const rr2 = ef.r * (1.4 - k * 0.5);
      ctx.globalAlpha = k;
      ctx.strokeStyle = ef.color; ctx.lineWidth = 2 * view.ui * k + 0.5; ctx.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const a = (ef.seed || 0) + i * TAU / 5;
        ctx.beginPath();
        ctx.moveTo(ef.x + Math.cos(a) * rr2 * 0.3, ef.y + Math.sin(a) * rr2 * 0.3);
        ctx.lineTo(ef.x + Math.cos(a) * rr2, ef.y + Math.sin(a) * rr2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255," + (k * 0.9).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(ef.x, ef.y, rr2 * 0.22, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (ef.kind === "pulse") {
      const rr2 = ef.r * (1.1 - k);
      ctx.fillStyle = radial(ctx, ef.x, ef.y, rr2 * 0.55, ef.x, ef.y, rr2,
        [[0, "rgba(255,255,255,0)"], [1, ef.color]]);
      ctx.globalAlpha = k * 0.5;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, rr2, 0, TAU); ctx.fill();
      ctx.globalAlpha = k * 0.8; ctx.strokeStyle = ef.color; ctx.lineWidth = 2.5 * view.ui;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, rr2, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
function drawParticles() {
  for (const p of G.particles) {
    const k = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = k;
    if (p.kind === "spark") {
      // искра тянется по своей скорости и гаснет
      const v = Math.hypot(p.vx, p.vy) || 1, l = Math.min(p.size * 5, v * 0.045);
      ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx / v * l, p.y - p.vy / v * l); ctx.stroke();
    } else if (p.kind === "smoke") {
      ctx.globalAlpha = k * 0.5;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - k), 0, TAU); ctx.fill();
    } else if (p.kind === "star") {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.spin || 0) * (p.max - p.life));
      ctx.fillStyle = p.color; ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, rr2 = (i % 2 ? 0.42 : 1) * p.size * 1.7;
        ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k * 0.4), 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
function drawFloatingTexts() {
  for (const t of G.texts) {
    ctx.globalAlpha = clamp(t.life / t.max, 0, 1);
    if (t.icon) {
      const str = (t.prefix || "") + t.val, fs = t.size, r = fs * 0.55, gap = fs * 0.24;
      ctx.font = "bold " + fs + "px \"Trebuchet MS\", sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      const total = r * 2 + gap + ctx.measureText(str).width, sx = t.x - total / 2;
      if (t.icon === "gold") drawCoin(ctx, sx + r, t.y, r);
      else if (t.icon === "gem") drawGem(ctx, sx + r, t.y, r);
      else if (t.icon === "life") drawHeart(ctx, sx + r, t.y, r, PAL.danger);
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillText(str, sx + r * 2 + gap + 1.5, t.y + 1.5);
      ctx.fillStyle = t.color; ctx.fillText(str, sx + r * 2 + gap, t.y);
    } else {
      textShadow(t.text, t.x, t.y, t.size, t.color);
    }
  }
  ctx.globalAlpha = 1;
}
function drawToast() {
  const t = G.toast, k = clamp(t.life / 0.3, 0, 1); // плавное угасание в конце
  ctx.globalAlpha = k;
  const hasAd = t.reward > 0;
  const w = Math.min(300 * view.ui, view.w * 0.86), h = (hasAd ? 84 : 52) * view.ui;
  const x = view.w / 2 - w / 2, y = view.h * 0.78 - h / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 14 * view.ui; ctx.shadowOffsetY = 3 * view.ui;
  rr(ctx, x, y, w, h, 12 * view.ui); ctx.fillStyle = PAL.panel; ctx.fill(); ctx.restore();
  ctx.strokeStyle = PAL.danger; ctx.lineWidth = 2 * view.ui; ctx.stroke();
  text(t.text, view.w / 2, y + (hasAd ? 20 : h / 2) * view.ui, F(15), PAL.text);
  if (hasAd) {
    const bw = w - 24 * view.ui, bx = view.w / 2 - bw / 2, bh = 34 * view.ui, by = y + h - bh - 10 * view.ui;
    btn("toast_ad", bx, by, bw, bh, "", { color: "#ff9f45", fs: F(13) });
    ctx.font = "bold " + F(13) + "px \"Trebuchet MS\", sans-serif";
    const lbl = L("watchAd") + "  +";
    const lw = ctx.measureText(lbl + t.reward).width + 16 * view.ui;
    const sx = view.w / 2 - lw / 2;
    text(lbl, sx, by + bh / 2, F(13), "#0e1626", "left");
    drawGem(ctx, sx + ctx.measureText(lbl).width + 8 * view.ui, by + bh / 2, 7 * view.ui);
    text(String(t.reward), sx + ctx.measureText(lbl).width + 16 * view.ui, by + bh / 2, F(13), "#0e1626", "left");
  }
  ctx.globalAlpha = 1;
}
function drawVignette() {
  const g = ctx.createRadialGradient(view.w / 2, view.h * 0.46, Math.min(view.w, view.h) * 0.34, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.17)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
}

/* ---------- Иконки HUD ---------- */
function drawHeart(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y + r * 0.75);
  g.bezierCurveTo(x - r * 1.3, y - r * 0.35, x - r * 0.5, y - r, x, y - r * 0.35);
  g.bezierCurveTo(x + r * 0.5, y - r, x + r * 1.3, y - r * 0.35, x, y + r * 0.75);
  g.closePath(); g.fill();
}
function drawCoin(g, x, y, r) {
  g.fillStyle = "#e0a92e"; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = PAL.gold; g.beginPath(); g.arc(x, y, r * 0.78, 0, TAU); g.fill();
  g.strokeStyle = "#e0a92e"; g.lineWidth = Math.max(1, r * 0.14);
  g.beginPath(); g.arc(x, y, r * 0.5, 0, TAU); g.stroke();
}
/* Рисует «значок + число» (без слов «монет/золота»). kind: "gold" | "gem".
   align: "left" (значок начинается в x) | "center" | "right". Возвращает ширину. */
function drawAmount(kind, x, y, val, fs, color, align) {
  const r = fs * 0.6, gap = fs * 0.28, str = String(val);
  ctx.font = "bold " + fs + "px \"Trebuchet MS\", sans-serif";
  const numW = ctx.measureText(str).width;
  const total = r * 2 + gap + numW;
  let sx = x;
  if (align === "center") sx = x - total / 2;
  else if (align === "right") sx = x - total;
  if (kind === "gem") drawGem(ctx, sx + r, y, r); else drawCoin(ctx, sx + r, y, r);
  text(str, sx + r * 2 + gap, y, fs, color || (kind === "gem" ? PAL.gem : PAL.gold), "left");
  return total;
}
/* Валюта меню — кристалл (визуально отличается от боевого золота). */
function drawGem(g, x, y, r) {
  g.fillStyle = shade(PAL.gem, 0.7);
  g.beginPath();
  g.moveTo(x, y - r); g.lineTo(x + r * 0.85, y - r * 0.15); g.lineTo(x, y + r); g.lineTo(x - r * 0.85, y - r * 0.15);
  g.closePath(); g.fill();
  g.fillStyle = PAL.gem;
  g.beginPath();
  g.moveTo(x, y - r); g.lineTo(x + r * 0.42, y - r * 0.15); g.lineTo(x, y + r * 0.5); g.lineTo(x - r * 0.42, y - r * 0.15);
  g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.75)";
  g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.42, y - r * 0.15); g.lineTo(x - r * 0.05, y - r * 0.15); g.closePath(); g.fill();
  g.strokeStyle = shade(PAL.gem, 0.55); g.lineWidth = Math.max(1, r * 0.12);
  g.beginPath();
  g.moveTo(x, y - r); g.lineTo(x + r * 0.85, y - r * 0.15); g.lineTo(x, y + r); g.lineTo(x - r * 0.85, y - r * 0.15);
  g.closePath(); g.stroke();
}
function drawStar(g, x, y, r, filled) {
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * TAU / 5;
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    const a2 = a + TAU / 10;
    g.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
  }
  g.closePath();
  g.fillStyle = filled ? PAL.gold : "rgba(255,255,255,0.15)"; g.fill();
  g.strokeStyle = filled ? "#e0a92e" : "rgba(255,255,255,0.3)"; g.lineWidth = Math.max(1, r * 0.1); g.stroke();
}

/* ---------- HUD ---------- */
function drawHUD() {
  const h = view.hudH;
  ctx.fillStyle = PAL.panel; ctx.fillRect(0, 0, view.w, h);
  ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(0, 0, view.w, h * 0.35);
  const pad = 12 * view.ui;
  // жизни
  drawHeart(ctx, pad + 10 * view.ui, h / 2, 10 * view.ui, PAL.danger);
  text(String(G.lives), pad + 26 * view.ui, h / 2, F(18), PAL.text, "left");
  // золото
  const gx = pad + 78 * view.ui;
  drawCoin(ctx, gx, h / 2, 10 * view.ui);
  text(String(G.gold), gx + 16 * view.ui, h / 2, F(18), PAL.gold, "left");
  // центр — счёт
  text(L("score") + " " + G.score, view.w / 2, h * 0.34, F(15), PAL.text);
  if (G.combo > 1) text(L("combo") + " x" + comboMult().toFixed(1).replace(/\.0$/, ""), view.w / 2, h * 0.72, F(14), PAL.gold);
  // правые кнопки
  const bs = h * 0.66, by = (h - bs) / 2;
  let bx = view.w - pad - bs;
  btn("pause", bx, by, bs, bs, "II", { color: PAL.panel2, textColor: PAL.text, fs: F(16) });
  bx -= bs + 8 * view.ui;
  btn("speed", bx, by, bs * 1.3, bs, "x" + G.speed, { color: G.speed > 1 ? PAL.good : PAL.panel2, textColor: G.speed > 1 ? "#0e1626" : PAL.text, fs: F(15) });
  bx -= bs * 1.3 + 8 * view.ui;
  btn("sfxq", bx, by, bs, bs, Save.data.sfx ? "♪" : "×", { color: PAL.panel2, textColor: Save.data.sfx ? PAL.good : PAL.dim, fs: F(16) });
}

/* ---------- Инфо о волне + кнопка старта (под полем, над доком) ---------- */
function drawWaveInfo() {
  const cur = Math.max(0, G.waveIndex + 1);
  const total = G.mode === "level" ? " / " + G.waves.length : "";
  const modeLbl = G.mode === "level" ? "   ·   " + L("level") + " " + G.level : "   ·   " + L("endless");
  const y = view.hudH + 4 * view.ui;
  text(L("wave") + " " + cur + total + modeLbl, view.w / 2, y + 10 * view.ui, F(13), PAL.dim);

  // управление стартом волны — окошко ПОД полем, прямо над доком
  if (!G.waveActive && G.state === "playing") {
    const cxp = view.w / 2;
    const bw = Math.min(300 * view.ui, view.w * 0.88), bh = 44 * view.ui;
    const bx = cxp - bw / 2;
    const boxH = bh + 44 * view.ui;
    const boxTop = (view.h - view.dockH) - 6 * view.ui - boxH;
    const byy = boxTop + 12 * view.ui;
    const next = G.waveIndex + 2, suffix = G.mode === "level" ? " / " + G.waves.length : "";
    // непрозрачная подложка — не перекрывает ни поле, ни док
    ctx.save();
    rr(ctx, bx - 12 * view.ui, boxTop, bw + 24 * view.ui, boxH, 16 * view.ui);
    ctx.fillStyle = "rgba(11,19,34,0.92)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1.5 * view.ui; ctx.stroke();
    ctx.restore();
    const glow = 0.5 + Math.sin(performance.now() / 300) * 0.5;
    ctx.save(); ctx.shadowColor = PAL.good; ctx.shadowBlur = (6 + glow * 12) * view.ui;
    if (G.waveIndex < 0) {
      btn("startwave", bx, byy, bw, bh, L("toBattle") + "  " + L("wave") + " 1" + suffix, { color: PAL.good, fs: F(16) });
      ctx.restore();
      text(L("placeHint"), cxp, byy + bh + 16 * view.ui, F(12), PAL.dim);
    } else {
      const t = Math.max(0, G.betweenTimer), bonus = Math.ceil(t * (6 + G.waveIndex));
      btn("startwave", bx, byy, bw, bh, L("startEarlier") + "  (" + t.toFixed(1) + ")", { color: PAL.gold, fs: F(15) });
      ctx.restore();
      const msg = L("wave") + " " + next + suffix + "  ·  " + L("through") + " " + t.toFixed(1) + "  ·  " + L("bonus") + " +" + bonus;
      text(msg, cxp - 8 * view.ui, byy + bh + 16 * view.ui, F(12), PAL.gold);
      ctx.font = "bold " + F(12) + "px \"Trebuchet MS\", sans-serif";
      drawCoin(ctx, cxp - 8 * view.ui + ctx.measureText(msg).width / 2 + 9 * view.ui, byy + bh + 16 * view.ui, 6 * view.ui);
    }
  }
}

/* ---------- Нижний док / панель башни ---------- */
function drawDock() {
  const dh = view.dockH, dy = view.h - dh;
  ctx.fillStyle = PAL.panel; ctx.fillRect(0, dy, view.w, dh);
  ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(0, dy, view.w, 3 * view.ui);

  if (G.selTower) { drawTowerPanel(dy, dh); return; }

  const squad = Save.data.squad;
  const n = Math.max(1, squad.length);
  const pad = 8 * view.ui;
  const bw = (view.w - pad * (n + 1)) / n;
  const bh = dh - pad * 2;
  for (let i = 0; i < squad.length; i++) {
    const type = squad[i];
    const def = TOWERS[type];
    const x = pad + i * (bw + pad), y = dy + pad;
    const cost = def.levels[0].cost;
    const afford = G.gold >= cost;
    const sel = G.selType === type;
    rr(ctx, x, y, bw, bh, 12 * view.ui);
    ctx.fillStyle = sel ? PAL.panel2 : "#1f2f4c"; ctx.fill();
    ctx.strokeStyle = sel ? def.color : RARITY[def.rarity].color; ctx.lineWidth = (sel ? 3 : 2) * view.ui; ctx.stroke();
    ctx.globalAlpha = afford ? 1 : 0.5;
    drawTowerIcon(ctx, x + bw * 0.22, y + bh * 0.42, Math.min(bw, bh) * 0.42, type);
    const tx = x + bw * 0.44, maxTW = bw * 0.56 - 8 * view.ui;
    // в узкой ячейке описание не помещается — оставляем только название и цену
    const showDesc = textW(cDesc(type), F(10)) <= maxTW;
    textClip(cName(type), tx, y + bh * (showDesc ? 0.32 : 0.40), maxTW, F(13), PAL.text);
    if (showDesc) textClip(cDesc(type), tx, y + bh * 0.55, maxTW, F(10), PAL.dim);
    drawCoin(ctx, x + bw * 0.47, y + bh * 0.78, 7 * view.ui);
    text(String(cost), x + bw * 0.55, y + bh * 0.78, F(13), afford ? PAL.gold : PAL.danger, "left");
    ctx.globalAlpha = 1;
    G.hot.push({ id: "tw_" + type, x, y, w: bw, h: bh, disabled: false });
  }
}
function drawTowerPanel(dy, dh) {
  const tw = G.selTower, def = TOWERS[tw.type], st = def.levels[tw.level];
  const pad = 8 * view.ui;
  const val = Math.floor(tw.invested * 0.6);
  // строка информации
  text(cName(tw.type) + " · " + L("lvl") + (tw.level + 1) + "    " + L("dmg") + " " + st.dmg + "  ·  " + L("range") + " " + st.range.toFixed(1) + "  ·  " + L("rate") + " " + st.rate.toFixed(1),
    pad, dy + dh * 0.2, F(11), PAL.text, "left");
  text(L("durab") + " " + Math.ceil(tw.hp) + "/" + tw.maxHp, pad, dy + dh * 0.42, F(11), tw.hp < tw.maxHp ? PAL.danger : PAL.good, "left");
  // ряд кнопок (3 или 4)
  const btns = [];
  if (tw.level < 2) { const uc = def.levels[tw.level + 1].cost; btns.push({ id: "upg", label: L("upgrade") + " " + uc, color: G.gold >= uc ? PAL.good : "#3a4763", tc: "#0e1626", dis: G.gold < uc }); }
  else btns.push({ id: "upg", label: L("max"), color: PAL.panel2, tc: PAL.gold, dis: true });
  if (tw.hp < tw.maxHp) { const rc = repairCost(tw); btns.push({ id: "repair", label: L("repair") + " " + rc, color: G.gold >= rc ? PAL.blue : "#3a4763", tc: PAL.text, dis: G.gold < rc }); }
  btns.push({ id: "sell", label: L("sell") + " +" + val, color: PAL.danger, tc: "#0e1626" });
  btns.push({ id: "closepanel", label: L("close"), color: PAL.panel2, tc: PAL.text });
  const n = btns.length, gap = 6 * view.ui;
  const bw = (view.w - pad * 2 - gap * (n - 1)) / n, bh = dh * 0.46, by = dy + dh * 0.5;
  for (let i = 0; i < n; i++) {
    const b = btns[i];
    btn(b.id, pad + i * (bw + gap), by, bw, bh, b.label, { color: b.color, textColor: b.tc, disabled: b.dis, fs: F(12) });
  }
}

/* ---------- Обучение ---------- */
function drawTutorial() {
  const b = view.board;
  const y = b.y + b.h * 0.22;
  const pw = Math.min(320 * view.ui, b.w - 16 * view.ui);
  ctx.save();
  rr(ctx, view.w / 2 - pw / 2, y - 42 * view.ui, pw, 84 * view.ui, 14 * view.ui);
  ctx.fillStyle = "rgba(11,19,34,0.9)"; ctx.fill();
  ctx.strokeStyle = PAL.good; ctx.lineWidth = 2 * view.ui; ctx.stroke();
  text(L("howToPlay"), view.w / 2, y - 22 * view.ui, F(16), PAL.gold);
  text(L("tut1"), view.w / 2, y, F(13), PAL.text);
  text(L("tut2"), view.w / 2, y + 18 * view.ui, F(13), PAL.text);
  ctx.restore();
}

/* ---------- Оверлеи ---------- */
function dim(a) { ctx.fillStyle = "rgba(6,12,24," + (a || 0.7) + ")"; ctx.fillRect(0, 0, view.w, view.h); }
function panelBox(w, h) {
  const x = view.w / 2 - w / 2, y = view.h / 2 - h / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 20 * view.ui;
  rr(ctx, x, y, w, h, 20 * view.ui); ctx.fillStyle = PAL.panel; ctx.fill(); ctx.restore();
  ctx.strokeStyle = PAL.panel2; ctx.lineWidth = 2 * view.ui; ctx.stroke();
  return { x, y };
}
function drawPaused() {
  dim(0.72);
  const w = Math.min(360 * view.ui, view.w * 0.9), h = 340 * view.ui;
  const p = panelBox(w, h);
  text(L("pause"), view.w / 2, p.y + 44 * view.ui, F(30), PAL.gold);
  const bw = w - 60 * view.ui, bx = view.w / 2 - bw / 2;
  let y = p.y + 80 * view.ui, bh = 46 * view.ui, gap = 12 * view.ui;
  btn("resume", bx, y, bw, bh, L("resume"), { color: PAL.good }); y += bh + gap;
  btn("restart", bx, y, bw, bh, L("restart"), { color: PAL.blue, textColor: PAL.text }); y += bh + gap;
  btn("tomenu", bx, y, bw, bh, L("toMenu"), { color: PAL.panel2, textColor: PAL.text }); y += bh + gap;
  const hw = (bw - gap) / 2;
  btn("sfx", bx, y, hw, bh, L("sound") + ": " + (Save.data.sfx ? L("on") : L("off")), { color: PAL.panel2, textColor: Save.data.sfx ? PAL.good : PAL.dim, fs: F(14) });
  btn("music", bx + hw + gap, y, hw, bh, L("music") + ": " + (Save.data.music ? L("on") : L("off")), { color: PAL.panel2, textColor: Save.data.music ? PAL.good : PAL.dim, fs: F(14) });
}
function drawConfirm() {
  dim(0.78);
  const c = G.confirm || { lines: [], coins: 0 };
  const w = Math.min(380 * view.ui, view.w * 0.92), h = 260 * view.ui;
  const p = panelBox(w, h);
  text(L("exit"), view.w / 2, p.y + 38 * view.ui, F(24), PAL.gold);
  for (let i = 0; i < c.lines.length; i++) text(c.lines[i], view.w / 2, p.y + 74 * view.ui + i * 22 * view.ui, F(14), PAL.text);
  // сколько получит игрок (значком)
  text(L("youGet"), view.w / 2, p.y + 128 * view.ui, F(13), PAL.dim);
  drawAmount("gem", view.w / 2, p.y + 152 * view.ui, "+" + c.coins, F(20), PAL.gem, "center");
  const bw = w - 60 * view.ui, bx = view.w / 2 - bw / 2, gap = 12 * view.ui, hw = (bw - gap) / 2;
  const by = p.y + h - 62 * view.ui, bh = 46 * view.ui;
  btn("cf_yes", bx, by, hw, bh, L("doExit"), { color: PAL.danger, textColor: "#0e1626" });
  btn("cf_no", bx + hw + gap, by, hw, bh, L("stay"), { color: PAL.good });
}
function drawResult(win) {
  dim(0.75);
  const w = Math.min(380 * view.ui, view.w * 0.92), h = 400 * view.ui;
  const p = panelBox(w, h);
  text(win ? L("win") : L("lose"), view.w / 2, p.y + 46 * view.ui, F(30), win ? PAL.gold : PAL.danger);
  if (win) {
    for (let i = 0; i < 3; i++) drawStar(ctx, view.w / 2 - 44 * view.ui + i * 44 * view.ui, p.y + 100 * view.ui, 22 * view.ui, i < G.resultStars);
  } else {
    text(G.mode === "endless" ? L("wavesPassed") + " " + (G.waveIndex + 1) : L("level") + " " + G.level, view.w / 2, p.y + 96 * view.ui, F(16), PAL.text);
  }
  text(L("score") + ": " + G.score, view.w / 2, p.y + 140 * view.ui, F(18), PAL.text);
  text(L("bestLbl") + " " + Save.data.highScore, view.w / 2, p.y + 166 * view.ui, F(14), PAL.dim);
  drawAmount("gem", view.w / 2, p.y + 196 * view.ui, "+" + G.pendingCoins, F(18), PAL.gem, "center");

  const bw = w - 60 * view.ui, bx = view.w / 2 - bw / 2;
  let y = p.y + 224 * view.ui, bh = 42 * view.ui, gap = 10 * view.ui;
  // rewarded кнопка
  if (win || G.continueUsed) {
    btn("x2", bx, y, bw, bh, G.x2Used ? L("x2Done") : L("adX2"), { color: G.x2Used ? PAL.panel2 : "#ff9f45", disabled: G.x2Used, textColor: G.x2Used ? PAL.dim : "#0e1626", fs: F(14) });
  } else {
    btn("continue", bx, y, bw, bh, L("adContinue"), { color: "#ff9f45", fs: F(13) });
  }
  y += bh + gap;
  if (win) {
    const hw = (bw - gap) / 2;
    if (G.level < 10) { btn("next", bx, y, hw, bh, L("next"), { color: PAL.good }); btn("replay", bx + hw + gap, y, hw, bh, L("restart"), { color: PAL.blue, textColor: PAL.text }); }
    else { btn("replay", bx, y, bw, bh, L("playAgain"), { color: PAL.good }); }
  } else {
    btn("restart", bx, y, bw, bh, L("playAgain"), { color: PAL.good });
  }
  y += bh + gap;
  btn("tomenu", bx, y, bw, bh, L("toMenu"), { color: PAL.panel2, textColor: PAL.text });
}
function drawAdCurtain() {
  dim(0.9);
  text(L("adWait"), view.w / 2, view.h / 2, F(24), PAL.text);
}

/* ---------- Меню ---------- */
function menuBadge(x, y, r, label, value, color, icon) {
  rr(ctx, x, y, r, 34 * view.ui, 10 * view.ui); ctx.fillStyle = PAL.panel2; ctx.fill();
  if (icon === "gem") {
    drawGem(ctx, x + 14 * view.ui, y + 17 * view.ui, 9 * view.ui);
    text(value, x + 30 * view.ui, y + 17 * view.ui, F(16), color, "left");
  } else {
    text(label, x + 10 * view.ui, y + 12 * view.ui, F(10), PAL.dim, "left");
    text(value, x + 10 * view.ui, y + 24 * view.ui, F(15), color, "left");
  }
}
function drawMenu() {
  const t = G.clock !== undefined ? performance.now() / 1000 : 0;
  const cxp = view.w / 2, ty = view.h * 0.20;
  // колонка кнопок и нижние бейджи считаются заранее: между ними живут монстрики
  const bw = Math.min(300 * view.ui, view.w * 0.82), bx = cxp - bw / 2;
  const bh = 52 * view.ui, gap = 12 * view.ui, hw = (bw - gap) / 2;
  const btnTop = view.h * 0.32, btnBottom = btnTop + bh * 3 + gap * 2;
  const badgeY = view.h * 0.86;
  // заголовок = название игры (единое для всех языков, авто-подгонка по ширине)
  const maxW = view.w * 0.9;
  ctx.font = "bold " + F(40) + "px \"Trebuchet MS\", sans-serif";
  const baseW = ctx.measureText(L("title")).width;
  const ts = baseW > maxW ? Math.max(F(20), Math.floor(F(40) * maxW / baseW)) : F(40);
  drawMenuDecor(t, { btnBottom: btnBottom, badgeY: badgeY, btnLeft: bx, btnRight: bx + bw, titleBottom: ty + ts * 0.62 });
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 12 * view.ui; ctx.shadowOffsetY = 4 * view.ui;
  text(L("title"), cxp, ty, ts, PAL.gold);
  ctx.restore();

  let y = btnTop;
  btn("play", bx, y, bw, bh, L("play"), { color: PAL.good, fs: F(22) }); y += bh + gap;
  btn("book", bx, y, bw, bh, L("book"), { color: PAL.blue, textColor: PAL.text, fs: F(18) }); y += bh + gap;
  btn("squad", bx, y, hw, bh, L("squad"), { color: PAL.panel2, textColor: PAL.text, fs: F(17) });
  btn("shop", bx + hw + gap, y, hw, bh, L("shop"), { color: PAL.panel2, textColor: PAL.text, fs: F(17) }); y += bh + gap;

  // шестерёнка настроек (верхний правый угол)
  const gs = 42 * view.ui, gp = 12 * view.ui;
  drawGear(view.w - gp - gs / 2, gp + gs / 2, gs * 0.44);
  G.hot.push({ id: "settings", x: view.w - gp - gs, y: gp, w: gs, h: gs, disabled: false });

  // бейджи рекорд/монеты
  const badgeW = 120 * view.ui;
  menuBadge(cxp - badgeW - 8 * view.ui, badgeY, badgeW, L("record"), String(Save.data.highScore), PAL.gold);
  menuBadge(cxp + 8 * view.ui, badgeY, badgeW, L("coins"), String(Save.data.coins), PAL.gem, "gem");
}
function drawGear(x, y, r) {
  ctx.save();
  ctx.fillStyle = PAL.panel2;
  rr(ctx, x - r * 1.35, y - r * 1.35, r * 2.7, r * 2.7, r * 0.5); ctx.fill();
  ctx.translate(x, y);
  ctx.fillStyle = PAL.text;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a + TAU / 16) * r * 1.32, Math.sin(a + TAU / 16) * r * 1.32);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.panel2; ctx.beginPath(); ctx.arc(0, 0, r * 0.48, 0, TAU); ctx.fill();
  ctx.restore();
}
/* Монстрики-заставка не должны лезть на кнопки и бейджи. Обычно они стоят
   рядком в свободной полосе под кнопками; если экран низкий (телефон лёжа),
   полосы не хватает — тогда они расходятся по бокам от колонки кнопок.
   Размеры и качание подрезаются по фактическому свободному месту. */
const MENU_DECOR = ["huggy", "skibi", "chill", "hamster", "grenny"];
function drawMenuDecor(t, box) {
  const pad = 10 * view.ui;
  const cap = Math.min(view.w, view.h) * 0.105;
  // вариант 1 — рядок под кнопками
  const n = view.w < 560 ? 3 : MENU_DECOR.length;
  const pick = n === 3 ? [0, 2, 4] : [0, 1, 2, 3, 4];
  const band = box.badgeY - box.btnBottom - pad * 2;
  const rowS = Math.min(view.w / (n * 2.7), band / 2.5, cap);
  // вариант 2 — по две штуки слева и справа от колонки кнопок
  const colH = box.badgeY - box.titleBottom - pad * 2;
  const sideS = Math.min((box.btnLeft - pad * 2) / 2.4, colH / 5, cap);
  if (sideS > rowS * 1.25) {
    const slot = colH / 2, midY = box.titleBottom + pad + slot;
    const wob = Math.min(5 * view.ui, Math.max(0, slot / 2 - sideS * 1.18));
    const xL = box.btnLeft / 2, xR = (view.w + box.btnRight) / 2;
    const spots = [[xL, midY - slot / 2], [xL, midY + slot / 2], [xR, midY - slot / 2], [xR, midY + slot / 2]];
    const side = [0, 1, 3, 4];
    for (let i = 0; i < spots.length; i++) {
      ctx.globalAlpha = 0.9;
      drawCreature(MENU_DECOR[side[i]], spots[i][0], spots[i][1] + Math.sin(t * 2 + i) * wob, sideS, t + i);
      ctx.globalAlpha = 1;
    }
    return;
  }
  if (rowS < 10) return;
  const midY = box.btnBottom + pad + band / 2;
  const wob = Math.min(6 * view.ui, Math.max(0, band / 2 - rowS * 1.18));
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.9;
    drawCreature(MENU_DECOR[pick[i]], view.w * ((i + 0.5) / n), midY + Math.sin(t * 2 + i) * wob, rowS, t + i);
    ctx.globalAlpha = 1;
  }
}

/* ---------- Настройки ---------- */
function drawSettings() {
  text(L("settings"), view.w / 2, view.h * 0.12, F(28), PAL.gold);
  const bw = Math.min(320 * view.ui, view.w * 0.86), bx = view.w / 2 - bw / 2;
  let y = view.h * 0.26, bh = 52 * view.ui, gap = 14 * view.ui;
  btn("sfx", bx, y, bw, bh, L("sound") + ": " + (Save.data.sfx ? L("on") : L("off")), { color: PAL.panel2, textColor: Save.data.sfx ? PAL.good : PAL.dim, fs: F(18) }); y += bh + gap;
  btn("music", bx, y, bw, bh, L("music") + ": " + (Save.data.music ? L("on") : L("off")), { color: PAL.panel2, textColor: Save.data.music ? PAL.good : PAL.dim, fs: F(18) }); y += bh + gap;
  // язык
  text(L("lang"), view.w / 2, y + 8 * view.ui, F(15), PAL.dim); y += 26 * view.ui;
  const hw = (bw - gap) / 2;
  btn("lang_ru", bx, y, hw, bh, "Русский", { color: LANG === "ru" ? PAL.good : PAL.panel2, textColor: LANG === "ru" ? "#0e1626" : PAL.text, fs: F(17) });
  btn("lang_en", bx + hw + gap, y, hw, bh, "English", { color: LANG === "en" ? PAL.good : PAL.panel2, textColor: LANG === "en" ? "#0e1626" : PAL.text, fs: F(17) }); y += bh + gap * 2;
  btn("back", bx, view.h * 0.86, bw, 46 * view.ui, L("back"), { color: PAL.panel2, textColor: PAL.text });
}

/* ---------- Книга мемов (бестиарий) ---------- */
const BOOK_ORDER = ["grenny", "huggy", "skibi", "nommy", "sigma", "hamster", "chill", "healer", "booster", "breaker", "boss"];
function speedWord(sp) { return sp < 1.0 ? L("speedSlow") : sp < 1.6 ? L("speedMed") : sp < 2.2 ? L("speedFast") : L("speedVFast"); }
function drawBook() {
  text(L("bookTitle"), view.w / 2, view.h * 0.08, F(26), PAL.gold);
  const areaW = Math.min(view.w * 0.94, 520 * view.ui), bx = view.w / 2 - areaW / 2;
  const cols = view.w < 520 ? 3 : 4, gap = 10 * view.ui;
  const cw = (areaW - gap * (cols - 1)) / cols;
  const rows = Math.ceil(BOOK_ORDER.length / cols);
  const gridY = view.h * 0.15;
  const avail = view.h * 0.84 - gridY;
  const chh = Math.min(cw * 1.1, (avail - gap * (rows - 1)) / rows);
  for (let i = 0; i < BOOK_ORDER.length; i++) {
    const type = BOOK_ORDER[i], r = Math.floor(i / cols), c = i % cols;
    const x = bx + c * (cw + gap), y = gridY + r * (chh + gap);
    rr(ctx, x, y, cw, chh, 10 * view.ui); ctx.fillStyle = "#1f2f4c"; ctx.fill();
    ctx.strokeStyle = ENEMIES[type].boss ? PAL.danger : "#2f4569"; ctx.lineWidth = 2 * view.ui; ctx.stroke();
    drawCreature(type, x + cw * 0.5, y + chh * 0.44, Math.min(cw, chh) * 0.28, performance.now() / 1000 + i);
    text(eName(type), x + cw / 2, y + chh * 0.86, F(11), PAL.text);
    G.hot.push({ id: "mon_" + type, x, y, w: cw, h: chh, disabled: false });
  }
  const bw = Math.min(240 * view.ui, view.w * 0.8);
  btn("back", view.w / 2 - bw / 2, view.h * 0.9, bw, 42 * view.ui, L("back"), { color: PAL.panel2, textColor: PAL.text });
  if (G.bookMon) drawMonsterInfo(G.bookMon);
}
function drawMonsterInfo(type) {
  const e = ENEMIES[type];
  dim(0.72);
  const w = Math.min(360 * view.ui, view.w * 0.92), h = 360 * view.ui;
  const p = panelBox(w, h);
  drawCreature(type, view.w / 2, p.y + 78 * view.ui, 40 * view.ui, performance.now() / 1000);
  text(eName(type), view.w / 2, p.y + 130 * view.ui, F(22), e.boss ? PAL.danger : PAL.text);
  // био (перенос по словам)
  wrapText(eBio(type), view.w / 2, p.y + 158 * view.ui, w - 48 * view.ui, F(13), PAL.dim, 18 * view.ui);
  // статы
  const sx = p.x + 28 * view.ui;
  let sy = p.y + 210 * view.ui;
  const abil = e.heal ? (LANG === "en" ? "Heals allies" : "Лечит союзников") : e.boost ? (LANG === "en" ? "Speeds up allies" : "Ускоряет союзников") : e.attack ? (LANG === "en" ? "Breaks towers" : "Ломает башни") : (LANG === "en" ? "—" : "—");
  const rows2 = [
    [L("hp"), String(e.hp)],
    [L("speed"), speedWord(e.speed)],
    [L("ability"), abil]
  ];
  for (const rw of rows2) {
    text(rw[0], sx, sy, F(13), PAL.dim, "left");
    text(rw[1], view.w / 2 + 30 * view.ui, sy, F(13), PAL.good, "left");
    sy += 24 * view.ui;
  }
  const bw = w - 48 * view.ui;
  btn("mon_close", view.w / 2 - bw / 2, p.y + h - 56 * view.ui, bw, 44 * view.ui, L("close"), { color: PAL.good });
}
function wrapText(str, cxp, y, maxW, fs, color, lineH) {
  ctx.font = "bold " + fs + "px \"Trebuchet MS\", sans-serif";
  const words = str.split(" "); let line = "", yy = y;
  for (const wd of words) {
    const test = line ? line + " " + wd : wd;
    if (ctx.measureText(test).width > maxW && line) { text(line, cxp, yy, fs, color); line = wd; yy += lineH; }
    else line = test;
  }
  if (line) text(line, cxp, yy, fs, color);
}

/* ---------- Выбор уровня ---------- */
function drawLevels() {
  text(L("levelSelect"), view.w / 2, view.h * 0.1, F(28), PAL.gold);
  const cols = 5, rows = 2;
  const gap = 12 * view.ui;
  const areaW = Math.min(view.w * 0.9, 560 * view.ui);
  const cw = (areaW - gap * (cols - 1)) / cols;
  const ch = cw;
  const startX = view.w / 2 - areaW / 2;
  const startY = view.h * 0.2;
  for (let i = 0; i < 10; i++) {
    const n = i + 1;
    const c = i % cols, r = Math.floor(i / cols);
    const x = startX + c * (cw + gap), y = startY + r * (ch + gap + 8 * view.ui);
    const unlocked = n <= Save.data.unlocked;
    rr(ctx, x, y, cw, ch, 14 * view.ui);
    ctx.fillStyle = unlocked ? PAL.panel2 : "#182238"; ctx.fill();
    ctx.strokeStyle = unlocked ? PAL.good : "#28324a"; ctx.lineWidth = 2 * view.ui; ctx.stroke();
    text(String(n), x + cw / 2, y + ch * 0.42, F(26), unlocked ? PAL.text : PAL.dim);
    if (unlocked) {
      const st = Save.data.stars[n] || 0;
      for (let k = 0; k < 3; k++) drawStar(ctx, x + cw / 2 - 16 * view.ui + k * 16 * view.ui, y + ch * 0.75, 7 * view.ui, k < st);
      G.hot.push({ id: "lvl_" + n, x, y, w: cw, h: ch, disabled: false });
    } else {
      // замок
      ctx.fillStyle = PAL.dim;
      rr(ctx, x + cw / 2 - 8 * view.ui, y + ch * 0.62, 16 * view.ui, 13 * view.ui, 3 * view.ui); ctx.fill();
      ctx.strokeStyle = PAL.dim; ctx.lineWidth = 3 * view.ui;
      ctx.beginPath(); ctx.arc(x + cw / 2, y + ch * 0.62, 6 * view.ui, Math.PI, TAU); ctx.stroke();
    }
  }
  const bw = Math.min(260 * view.ui, view.w * 0.8), bx = view.w / 2 - bw / 2;
  btn("endless", bx, view.h * 0.78, bw, 46 * view.ui, L("endless"), { color: PAL.blue, textColor: PAL.text });
  btn("back", bx, view.h * 0.88, bw, 44 * view.ui, L("back"), { color: PAL.panel2, textColor: PAL.text });
}

/* ---------- Общие помощники экранов ---------- */
function drawCoinBalance(y) {
  drawAmount("gem", view.w / 2, y, Save.data.coins, F(18), PAL.gem, "center");
}
function drawTabBar(tabs, active, prefix, y, areaW, bx) {
  const gap = 8 * view.ui, tw = (areaW - gap * (tabs.length - 1)) / tabs.length, h = 34 * view.ui;
  for (let i = 0; i < tabs.length; i++) {
    const t = tabs[i], on = active === t[0];
    btn(prefix + t[0], bx + i * (tw + gap), y, tw, h, t[1], { color: on ? (t[2] || PAL.good) : PAL.panel2, textColor: on ? "#0e1626" : PAL.text, fs: F(13) });
  }
}
function drawCrateBox(g, x, y, s, accent) {
  g.strokeStyle = PAL.outline; g.lineWidth = Math.max(1.5, s * 0.11);
  rr(g, x - s, y - s * 0.5, s * 2, s * 1.35, s * 0.16); g.fillStyle = "#8a5a34"; g.fill(); g.stroke();
  rr(g, x - s, y - s * 0.9, s * 2, s * 0.55, s * 0.15); g.fillStyle = "#a06b3e"; g.fill(); g.stroke();
  g.fillStyle = "#c9c9d4";
  g.fillRect(x - s * 0.16, y - s * 0.9, s * 0.32, s * 1.75);
  g.beginPath(); g.arc(x, y - s * 0.1, s * 0.26, 0, TAU); g.fillStyle = accent; g.fill(); g.stroke();
  g.beginPath(); g.arc(x - s * 0.08, y - s * 0.18, s * 0.09, 0, TAU); g.fillStyle = "rgba(255,255,255,0.6)"; g.fill();
}

/* ---------- Магазин ---------- */
function shopTabs() { return [["crates", L("crates")], ["skins", L("skins")], ["boosts", L("upgrades")]]; }
function oddsStr(rp, mp, lp) {
  const n = LANG === "en" ? ["Rare", "Myth", "Leg"] : ["Ред.", "Миф.", "Лег."];
  return n[0] + " " + rp + "%  ·  " + n[1] + " " + mp + "%  ·  " + n[2] + " " + lp + "%";
}
function drawShop() {
  text(L("shop"), view.w / 2, view.h * 0.075, F(26), PAL.gold);
  drawCoinBalance(view.h * 0.135);
  const areaW = Math.min(view.w * 0.92, 480 * view.ui), bx = view.w / 2 - areaW / 2;
  drawTabBar(shopTabs(), G.shopTab, "tab_", view.h * 0.18, areaW, bx);
  const top = view.h * 0.25;
  if (G.shopTab === "crates") drawShopCrates(top, areaW, bx);
  else if (G.shopTab === "skins") drawShopSkins(top, areaW, bx);
  else drawShopBoosts(top, areaW, bx);
  const bw = Math.min(240 * view.ui, view.w * 0.8);
  btn("back", view.w / 2 - bw / 2, view.h * 0.9, bw, 42 * view.ui, L("back"), { color: PAL.panel2, textColor: PAL.text });
}
function drawShopCrates(top, areaW, bx) {
  const cards = [
    { id: "crate_basic", name: L("crateBasic"), accent: RARITY.rare.color, odds: oddsStr(77, 20, 3), price: CRATE_COST.basic, enabled: Save.data.coins >= CRATE_COST.basic },
    { id: "crate_gold", name: L("crateGold"), accent: RARITY.legend.color, odds: oddsStr(55, 35, 10), price: CRATE_COST.gold, enabled: Save.data.coins >= CRATE_COST.gold },
    { id: "crate_ad", name: L("crateAd"), accent: PAL.blue, odds: oddsStr(64, 30, 6), label: L("adWord"), enabled: true, ad: true }
  ];
  const ch = Math.min(88 * view.ui, (view.h * 0.6) / 3 - 10 * view.ui);
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i], y = top + i * (ch + 10 * view.ui);
    rr(ctx, bx, y, areaW, ch, 14 * view.ui); ctx.fillStyle = "#1f2f4c"; ctx.fill();
    ctx.strokeStyle = c.accent; ctx.lineWidth = 2 * view.ui; ctx.stroke();
    drawCrateBox(ctx, bx + ch * 0.55, y + ch * 0.5, ch * 0.3, c.accent);
    const tx = bx + ch * 1.15;
    text(c.name, tx, y + ch * 0.3, F(16), PAL.text, "left");
    text(c.odds, tx, y + ch * 0.54, F(11), PAL.dim, "left");
    text(c.ad ? L("cannonForAd") : L("openGet"), tx, y + ch * 0.76, F(11), c.ad ? PAL.blue : PAL.dim, "left");
    const bwB = 116 * view.ui, bhB = 38 * view.ui, bxB = bx + areaW - bwB - 10 * view.ui, byB = y + ch / 2 - bhB / 2;
    const col = c.ad ? "#ff9f45" : (c.enabled ? PAL.gem : "#3a4763"), tc = c.enabled ? "#0e1626" : "#9fb0c8";
    btn(c.id, bxB, byB, bwB, bhB, c.ad ? c.label : "", { color: col, textColor: tc, disabled: false, fs: F(13) });
    if (!c.ad) drawAmount("gem", bxB + bwB / 2, byB + bhB / 2, c.price, F(15), tc, "center");
  }
  text(L("cratesHint"), view.w / 2, top + 3 * (ch + 10 * view.ui) + 8 * view.ui, F(12), PAL.dim);
}
function drawShopSkins(top, areaW, bx) {
  let y = top;
  text(L("fieldSkins"), bx, y, F(16), PAL.text, "left"); y += 26 * view.ui;
  const sw = (areaW - 20 * view.ui) / 3;
  for (let i = 0; i < SHOP_SKINS.length; i++) {
    const it = SHOP_SKINS[i], sk = SKINS[it.id];
    const x = bx + i * (sw + 10 * view.ui);
    const owned = Save.data.skins.indexOf(it.id) >= 0, active = Save.data.skin === it.id;
    rr(ctx, x, y, sw, 78 * view.ui, 12 * view.ui);
    ctx.fillStyle = active ? PAL.panel2 : "#1f2f4c"; ctx.fill();
    if (active) { ctx.strokeStyle = PAL.good; ctx.lineWidth = 2 * view.ui; ctx.stroke(); }
    ctx.fillStyle = sk.grassA; rr(ctx, x + 8 * view.ui, y + 8 * view.ui, sw - 16 * view.ui, 26 * view.ui, 4 * view.ui); ctx.fill();
    ctx.fillStyle = sk.path; ctx.fillRect(x + 8 * view.ui, y + 17 * view.ui, sw - 16 * view.ui, 9 * view.ui);
    text(skName(it.id), x + sw / 2, y + 48 * view.ui, F(12), PAL.text);
    if (owned) text(active ? L("chosen") : L("choose"), x + sw / 2, y + 66 * view.ui, F(12), PAL.good);
    else drawAmount("gem", x + sw / 2, y + 66 * view.ui, it.cost, F(12), Save.data.coins >= it.cost ? PAL.gem : PAL.danger, "center");
    G.hot.push({ id: "skin_" + it.id, x, y, w: sw, h: 78 * view.ui, disabled: false });
  }
}
function drawShopBoosts(top, areaW, bx) {
  let y = top;
  text(L("permUp"), bx, y, F(16), PAL.text, "left"); y += 26 * view.ui;
  const iw = (areaW - 10 * view.ui) / 2, ih = 110 * view.ui;
  drawShopItem(bx, y, iw, ih, L("goldBag"), L("goldBagSub"), L("nowPlus") + Save.data.startGold, Save.data.startGold >= 120 ? L("max") : 200, "buy_gold", Save.data.coins >= 200);
  drawShopItem(bx + iw + 10 * view.ui, y, iw, ih, L("medkit"), L("medkitSub"), L("nowPlus") + Save.data.extraLives, Save.data.extraLives >= 15 ? L("max") : 250, "buy_lives", Save.data.coins >= 250);
}
function drawShopItem(x, y, w, h, title, sub, cur, buyLabel, id, affordable) {
  rr(ctx, x, y, w, h, 12 * view.ui); ctx.fillStyle = "#1f2f4c"; ctx.fill();
  text(title, x + 10 * view.ui, y + 18 * view.ui, F(14), PAL.text, "left");
  text(sub, x + 10 * view.ui, y + 38 * view.ui, F(11), PAL.dim, "left");
  text(cur, x + 10 * view.ui, y + 56 * view.ui, F(11), PAL.good, "left");
  const bh = 26 * view.ui, bw = w - 20 * view.ui, byB = y + h - bh - 8 * view.ui, bxB = x + 10 * view.ui;
  const isMax = typeof buyLabel !== "number";
  const col = isMax ? PAL.panel2 : (affordable ? PAL.gem : "#3a4763"), tc = isMax ? PAL.gold : (affordable ? "#0e1626" : "#9fb0c8");
  btn(id, bxB, byB, bw, bh, isMax ? buyLabel : "", { color: col, textColor: tc, disabled: isMax, fs: F(12) });
  if (!isMax) drawAmount("gem", bxB + bw / 2, byB + bh / 2, buyLabel, F(13), tc, "center");
}

/* ---------- Отряд / коллекция пушек ---------- */
function drawSquad() {
  text(L("squad"), view.w / 2, view.h * 0.06, F(24), PAL.gold);
  text(L("squadHint"), view.w / 2, view.h * 0.105, F(13), PAL.dim);
  drawGem(ctx, view.w - 94 * view.ui, view.h * 0.06, 10 * view.ui);
  text(String(Save.data.coins), view.w - 78 * view.ui, view.h * 0.06, F(15), PAL.gem, "left");

  const areaW = Math.min(view.w * 0.94, 500 * view.ui), bx = view.w / 2 - areaW / 2;
  // слоты отряда
  const sgap = 10 * view.ui;
  const slotSize = Math.min((areaW - sgap * 3) / 4, 66 * view.ui);
  const rowW = slotSize * 4 + sgap * 3, sx0 = view.w / 2 - rowW / 2, slotY = view.h * 0.15;
  for (let i = 0; i < 4; i++) {
    const x = sx0 + i * (slotSize + sgap), id = Save.data.squad[i];
    rr(ctx, x, slotY, slotSize, slotSize, 10 * view.ui);
    if (id) {
      const def = TOWERS[id];
      ctx.fillStyle = "#1f2f4c"; ctx.fill();
      ctx.strokeStyle = RARITY[def.rarity].color; ctx.lineWidth = 2.5 * view.ui; ctx.stroke();
      drawTowerIcon(ctx, x + slotSize * 0.5, slotY + slotSize * 0.42, slotSize * 0.32, id);
      text(cName(id), x + slotSize / 2, slotY + slotSize * 0.84, F(9), PAL.text);
      G.hot.push({ id: "slot_" + i, x, y: slotY, w: slotSize, h: slotSize, disabled: false });
    } else {
      ctx.fillStyle = "#182238"; ctx.fill();
      ctx.setLineDash([5 * view.ui, 4 * view.ui]); ctx.strokeStyle = PAL.dim; ctx.lineWidth = 2 * view.ui; ctx.stroke(); ctx.setLineDash([]);
      text("+", x + slotSize / 2, slotY + slotSize / 2, F(24), PAL.dim);
    }
  }
  // вкладки редкости
  const tabY = slotY + slotSize + 14 * view.ui;
  drawTabBar([["rare", rName("rare"), RARITY.rare.color], ["mythic", rName("mythic"), RARITY.mythic.color], ["legend", rName("legend"), RARITY.legend.color]], G.colTab, "ctab_", tabY, areaW, bx);
  // сетка пушек выбранной редкости
  const list = cannonsOfRarity(G.colTab);
  const cols = Math.min(list.length, 4), gap = 10 * view.ui;
  const cw = (areaW - gap * (cols - 1)) / cols;
  const rows = Math.ceil(list.length / cols);
  const gridY = tabY + 46 * view.ui;
  const avail = view.h * 0.86 - gridY;
  const chh = Math.min(cw * 1.15, (avail - gap * (rows - 1)) / rows);
  for (let i = 0; i < list.length; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    drawCannonCell(bx + c * (cw + gap), gridY + r * (chh + gap), cw, chh, list[i]);
  }
  // кнопки
  const bw2 = (Math.min(view.w * 0.86, 360 * view.ui) - 12 * view.ui) / 2;
  const bxx = view.w / 2 - (bw2 * 2 + 12 * view.ui) / 2;
  btn("openbox", bxx, view.h * 0.9, bw2, 42 * view.ui, L("openCrate"), { color: PAL.gold, fs: F(14) });
  btn("back", bxx + bw2 + 12 * view.ui, view.h * 0.9, bw2, 42 * view.ui, L("back"), { color: PAL.panel2, textColor: PAL.text, fs: F(14) });
  // карточка описания пушки поверх (видно даже до покупки)
  if (G.infoCannon) drawCannonInfo(G.infoCannon);
}
function drawCannonInfo(id) {
  const def = TOWERS[id], rar = RARITY[def.rarity];
  const owned = ownsCannon(id), insq = inSquad(id);
  dim(0.72);
  const w = Math.min(360 * view.ui, view.w * 0.92), h = 380 * view.ui;
  const p = panelBox(w, h);
  // шапка редкости
  rr(ctx, p.x, p.y, w, 34 * view.ui, 20 * view.ui); ctx.fillStyle = rar.color; ctx.fill();
  rr(ctx, p.x, p.y + 17 * view.ui, w, 17 * view.ui, 0); ctx.fillStyle = rar.color; ctx.fill();
  text(rName(def.rarity).toUpperCase() + " " + L("cannonWord"), view.w / 2, p.y + 17 * view.ui, F(14), "#0e1626");
  // иконка + имя
  drawTowerIcon(ctx, view.w / 2, p.y + 82 * view.ui, 34 * view.ui, id);
  text(cName(id), view.w / 2, p.y + 122 * view.ui, F(20), PAL.text);
  text(cDesc(id), view.w / 2, p.y + 146 * view.ui, F(12), PAL.dim);
  // характеристики по уровням
  const st = def.levels;
  const tx = p.x + 24 * view.ui;
  text(L("lvl"), tx, p.y + 178 * view.ui, F(11), PAL.dim, "left");
  text(L("dmg"), tx + 44 * view.ui, p.y + 178 * view.ui, F(11), PAL.dim, "left");
  text(L("range"), tx + 108 * view.ui, p.y + 178 * view.ui, F(11), PAL.dim, "left");
  text(L("rate"), tx + 178 * view.ui, p.y + 178 * view.ui, F(11), PAL.dim, "left");
  for (let i = 0; i < 3; i++) {
    const yy = p.y + (200 + i * 20) * view.ui;
    text(String(i + 1), tx, yy, F(12), PAL.text, "left");
    text(String(st[i].dmg), tx + 44 * view.ui, yy, F(12), PAL.good, "left");
    text(st[i].range.toFixed(1), tx + 108 * view.ui, yy, F(12), PAL.good, "left");
    text(st[i].rate.toFixed(1), tx + 178 * view.ui, yy, F(12), PAL.good, "left");
  }
  // кнопки
  const bw = w - 48 * view.ui, bxo = view.w / 2 - bw / 2;
  const by = p.y + h - 96 * view.ui, bh = 40 * view.ui, gap = 10 * view.ui;
  if (!owned) {
    const price = rar.buy, can = Save.data.coins >= price;
    text(L("price"), view.w / 2 - 26 * view.ui, by - 18 * view.ui, F(13), PAL.dim, "right");
    drawAmount("gem", view.w / 2 - 18 * view.ui, by - 18 * view.ui, price, F(15), can ? PAL.gem : PAL.danger, "left");
    btn("info_buy", bxo, by, bw, bh, L("buy"), { color: can ? PAL.gem : "#3a4763", textColor: can ? "#0e1626" : "#9fb0c8", disabled: false, fs: F(15) });
  } else {
    btn("info_squad", bxo, by, bw, bh, insq ? L("removeSquad") : L("addSquad"), { color: insq ? PAL.panel2 : PAL.good, textColor: insq ? PAL.text : "#0e1626", fs: F(15) });
  }
  btn("info_close", bxo, by + bh + gap, bw, bh, L("close"), { color: PAL.panel2, textColor: PAL.text, fs: F(14) });
}
function drawCannonCell(x, y, w, h, id) {
  const def = TOWERS[id], rc = RARITY[def.rarity].color;
  const owned = ownsCannon(id), insq = inSquad(id);
  rr(ctx, x, y, w, h, 10 * view.ui); ctx.fillStyle = "#1f2f4c"; ctx.fill();
  ctx.strokeStyle = insq ? PAL.good : rc; ctx.lineWidth = (insq ? 3 : 2) * view.ui; ctx.stroke();
  ctx.globalAlpha = owned ? 1 : 0.5;
  drawTowerIcon(ctx, x + w * 0.5, y + h * 0.32, Math.min(w, h) * 0.3, id);
  text(cName(id), x + w / 2, y + h * 0.6, F(11), PAL.text);
  ctx.globalAlpha = 1;
  if (insq) text(L("inSquad"), x + w / 2, y + h * 0.82, F(10), PAL.good);
  else if (owned) text(L("openArrow"), x + w / 2, y + h * 0.82, F(10), PAL.gold);
  else {
    drawGem(ctx, x + w / 2 - 18 * view.ui, y + h * 0.82, 6 * view.ui);
    text(String(RARITY[def.rarity].buy), x + w / 2 - 4 * view.ui, y + h * 0.82, F(10), Save.data.coins >= RARITY[def.rarity].buy ? PAL.gem : PAL.danger, "left");
    // замочек
    const lx = x + w - 13 * view.ui, ly = y + 13 * view.ui;
    ctx.fillStyle = PAL.dim; rr(ctx, lx - 5 * view.ui, ly, 10 * view.ui, 8 * view.ui, 2 * view.ui); ctx.fill();
    ctx.strokeStyle = PAL.dim; ctx.lineWidth = 2 * view.ui;
    ctx.beginPath(); ctx.arc(lx, ly, 3.5 * view.ui, Math.PI, TAU); ctx.stroke();
  }
  G.hot.push({ id: "can_" + id, x, y, w, h, disabled: false });
}

/* ---------- Открытие ящика (награда) ---------- */
function drawCrate() {
  ctx.fillStyle = "#0b1322"; ctx.fillRect(0, 0, view.w, view.h);
  const cr = G.crateResult;
  if (!cr) { G.state = G.prevState || "shop"; return; }
  const def = TOWERS[cr.id], rc = RARITY[def.rarity].color;
  const t = Math.min(1, G.crateAnim / 0.5);
  const cxp = view.w / 2, cyp = view.h * 0.4;
  // лучи
  ctx.save(); ctx.globalAlpha = 0.45 * t;
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = rc; ctx.lineWidth = 3 * view.ui;
    const a = i * TAU / 12 + G.crateAnim * 0.6;
    ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp + Math.cos(a) * view.h * 0.5, cyp + Math.sin(a) * view.h * 0.5); ctx.stroke();
  }
  ctx.restore();
  // карточка
  const cw = Math.min(240 * view.ui, view.w * 0.72), chh = cw * 1.1;
  const sc = 0.6 + 0.4 * t;
  ctx.save(); ctx.translate(cxp, cyp); ctx.scale(sc, sc);
  rr(ctx, -cw / 2, -chh / 2, cw, chh, 16 * view.ui); ctx.fillStyle = PAL.panel; ctx.fill();
  ctx.strokeStyle = rc; ctx.lineWidth = 4 * view.ui; ctx.stroke();
  rr(ctx, -cw / 2, -chh / 2, cw, 30 * view.ui, 16 * view.ui); ctx.fillStyle = rc; ctx.fill();
  text(rName(def.rarity).toUpperCase(), 0, -chh / 2 + 15 * view.ui, F(14), "#0e1626");
  drawTowerIcon(ctx, 0, -chh * 0.05, cw * 0.26, cr.id);
  text(cName(cr.id), 0, chh * 0.22, F(18), PAL.text);
  text(cDesc(cr.id), 0, chh * 0.36, F(11), PAL.dim);
  ctx.restore();
  // подпись
  if (cr.isNew) text(L("newCannon"), cxp, view.h * 0.68, F(20), PAL.good);
  else { text(L("dupEx"), cxp, view.h * 0.65, F(13), PAL.dim); drawAmount("gem", cxp, view.h * 0.7, "+" + cr.coins, F(20), PAL.gem, "center"); }
  // кнопки
  const bw = Math.min(300 * view.ui, view.w * 0.82), bx = cxp - bw / 2;
  const y = view.h * 0.78, bh = 44 * view.ui, gap = 10 * view.ui;
  if (cr.isNew && !inSquad(cr.id) && Save.data.squad.length < 4) {
    const hw = (bw - gap) / 2;
    btn("crate_add", bx, y, hw, bh, L("toSquadBtn"), { color: PAL.good });
    btn("crate_ok", bx + hw + gap, y, hw, bh, L("take"), { color: PAL.panel2, textColor: PAL.text });
  } else {
    btn("crate_ok", bx, y, bw, bh, L("take"), { color: PAL.good });
  }
}

/* =====================================================================
   СТАРТ
   ===================================================================== */
window.addEventListener("load", initSDK);
