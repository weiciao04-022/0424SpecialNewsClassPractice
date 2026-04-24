// 2016 政治獻金資料庫 - 互動腳本
// 功能：CSV 載入、數值清理、搜尋、排序、區域篩選、count-up、進場動畫、載入更多。

const PARTY_COLOR = {
  民主進步黨: '#00C853',
  中國國民黨: '#2979FF',
  親民黨: '#FF9800',
  時代力量: '#FFD600',
};

const REGIONS = {
  北部: ['臺北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
  中部: ['苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣'],
  南部: ['嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣'],
  東部: ['花蓮縣', '臺東縣'],
  離島: ['澎湖縣', '金門縣', '連江縣'],
};

const EXAMPLES = ['民主進步黨', '中國國民黨', '臺北市', '高雄市', '營利事業捐贈', '個人捐贈'];

const app = {
  all: [],
  filtered: [],
  search: '',
  sort: 'income',
  region: '',
  visible: 12,
};

const el = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  exampleChips: document.getElementById('exampleChips'),
  summaryGrid: document.getElementById('summaryGrid'),
  regionGrid: document.getElementById('regionGrid'),
  picksGrid: document.getElementById('picksGrid'),
  sortSelect: document.getElementById('sortSelect'),
  activeFilterText: document.getElementById('activeFilterText'),
  resultsList: document.getElementById('resultsList'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  allLoadedMsg: document.getElementById('allLoadedMsg'),
  cardTemplate: document.getElementById('resultCardTemplate'),
};

function num(v) {
  const cleaned = String(v ?? '').replace(/,/g, '').replace(/"/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function pct(v) {
  const cleaned = String(v ?? '').replace('%', '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) {
  return Math.round(n || 0).toLocaleString('zh-TW');
}

function getCity(area = '') {
  const m = area.match(
    /(臺北市|台北市|新北市|基隆市|桃園市|新竹市|新竹縣|宜蘭縣|苗栗縣|臺中市|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|臺南市|台南市|高雄市|屏東縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)/
  );
  return m ? m[1].replace('台', '臺') : area;
}

function parseRow(r) {
  return {
    name: r['姓名'] || '',
    party: r['推薦政黨'] || '無黨籍／其他',
    area: r['地區'] || '',
    city: getCity(r['地區'] || ''),
    committee: r['委員會'] || '',
    votes: num(r['得票數']),
    voteRate: pct(r['得票率']),
    elected: r['當選註記'] === '*',
    companyCount: num(r['捐贈企業數']),
    totalIncome: num(r['總收入']),
    personalRate: pct(r['個人捐贈比例']),
    personalIncome: num(r['個人捐贈收入']),
    businessRate: pct(r['營利事業捐贈比例']),
    businessIncome: num(r['營利事業捐贈收入']),
  };
}

function loadCSV() {
  Papa.parse('2016.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: ({ data }) => {
      app.all = data.map(parseRow).filter((d) => d.name);
      renderExamples();
      renderSummary();
      renderRegions();
      renderPicks();
      updateList();
    },
    error: () => {
      el.resultsList.innerHTML = '<article class="result-card glass">CSV 讀取失敗，請確認 2016.csv 與檔案在同一層。</article>';
    },
  });
}

function renderExamples() {
  el.exampleChips.innerHTML = '';
  EXAMPLES.forEach((text) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = text;
    btn.addEventListener('click', () => {
      el.searchInput.value = text;
      app.search = text;
      app.visible = 12;
      updateList();
    });
    el.exampleChips.appendChild(btn);
  });
}

