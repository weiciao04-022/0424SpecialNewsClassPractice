// 2016 立委政治獻金資料庫前端邏輯
// 使用 PapaParse 解析 CSV，並提供搜尋、排序、分區篩選、載入更多等功能。

const PARTY_COLORS = {
  民主進步黨: '#1B8F4D',
  中國國民黨: '#005BAC',
  親民黨: '#F39800',
  時代力量: '#F6C400',
};

const REGION_GROUPS = {
  北部: ['臺北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
  中部: ['苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣'],
  南部: ['嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣'],
  東部: ['花蓮縣', '臺東縣'],
  離島: ['澎湖縣', '金門縣', '連江縣'],
};

const EXAMPLE_QUERIES = ['民主進步黨', '中國國民黨', '臺北市', '高雄市', '司法法制', '營利事業捐贈'];

const state = {
  data: [],
  filtered: [],
  searchTerm: '',
  selectedRegion: '',
  sortBy: 'income',
  visibleCount: 12,
};

const els = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  exampleChips: document.getElementById('exampleChips'),
  summaryGrid: document.getElementById('summaryGrid'),
  regionGrid: document.getElementById('regionGrid'),
  picksGrid: document.getElementById('picksGrid'),
  resultsList: document.getElementById('resultsList'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  sortSelect: document.getElementById('sortSelect'),
  activeFilterText: document.getElementById('activeFilterText'),
  resultCardTemplate: document.getElementById('resultCardTemplate'),
};

function toNumber(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace(/,/g, '').replace(/"/g, '').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function toPercent(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace('%', '').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function formatNumber(num) {
  return Math.round(num || 0).toLocaleString('zh-TW');
}

function getPartyColor(party) {
  return PARTY_COLORS[party] || '#777777';
}

function extractCity(area = '') {
  const cityMatch = area.match(/(臺北市|台北市|新北市|基隆市|桃園市|新竹市|新竹縣|宜蘭縣|苗栗縣|臺中市|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|臺南市|台南市|高雄市|屏東縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)/);
  if (!cityMatch) return area;
  return cityMatch[1].replace('台', '臺');
}

function parseRow(row) {
  return {
    area: row['地區'] || '',
    city: extractCity(row['地區'] || ''),
    name: row['姓名'] || '',
    votes: toNumber(row['得票數']),
    party: row['推薦政黨'] || '無黨籍或其他',
    voteRate: toPercent(row['得票率']),
    electedMark: row['當選註記'] || '',
    incumbent: row['是否現任'] || '',
    committee: row['委員會'] || '',
    gender: row['性別'] || '',
    birthYear: row['出生年次'] || '',
    companyCount: toNumber(row['捐贈企業數']),
    totalIncome: toNumber(row['總收入']),
    personalIncome: toNumber(row['個人捐贈收入']),
    personalRate: toPercent(row['個人捐贈比例']),
    businessIncome: toNumber(row['營利事業捐贈收入']),
    businessRate: toPercent(row['營利事業捐贈比例']),
  };
}

function loadCSV() {
  Papa.parse('2016.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: ({ data }) => {
      state.data = data.map(parseRow).filter((d) => d.name);
      state.filtered = [...state.data];
      renderExampleChips();
      renderSummary();
      renderRegions();
      renderPicks();
      applyFiltersAndRender();
    },
    error: () => {
      els.resultsList.innerHTML = '<p>資料載入失敗，請確認 2016.csv 與網頁位於同一資料夾。</p>';
    },
  });
}

function renderExampleChips() {
  els.exampleChips.innerHTML = '';
  EXAMPLE_QUERIES.forEach((query) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = query;
    btn.addEventListener('click', () => {
      els.searchInput.value = query;
      state.searchTerm = query.trim();
      state.visibleCount = 12;
      applyFiltersAndRender();
    });
    els.exampleChips.appendChild(btn);
  });
}

function renderSummary() {
  const totalCandidates = state.data.length;
  const totalIncome = state.data.reduce((sum, d) => sum + d.totalIncome, 0);
  const avgIncome = totalCandidates ? totalIncome / totalCandidates : 0;
  const maxIncomeCandidate = [...state.data].sort((a, b) => b.totalIncome - a.totalIncome)[0];
  const maxCompanyCandidate = [...state.data].sort((a, b) => b.companyCount - a.companyCount)[0];

  const cards = [
    ['資料候選人總數', `${formatNumber(totalCandidates)} 人`],
    ['總政治獻金收入', `${formatNumber(totalIncome)} 元`],
    ['平均總收入', `${formatNumber(avgIncome)} 元`],
    ['最高收入候選人', `${maxIncomeCandidate?.name || '-'}（${formatNumber(maxIncomeCandidate?.totalIncome)} 元）`],
    ['捐贈企業數最多候選人', `${maxCompanyCandidate?.name || '-'}（${formatNumber(maxCompanyCandidate?.companyCount)} 家）`],
  ];

  els.summaryGrid.innerHTML = cards
    .map(
      ([label, value]) =>
        `<article><div class="summary-label">${label}</div><div class="summary-value">${value}</div></article>`
    )
    .join('');
}

