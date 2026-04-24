const TAIWAN_CITIES = [
  '臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市',
  '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣',
  '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣'
];

const PARTY_LIST = [
  '民主進步黨', '中國國民黨', '親民黨', '時代力量', '台灣團結聯盟', '綠黨社會民主黨聯盟', '無黨籍', '其他'
];

const PARTY_COLOR = {
  民主進步黨: '#1B8F4D',
  中國國民黨: '#005BAC',
  親民黨: '#F39800',
  時代力量: '#F6C400',
  台灣團結聯盟: '#8E44AD',
  綠黨社會民主黨聯盟: '#2ECC71',
  無黨籍: '#8A8F98',
  其他: '#8A8F98',
};

const DONATION_FIELDS = {
  personalIncome: { label: '個人捐贈收入', amountKey: 'personalIncome', ratioKey: 'personalRate' },
  businessIncome: { label: '營利事業捐贈收入', amountKey: 'businessIncome', ratioKey: 'businessRate' },
  partyDonationIncome: { label: '政黨捐贈收入', amountKey: 'partyDonationIncome', ratioKey: 'partyDonationRate' },
  groupDonationIncome: { label: '人民團體捐贈收入', amountKey: 'groupDonationIncome', ratioKey: 'groupDonationRate' },
  anonymousDonationIncome: { label: '匿名捐贈收入', amountKey: 'anonymousDonationIncome', ratioKey: 'anonymousRate' },
  otherIncome: { label: '其他收入', amountKey: 'otherIncome', ratioKey: 'otherRate' },
  overThirtyThousandIncome: { label: '超過三萬元之收入', amountKey: 'overThirtyThousandIncome' },
};

const EXAMPLES = ['民主進步黨', '中國國民黨', '臺北市', '高雄市', '營利事業捐贈', '個人捐贈'];
const REGION_GROUPS = {
  北部: ['臺北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
  中部: ['苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣'],
  南部: ['嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣'],
  東部: ['花蓮縣', '臺東縣'],
  離島: ['澎湖縣', '金門縣', '連江縣'],
};

const state = { all: [], filtered: [], visible: 12, sort: 'income', search: '', city: '', party: '', donation: '', region: '' };

const el = {
  searchInput: document.getElementById('searchInput'),
  cityFilter: document.getElementById('cityFilter'),
  partyFilter: document.getElementById('partyFilter'),
  donationFilter: document.getElementById('donationFilter'),
  searchBtn: document.getElementById('searchBtn'),
  exampleChips: document.getElementById('exampleChips'),
  summaryGrid: document.getElementById('summaryGrid'),
  regionGrid: document.getElementById('regionGrid'),
  sortSelect: document.getElementById('sortSelect'),
  activeFilterText: document.getElementById('activeFilterText'),
  resultsSection: document.getElementById('resultsSection'),
  resultsList: document.getElementById('resultsList'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  allLoadedMsg: document.getElementById('allLoadedMsg'),
  candidateDetail: document.getElementById('candidateDetail'),
  cardTemplate: document.getElementById('resultCardTemplate'),
};

function parseNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, '').replace(/"/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function parsePercent(value) {
  const n = Number(String(value ?? '').replace('%', '').trim());
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value) { return `${Math.round(value || 0).toLocaleString('zh-TW')} 元`; }
function formatPercent(value) { return `${(value || 0).toFixed(2)}%`; }

function normalizeCity(regionText = '') {
  return TAIWAN_CITIES.find((city) => regionText.includes(city) || regionText.startsWith(city)) || '';
}

function normalizeParty(partyText = '') {
  if (!partyText) return '無黨籍';
  if (partyText.includes('無黨')) return '無黨籍';
  return PARTY_LIST.includes(partyText) ? partyText : '其他';
}

function getPartyColor(party) {
  return PARTY_COLOR[party] || PARTY_COLOR['其他'];
}

function populateFilterOptions() {
  TAIWAN_CITIES.forEach((city) => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    el.cityFilter.appendChild(opt);
  });

  PARTY_LIST.forEach((party) => {
    const opt = document.createElement('option');
    opt.value = party;
    opt.textContent = party;
    el.partyFilter.appendChild(opt);
  });
}