function renderSummary() {
  const totalCount = app.all.length;
  const totalIncome = app.all.reduce((s, d) => s + d.totalIncome, 0);
  const avgIncome = totalCount ? totalIncome / totalCount : 0;
  const maxIncome = [...app.all].sort((a, b) => b.totalIncome - a.totalIncome)[0];
  const maxCompany = [...app.all].sort((a, b) => b.companyCount - a.companyCount)[0];

  const cards = [
    { title: '候選人總數', value: totalCount, unit: '人', type: 'number' },
    { title: '總政治獻金收入', value: totalIncome, unit: '元', type: 'number' },
    { title: '平均總收入', value: avgIncome, unit: '元', type: 'number' },
    {
      title: '最高收入候選人',
      valueText: `${maxIncome?.name || '-'}（${fmt(maxIncome?.totalIncome)} 元）`,
      type: 'text',
    },
    {
      title: '捐贈企業數最多候選人',
      valueText: `${maxCompany?.name || '-'}（${fmt(maxCompany?.companyCount)} 家）`,
      type: 'text',
    },
  ];

  el.summaryGrid.innerHTML = '';
  cards.forEach((c) => {
    const article = document.createElement('article');
    article.className = 'summary-card glass reveal';
    article.innerHTML = `<div class="summary-title">${c.title}</div><div class="summary-value"></div>`;

    const valueNode = article.querySelector('.summary-value');
    if (c.type === 'number') {
      animateCount(valueNode, 0, c.value, c.unit);
    } else {
      valueNode.textContent = c.valueText;
    }

    el.summaryGrid.appendChild(article);
  });

  observeReveal();
}

function renderRegions() {
  el.regionGrid.innerHTML = '';
  Object.entries(REGIONS).forEach(([region, cities]) => {
    const rows = app.all.filter((d) => cities.includes(d.city));
    const income = rows.reduce((s, d) => s + d.totalIncome, 0);
    const avg = rows.length ? income / rows.length : 0;

    const card = document.createElement('article');
    card.className = `region-card glass reveal ${app.region === region ? 'active' : ''}`;
    card.innerHTML = `
      <div class="region-name">${region}</div>
      <div class="muted">候選人數：${fmt(rows.length)} 人</div>
      <div>總收入：${fmt(income)} 元</div>
      <div>平均收入：${fmt(avg)} 元</div>
    `;

    card.addEventListener('click', () => {
      app.region = app.region === region ? '' : region;
      app.visible = 12;
      renderRegions();
      updateList();
    });

    el.regionGrid.appendChild(card);
  });

  observeReveal();
}

function renderPicks() {
  const topIncome = [...app.all].sort((a, b) => b.totalIncome - a.totalIncome)[0];
  const topBusiness = [...app.all].sort((a, b) => b.businessIncome - a.businessIncome)[0];
  const topPersonalRate = [...app.all].sort((a, b) => b.personalRate - a.personalRate)[0];

  const picks = [
    {
      label: '總收入最高',
      row: topIncome,
      key: `總收入 ${fmt(topIncome?.totalIncome)} 元`,
      note: '這名候選人的金流規模位居資料庫前列，值得進一步追蹤其資金來源結構。',
    },
    {
      label: '營利事業捐贈收入最高',
      row: topBusiness,
      key: `營利事業捐贈收入 ${fmt(topBusiness?.businessIncome)} 元`,
      note: '企業資金比重偏高，呈現其與特定產業網絡可能的高連動性。',
    },
    {
      label: '個人捐贈比例最高',
      row: topPersonalRate,
      key: `個人捐贈比例 ${topPersonalRate?.personalRate?.toFixed(2) || '0.00'}%`,
      note: '以個人捐贈為主體，顯示其募款結構與主流候選人有明顯差異。',
    },
  ];

  el.picksGrid.innerHTML = picks
    .map(
      (p) => `
      <article class="pick-card glass reveal">
        <div class="summary-title">精選：${p.label}</div>
        <div class="summary-value">${p.row?.name || '-'}</div>
        <div>${p.row?.party || '-'}｜${p.row?.area || '-'}</div>
        <div class="muted">${p.key}</div>
        <p>${p.note}</p>
      </article>
    `
    )
    .join('');

  observeReveal();
}

