'use strict';
Flock.requireAuth();
setActiveNav('home');

(function () {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (isIOS && !isStandalone && !localStorage.getItem('flock_banner')) {
    document.getElementById('ios-banner').style.display = 'flex';
  }
})();
function dismissBanner() {
  localStorage.setItem('flock_banner', '1');
  document.getElementById('ios-banner').style.display = 'none';
}

const prefs   = Flock.getPrefs();
const profile = Flock.getProfile();

const hr = new Date().getHours();
const greetWord = hr < 12 ? 'Morning' : hr < 17 ? 'Afternoon' : 'Evening';
document.getElementById('greeting-text').textContent =
  `Good ${greetWord}${profile.firstName ? ', ' + profile.firstName : ''} 👋`;

const citySel = document.getElementById('city-filter');
CITIES.forEach(c => {
  const opt = document.createElement('option');
  opt.value = c; opt.textContent = '📍 ' + c;
  if (c === prefs.city) opt.selected = true;
  citySel.appendChild(opt);
});

let activeCity  = prefs.city || 'London';
let activeCat   = 'All';
let activeSort  = 'members';
let searchQuery = '';
let userLat     = null;
let userLng     = null;
let activeView  = 'groups'; // 'groups' or 'events'

function setView(view, el) {
  activeView = view;
  document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  // Swap sort options
  const sortSel = document.getElementById('sort-filter');
  sortSel.innerHTML = view === 'groups'
    ? `<option value="members">Most members</option>
       <option value="next">Next meetup</option>
       <option value="name">A-Z</option>`
    : `<option value="date">Soonest</option>
       <option value="going">Most popular</option>
       <option value="spots">Spots left</option>`;
  activeSort = sortSel.options[0].value;
  renderAll();
}

function renderAll() {
  if (activeView === 'groups') renderFlocks();
  else renderEvents();
}

const CITY_COORDS = {
  'London':     [51.5074, -0.1278], 'Manchester': [53.4808, -2.2426],
  'Birmingham': [52.4862, -1.8904], 'Edinburgh':  [55.9533, -3.1883],
  'Bristol':    [51.4545, -2.5879], 'Leeds':      [53.8008, -1.5491],
  'Liverpool':  [53.4084, -2.9916], 'Glasgow':    [55.8642, -4.2518],
  'Cardiff':    [51.4816, -3.1791], 'Newcastle':  [54.9783, -1.6178],
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function useMyLocation() {
  if (!navigator.geolocation) { setLocationBtn('error','Not supported'); return; }
  setLocationBtn('loading','Getting location...');
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude; userLng = pos.coords.longitude;
      let nearest = CITIES[0]; let minD = Infinity;
      CITIES.forEach(city => {
        const cc = CITY_COORDS[city]; if (!cc) return;
        const d = haversine(userLat, userLng, cc[0], cc[1]);
        if (d < minD) { minD = d; nearest = city; }
      });
      activeCity = nearest;
      document.getElementById('city-filter').value = nearest;
      setLocationBtn('located', '📍 ' + nearest);
      renderAll();
    },
    err => {
      userLat = null; userLng = null;
      setLocationBtn('error', err.code === 1 ? 'Location blocked' : 'Could not locate');
      setTimeout(() => setLocationBtn('', 'Use my location'), 3000);
    },
    { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
  );
}

function setLocationBtn(state, text) {
  const btn  = document.getElementById('location-btn');
  const span = document.getElementById('location-btn-text');
  if (!btn || !span) return;
  btn.className = 'location-btn' + (state ? ' ' + state : '');
  btn.disabled  = state === 'loading';
  span.textContent = text;
}

function setCat(cat, el) {
  activeCat = cat;
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderAll();
}

function applyFilters() {
  activeCity = document.getElementById('city-filter').value;
  activeSort = document.getElementById('sort-filter').value;
  renderAll();
}

function applySearch(input) {
  searchQuery = input.value.trim().toLowerCase();
  document.getElementById('search-clear').classList.toggle('show', searchQuery.length > 0);
  renderAll();
}

function clearSearch() {
  searchQuery = '';
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.remove('show');
  renderAll();
}

function fmtDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function renderFlocks() {
  let items = FLOCKS.filter(f => {
    if (f.city !== activeCity) return false;
    if (activeCat !== 'All' && f.cat !== activeCat) return false;
    if (searchQuery) {
      const hay = [f.name, f.desc, ...(f.tags||[])].join(' ').toLowerCase();
      if (!hay.includes(searchQuery)) return false;
    }
    return true;
  });

  items = [...items].sort((a, b) => {
    if (activeSort === 'members') return b.members - a.members;
    if (activeSort === 'name')    return a.name.localeCompare(b.name);
    // soonest next meetup
    const nextA = a.meetups[0]?.date || '9999';
    const nextB = b.meetups[0]?.date || '9999';
    return nextA.localeCompare(nextB);
  });

  const list = document.getElementById('events-container');

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>No Flocks found</h3><p>Try a different city or category.</p></div>`;
    return;
  }

  list.innerHTML = items.map(f => {
    const col    = EV_COLS[f.cat] || '#374151';
    const next   = f.meetups[0];
    const member = Flock.isFlockMember(f.id);
    return `
      <a id="event-card-${f.id}" class="event-card" href="event.html?id=${f.id}">
        <div class="card-head" style="background:${col}">
          <span class="card-emoji">${f.e}</span>
          <span class="card-cat-badge">${f.cat}</span>
          ${member ? '<span class="card-price-badge" style="background:rgba(22,163,74,.9)">✓ Member</span>' : ''}
        </div>
        <div class="card-body">
          <div class="card-title">${f.name}</div>
          <div class="card-meta">
            <span class="meta-item">👥 ${f.members} members</span>
            ${next ? `<span class="meta-item">📅 Next: ${fmtDate(next.date)}</span>` : ''}
            ${next ? `<span class="meta-item">📍 ${next.venue}</span>` : ''}
          </div>
          <div class="card-foot">
            <span style="font-size:13px;color:var(--text3)">${f.meetups.length} upcoming meetup${f.meetups.length !== 1 ? 's' : ''}</span>
            <span class="card-price">${next?.price === 'Free' ? 'Free' : next?.price || ''}</span>
          </div>
        </div>
      </a>`;
  }).join('');
}

renderAll();
function renderEvents() {
  // Flatten all meetups from all matching flocks into a single list
  const today = new Date(); today.setHours(0,0,0,0);

  let items = [];
  FLOCKS.forEach(f => {
    if (f.city !== activeCity) return;
    if (activeCat !== 'All' && f.cat !== activeCat) return;
    f.meetups.forEach(m => {
      const evDate = new Date(m.date + 'T00:00:00');
      if (evDate < today) return;
      if (searchQuery) {
        const hay = [m.title, f.name, m.venue, ...(f.tags||[])].join(' ').toLowerCase();
        if (!hay.includes(searchQuery)) return;
      }
      items.push({ ...m, flockId: f.id, flockName: f.name, flockE: f.e, cat: f.cat, ages: f.ages, ft: f.ft });
    });
  });

  items.sort((a, b) => {
    if (activeSort === 'going')  return b.going - a.going;
    if (activeSort === 'spots')  return (a.max - a.going) - (b.max - b.going);
    return new Date(a.date) - new Date(b.date);
  });

  const list = document.getElementById('events-container');

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>No events found</h3><p>Try a different city or category.</p></div>`;
    return;
  }

  list.innerHTML = items.map(e => {
    const col    = EV_COLS[e.cat] || '#374151';
    const spots  = e.max - e.going;
    const full   = spots <= 0;
    return `
      <a id="event-card-${e.flockId}-${e.id}" class="event-card" href="event.html?id=${e.flockId}">
        <div class="card-head" style="background:${col}">
          <span class="card-emoji">${e.flockE}</span>
          <span class="card-cat-badge">${e.cat}</span>
          <span class="card-price-badge">${full ? '🔴 Full' : e.price}</span>
        </div>
        <div class="card-body">
          <div class="card-title">${e.title}</div>
          <div style="font-size:12px;color:var(--text3);font-weight:600;margin-bottom:6px">Part of: ${e.flockName}</div>
          <div class="card-meta">
            <span class="meta-item">📅 ${fmtDate(e.date)}</span>
            <span class="meta-item">🕐 ${e.time}</span>
            <span class="meta-item">📍 ${e.venue}</span>
          </div>
          <div class="card-foot">
            <span class="att-count">${e.going} going · <span style="color:${spots < 5 ? 'var(--err)' : 'var(--text3)'}">${full ? 'Full' : spots + ' left'}</span></span>
            <span class="card-price">${e.price}</span>
          </div>
        </div>
      </a>`;
  }).join('');
}