function parseRow(row) {
  return {
    name: row['姓名'] || '',
    area: row['地區'] || '',
    city: normalizeCity(row['地區'] || ''),
    party: normalizeParty(row['推薦政黨'] || ''),
    committee: row['委員會'] || '',
    votes: parseNumber(row['得票數']),
    voteRate: parsePercent(row['得票率']),
    elected: row['當選註記'] === '*',
    companyCount: parseNumber(row['捐贈企業數']),
    totalIncome: parseNumber(row['總收入']),
    totalExpense: parseNumber(row['總支出']),
    personalIncome: parseNumber(row['個人捐贈收入']),
    personalRate: parsePercent(row['個人捐贈比例']),
    businessIncome: parseNumber(row['營利事業捐贈收入']),
    businessRate: parsePercent(row['營利事業捐贈比例']),
    partyDonationIncome: parseNumber(row['政黨捐贈收入']),
    partyDonationRate: parsePercent(row['政黨捐贈收入比例']),
    groupDonationIncome: parseNumber(row['人民團體捐贈收入']),
    groupDonationRate: parsePercent(row['人民團體收入比例']),
    anonymousDonationIncome: parseNumber(row['匿名捐贈收入']),
    anonymousRate: parsePercent(row['匿名捐贈比例']),
    otherIncome: parseNumber(row['其他收入']),
    otherRate: parsePercent(row['其他收入比例']),
    overThirtyThousandIncome: parseNumber(row['超過三萬元之收入']),
  };
}

function applyFilters() {
  const rows = state.all.filter((row) => {
    const bySearch = !state.search || [row.name, row.party, row.area, row.committee].some((v) => String(v).toLowerCase().includes(state.search.toLowerCase()));
    const byCity = !state.city || row.city === state.city;
    const byParty = !state.party || row.party === state.party;
    const byRegion = !state.region || REGION_GROUPS[state.region].includes(row.city);
    const byDonation = !state.donation || row[DONATION_FIELDS[state.donation].amountKey] > 0;
    return bySearch && byCity && byParty && byRegion && byDonation;
  });

  const sortFn = {
    income: (a, b) => b.totalIncome - a.totalIncome,
    votes: (a, b) => b.votes - a.votes,
    voteRate: (a, b) => b.voteRate - a.voteRate,
    companyCount: (a, b) => b.companyCount - a.companyCount,
    personalRate: (a, b) => b.personalRate - a.personalRate,
    businessRate: (a, b) => b.businessRate - a.businessRate,
  }[state.sort];

  state.filtered = [...rows].sort((a, b) => {
    if (!state.donation) return sortFn(a, b);
    const k = DONATION_FIELDS[state.donation].amountKey;
    return (b[k] - a[k]) || sortFn(a, b);
  });

  const noCondition = !state.search && !state.city && !state.party && !state.donation && !state.region;
  if (noCondition) {
    el.activeFilterText.textContent = '目前顯示：全部候選人';
  } else {
    const parts = [state.city, state.party, DONATION_FIELDS[state.donation]?.label, state.region, state.search].filter(Boolean);
    el.activeFilterText.textContent = `目前條件：${parts.join('｜')}`;
  }
}

function renderSummary() {
  const totalIncome = state.all.reduce((s, d) => s + d.totalIncome, 0);
  const maxIncome = [...state.all].sort((a, b) => b.totalIncome - a.totalIncome)[0];
  const maxCompany = [...state.all].sort((a, b) => b.companyCount - a.companyCount)[0];
  const cards = [
    ['候選人總數', `${state.all.length.toLocaleString('zh-TW')} 人`],
    ['總政治獻金收入', formatMoney(totalIncome)],
    ['平均總收入', formatMoney(totalIncome / Math.max(state.all.length, 1))],
    ['最高收入候選人', `${maxIncome?.name || '-'}（${formatMoney(maxIncome?.totalIncome)}）`],
    ['捐贈企業數最多候選人', `${maxCompany?.name || '-'}（${(maxCompany?.companyCount || 0).toLocaleString('zh-TW')} 家）`],
  ];
  el.summaryGrid.innerHTML = cards.map(([t, v]) => `<article class="summary-card reveal"><div class="summary-title">${t}</div><div class="summary-value">${v}</div></article>`).join('');
}

function renderRegions() {
  el.regionGrid.innerHTML = '';
  Object.entries(REGION_GROUPS).forEach(([region, cities]) => {
    const rows = state.all.filter((r) => cities.includes(r.city));
    const income = rows.reduce((s, r) => s + r.totalIncome, 0);
    const card = document.createElement('article');
    card.className = `region-card reveal ${state.region === region ? 'active' : ''}`;
    card.innerHTML = `<div>${region}</div><div class="summary-title">候選人：${rows.length} 人</div><div>總收入：${formatMoney(income)}</div>`;
    card.onclick = () => { state.region = state.region === region ? '' : region; state.visible = 12; hideCandidateDetail(); updateAndRender(false); };
    el.regionGrid.appendChild(card);
  });
}