function inRegion(row) {
  if (!app.region) return true;
  return REGIONS[app.region]?.includes(row.city);
}

function inSearch(row) {
  if (!app.search) return true;
  const q = app.search.toLowerCase();
  return [row.name, row.party, row.area, row.committee].some((v) => String(v).toLowerCase().includes(q));
}

function sortRows(rows) {
  const by = {
    income: (a, b) => b.totalIncome - a.totalIncome,
    votes: (a, b) => b.votes - a.votes,
    voteRate: (a, b) => b.voteRate - a.voteRate,
    companyCount: (a, b) => b.companyCount - a.companyCount,
    personalRate: (a, b) => b.personalRate - a.personalRate,
    businessRate: (a, b) => b.businessRate - a.businessRate,
  }[app.sort];

  return [...rows].sort(by);
}

function partyColor(party) {
  return PARTY_COLOR[party] || '#9E9E9E';
}

function updateList() {
  const rows = sortRows(app.all.filter((row) => inSearch(row) && inRegion(row)));
  app.filtered = rows;
  el.activeFilterText.textContent = `目前篩選：${app.search || '全部關鍵字'}${app.region ? `｜${app.region}` : ''}（${fmt(rows.length)} 筆）`;
  renderResults();
}

function renderResults() {
  const visibleRows = app.filtered.slice(0, app.visible);
  el.resultsList.innerHTML = '';

  visibleRows.forEach((row) => {
    const node = el.cardTemplate.content.cloneNode(true);
    const card = node.querySelector('.result-card');
    const partyBadge = node.querySelector('.party-badge');

    node.querySelector('.name').textContent = row.name;
    partyBadge.textContent = row.party;
    partyBadge.style.background = partyColor(row.party);
    node.querySelector('.district').textContent = row.area;
    node.querySelector('.stats').innerHTML = `
      <div>得票數：${fmt(row.votes)}</div>
      <div>得票率：${row.voteRate.toFixed(2)}%</div>
      <div>總收入：${fmt(row.totalIncome)} 元</div>
      <div>個人捐贈比例：${row.personalRate.toFixed(2)}%</div>
      <div>營利事業捐贈比例：${row.businessRate.toFixed(2)}%</div>
      <div>是否當選：${row.elected ? '是' : '否'}</div>
    `;

    if (row.elected) {
      node.querySelector('.winner-tag').hidden = false;
      card.style.borderColor = 'rgba(68, 255, 176, 0.65)';
      card.style.boxShadow = '0 0 22px rgba(68, 255, 176, 0.25)';
    }

    el.resultsList.appendChild(node);
  });

  const hasMore = app.visible < app.filtered.length;
  el.loadMoreBtn.hidden = !hasMore;
  el.allLoadedMsg.hidden = hasMore;

  observeReveal();
}

function animateCount(target, from, to, unit = '') {
  const start = performance.now();
  const duration = 1100;

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const value = from + (to - from) * (1 - Math.pow(1 - p, 3));
    target.textContent = `${fmt(value)}${unit ? ` ${unit}` : ''}`;
    if (p < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

let revealObserver;
function observeReveal() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );
  }

  document.querySelectorAll('.reveal:not(.visible)').forEach((node) => revealObserver.observe(node));
}

function bindEvents() {
  el.searchInput.addEventListener('input', (e) => {
    app.search = e.target.value.trim();
    app.visible = 12;
    updateList();
  });

  el.searchBtn.addEventListener('click', () => {
    app.search = el.searchInput.value.trim();
    app.visible = 12;
    updateList();
  });

  el.sortSelect.addEventListener('change', (e) => {
    app.sort = e.target.value;
    app.visible = 12;
    updateList();
  });

  el.loadMoreBtn.addEventListener('click', () => {
    app.visible += 12;
    renderResults();
  });
}

bindEvents();
loadCSV();