function renderRegions() {
  els.regionGrid.innerHTML = '';
  Object.entries(REGION_GROUPS).forEach(([regionName, cities]) => {
    const records = state.data.filter((d) => cities.includes(d.city));
    const income = records.reduce((sum, d) => sum + d.totalIncome, 0);

    const card = document.createElement('article');
    card.className = 'region-card';
    if (state.selectedRegion === regionName) card.classList.add('active');
    card.innerHTML = `
      <div class="region-name">${regionName}</div>
      <div class="small-muted">${cities.join('、')}</div>
      <div>候選人：${formatNumber(records.length)} 人</div>
      <div>總收入：${formatNumber(income)} 元</div>
    `;

    card.addEventListener('click', () => {
      state.selectedRegion = state.selectedRegion === regionName ? '' : regionName;
      state.visibleCount = 12;
      renderRegions();
      applyFiltersAndRender();
    });

    els.regionGrid.appendChild(card);
  });
}

function renderPicks() {
  const topIncome = [...state.data].sort((a, b) => b.totalIncome - a.totalIncome)[0];
  const topBusiness = [...state.data].sort((a, b) => b.businessIncome - a.businessIncome)[0];
  const topPersonalRate = [...state.data].sort((a, b) => b.personalRate - a.personalRate)[0];

  const picks = [
    {
      title: '總收入最高',
      person: topIncome,
      metric: `總收入 ${formatNumber(topIncome?.totalIncome)} 元`,
      note: '在政治獻金規模上領先，反映其募款能力與組織動員。',
    },
    {
      title: '營利事業捐贈收入最高',
      person: topBusiness,
      metric: `營利事業捐贈收入 ${formatNumber(topBusiness?.businessIncome)} 元`,
      note: '企業來源占比較高，顯示其與產業界連結較強。',
    },
    {
      title: '個人捐贈比例最高',
      person: topPersonalRate,
      metric: `個人捐贈比例 ${topPersonalRate?.personalRate?.toFixed(2) || 0}%`,
      note: '個人小額或個人來源占比突出，具備不同募款結構。',
    },
  ];

  els.picksGrid.innerHTML = picks
    .map(
      ({ title, person, metric, note }) => `
      <article class="pick-card">
        <div class="summary-label">${title}</div>
        <div class="summary-value">${person?.name || '-'}</div>
        <div>${person?.party || '-'}｜${person?.area || '-'}</div>
        <div class="small-muted">${metric}</div>
        <p>${note}</p>
      </article>
    `
    )
    .join('');
}

function matchesSearch(item, term) {
  if (!term) return true;
  const keyword = term.toLowerCase();
  return [item.name, item.party, item.area, item.committee].some((field) =>
    String(field || '').toLowerCase().includes(keyword)
  );
}

function matchesRegion(item, regionName) {
  if (!regionName) return true;
  return REGION_GROUPS[regionName]?.includes(item.city);
}

function sortRecords(records) {
  const sorter = {
    income: (a, b) => b.totalIncome - a.totalIncome,
    votes: (a, b) => b.votes - a.votes,
    voteRate: (a, b) => b.voteRate - a.voteRate,
    companyCount: (a, b) => b.companyCount - a.companyCount,
    personalRate: (a, b) => b.personalRate - a.personalRate,
    businessRate: (a, b) => b.businessRate - a.businessRate,
  }[state.sortBy];

  return [...records].sort(sorter);
}

function applyFiltersAndRender() {
  const filtered = state.data.filter(
    (item) => matchesSearch(item, state.searchTerm) && matchesRegion(item, state.selectedRegion)
  );
  state.filtered = sortRecords(filtered);
  const filterMsg = state.searchTerm || state.selectedRegion
    ? `目前篩選：關鍵字「${state.searchTerm || '（無）'}」${state.selectedRegion ? `，區域「${state.selectedRegion}」` : ''}`
    : '目前篩選：全部資料';
  els.activeFilterText.textContent = `${filterMsg}（共 ${formatNumber(state.filtered.length)} 筆）`;
  renderResults();
}

function renderResults() {
  const visibleRecords = state.filtered.slice(0, state.visibleCount);
  els.resultsList.innerHTML = '';

  visibleRecords.forEach((item) => {
    const node = els.resultCardTemplate.content.cloneNode(true);
    node.querySelector('.party-bar').style.background = getPartyColor(item.party);
    node.querySelector('.name').textContent = item.name;
    node.querySelector('.elected-tag').textContent = item.electedMark === '*' ? '當選' : '未當選';
    node.querySelector('.meta').textContent = `${item.party}｜${item.area}｜委員會：${item.committee || '未標示'}`;

    node.querySelector('.metrics').innerHTML = `
      <div>得票數：${formatNumber(item.votes)}</div>
      <div>得票率：${item.voteRate.toFixed(2)}%</div>
      <div>總收入：${formatNumber(item.totalIncome)} 元</div>
      <div>個人捐贈比例：${item.personalRate.toFixed(2)}%</div>
      <div>營利事業捐贈比例：${item.businessRate.toFixed(2)}%</div>
      <div>是否當選：${item.electedMark === '*' ? '是' : '否'}</div>
    `;

    els.resultsList.appendChild(node);
  });

  const hasMore = state.visibleCount < state.filtered.length;
  els.loadMoreBtn.hidden = !hasMore;
}

function bindEvents() {
  els.searchBtn.addEventListener('click', () => {
    state.searchTerm = els.searchInput.value.trim();
    state.visibleCount = 12;
    applyFiltersAndRender();
  });

  els.searchInput.addEventListener('input', (event) => {
    state.searchTerm = event.target.value.trim();
    state.visibleCount = 12;
    applyFiltersAndRender();
  });

  els.sortSelect.addEventListener('change', (event) => {
    state.sortBy = event.target.value;
    state.visibleCount = 12;
    applyFiltersAndRender();
  });

  els.loadMoreBtn.addEventListener('click', () => {
    state.visibleCount += 12;
    renderResults();
  });
}

bindEvents();
loadCSV();