function renderResults() {
  el.resultsList.innerHTML = '';
  state.filtered.slice(0, state.visible).forEach((row) => {
    const node = el.cardTemplate.content.cloneNode(true);
    node.querySelector('.name').textContent = row.name;
    const badge = node.querySelector('.party-badge');
    badge.textContent = row.party;
    badge.style.background = getPartyColor(row.party);
    node.querySelector('.district').textContent = `${row.area}｜委員會：${row.committee || '未標示'}`;

    node.querySelector('.stats').innerHTML = `
      <div>得票數：${row.votes.toLocaleString('zh-TW')}</div>
      <div>得票率：${formatPercent(row.voteRate)}</div>
      <div>總收入：${formatMoney(row.totalIncome)}</div>
      <div>個人捐贈比例：${formatPercent(row.personalRate)}</div>
      <div>營利事業捐贈比例：${formatPercent(row.businessRate)}</div>
      <div>是否當選：${row.elected ? '是' : '否'}</div>`;

    if (state.donation) {
      const f = DONATION_FIELDS[state.donation];
      const focus = node.querySelector('.focus-donation');
      const ratio = f.ratioKey ? `｜比例 ${formatPercent(row[f.ratioKey])}` : '';
      focus.hidden = false;
      focus.textContent = `重點：${f.label} ${formatMoney(row[f.amountKey])}${ratio}`;
    }

    if (row.elected) node.querySelector('.winner-tag').hidden = false;

    node.querySelector('.detail-btn').onclick = () => renderCandidateDetail(row);
    el.resultsList.appendChild(node);
  });

  const hasMore = state.visible < state.filtered.length;
  el.loadMoreBtn.hidden = !hasMore;
  el.allLoadedMsg.hidden = hasMore;
}

function renderDonationBars(candidate) {
  const rows = [
    ['個人捐贈比例', candidate.personalIncome, candidate.personalRate],
    ['營利事業捐贈比例', candidate.businessIncome, candidate.businessRate],
    ['政黨捐贈收入比例', candidate.partyDonationIncome, candidate.partyDonationRate],
    ['人民團體收入比例', candidate.groupDonationIncome, candidate.groupDonationRate],
    ['匿名捐贈比例', candidate.anonymousDonationIncome, candidate.anonymousRate],
    ['其他收入比例', candidate.otherIncome, candidate.otherRate],
  ];

  const color = getPartyColor(candidate.party);
  return rows.map(([name, amount, pct]) => `
    <div class="bar-row">
      <div>${name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(pct, 100)}%; background:${color};"></div></div>
      <div>${formatMoney(amount)}｜${formatPercent(pct)}</div>
    </div>
  `).join('');
}

function renderIncomeExpenseChart(candidate) {
  const max = Math.max(candidate.totalIncome, candidate.totalExpense, 1);
  const incomeWidth = (candidate.totalIncome / max) * 100;
  const expenseWidth = (candidate.totalExpense / max) * 100;
  const balance = candidate.totalIncome - candidate.totalExpense;

  return `
    <div class="income-expense-wrap">
      <div class="compare-item">
        <div>總收入：${formatMoney(candidate.totalIncome)}</div>
        <div class="compare-bar"><div class="compare-fill" style="width:${incomeWidth}%;background:${getPartyColor(candidate.party)}"></div></div>
      </div>
      <div class="compare-item">
        <div>總支出：${formatMoney(candidate.totalExpense)}</div>
        <div class="compare-bar"><div class="compare-fill" style="width:${expenseWidth}%;background:#8a8f98"></div></div>
      </div>
    </div>
    <div class="balance-note">結餘估算：${formatMoney(balance)}</div>
  `;
}

function generateEditorInsight(candidate) {
  if (candidate.businessRate > 50) return '此候選人的政治獻金高度依賴營利事業捐贈，值得進一步檢視其產業連結。';
  if (candidate.personalRate > 70) return '此候選人的資金來源以個人捐贈為主，呈現較明顯的小額或支持者型籌資特徵。';
  if (candidate.partyDonationRate > 50) return '此候選人的資金結構高度仰賴政黨挹注。';
  if (candidate.anonymousRate > 20) return '匿名捐贈占比偏高，資料透明度值得關注。';
  return '此候選人的政治獻金來源較分散，可進一步比較其選區與政黨差異。';
}

function renderCandidateDetail(candidate) {
  const color = getPartyColor(candidate.party);
  const elected = candidate.elected ? '當選' : '未當選';

  el.resultsSection.classList.add('results-dim');
  el.candidateDetail.className = 'candidate-detail show';
  el.candidateDetail.innerHTML = `
    <div class="detail-header detail-block" style="border-color:${color}; box-shadow: 0 0 0 1px ${color}33 inset;">
      <div class="detail-top">
        <div>
          <h2>${candidate.name}</h2>
          <div><span class="party-badge" style="background:${color}">${candidate.party}</span></div>
          <div class="detail-meta">${candidate.area}｜${elected}｜得票數 ${candidate.votes.toLocaleString('zh-TW')}｜得票率 ${formatPercent(candidate.voteRate)}</div>
        </div>
        <button id="backToResults" class="back-btn">返回搜尋結果</button>
      </div>

      <div class="detail-hero-grid">
        <article class="detail-block"><div class="summary-title">總收入</div><div class="summary-value">${formatMoney(candidate.totalIncome)}</div></article>
        <article class="detail-block"><div class="summary-title">總支出</div><div class="summary-value">${formatMoney(candidate.totalExpense)}</div></article>
        <article class="detail-block"><div class="summary-title">捐贈企業數</div><div class="summary-value">${candidate.companyCount.toLocaleString('zh-TW')} 家</div></article>
        <article class="detail-block"><div class="summary-title">超過三萬元之收入</div><div class="summary-value">${formatMoney(candidate.overThirtyThousandIncome)}</div></article>
      </div>

      <article class="detail-block donation-bars">
        <h3>獻金來源視覺化</h3>
        ${renderDonationBars(candidate)}
      </article>

      <article class="detail-block income-expense">
        <h3>收支對照視覺化</h3>
        ${renderIncomeExpenseChart(candidate)}
      </article>

      <article class="detail-block editor-note"><h3>編輯觀察</h3><p>${generateEditorInsight(candidate)}</p></article>
    </div>
  `;

  document.getElementById('backToResults').onclick = hideCandidateDetail;
  location.hash = `candidate-${encodeURIComponent(candidate.name)}`;
  el.candidateDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideCandidateDetail() {
  el.candidateDetail.className = 'candidate-detail hidden';
  el.candidateDetail.innerHTML = '';
  el.resultsSection.classList.remove('results-dim');
  if (location.hash.startsWith('#candidate-')) history.replaceState(null, '', location.pathname + location.search);
}

function showResultsSection() {
  el.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateAndRender(scrollToResults = false) {
  applyFilters();
  renderResults();
  renderRegions();
  observeReveal();
  if (scrollToResults) showResultsSection();
}

function bindEvents() {
  el.searchInput.addEventListener('input', (e) => { state.search = e.target.value.trim(); state.visible = 12; updateAndRender(false); });
  el.cityFilter.addEventListener('change', (e) => { state.city = e.target.value; state.visible = 12; updateAndRender(false); });
  el.partyFilter.addEventListener('change', (e) => { state.party = e.target.value; state.visible = 12; updateAndRender(false); });
  el.donationFilter.addEventListener('change', (e) => { state.donation = e.target.value; state.visible = 12; updateAndRender(false); });
  el.sortSelect.addEventListener('change', (e) => { state.sort = e.target.value; state.visible = 12; updateAndRender(false); });

  el.searchBtn.addEventListener('click', () => {
    hideCandidateDetail();
    state.search = el.searchInput.value.trim();
    state.visible = 12;
    updateAndRender(true);
  });

  el.loadMoreBtn.addEventListener('click', () => { state.visible += 12; renderResults(); observeReveal(); });

  EXAMPLES.forEach((text) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = text;
    chip.onclick = () => {
      hideCandidateDetail();
      el.searchInput.value = text;
      state.search = text;
      state.visible = 12;
      updateAndRender(true);
    };
    el.exampleChips.appendChild(chip);
  });
}

let revealObserver;
function observeReveal() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
  }
  document.querySelectorAll('.reveal:not(.visible)').forEach((n) => revealObserver.observe(n));
}

function loadCSV() {
  Papa.parse('2016.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: ({ data }) => {
      state.all = data.map(parseRow).filter((d) => d.name);
      populateFilterOptions();
      renderSummary();
      bindEvents();
      updateAndRender(false);
    },
    error: () => { el.resultsList.innerHTML = '<p>CSV 載入失敗，請確認 2016.csv 存在。</p>'; },
  });
}

loadCSV();
