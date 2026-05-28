'use strict';

const JAGS = {
  profile:   { firstName: 'Nish', lastName: 'Mandal', dob: '2000-02-02', avatar: '🐦' },
  interests: ['Football', 'Swimming', 'Dancing', 'Pub & Social', 'Food & Dining', 'Cinema', 'Gym & Fitness'],
  prefs:     { city: 'London', dist: 25, friendType: 'Both' }
};

const Flock = {

  login(u)      { localStorage.setItem('flock_user', u); },
  getUser()     { return localStorage.getItem('flock_user'); },
  logout()      { localStorage.clear(); window.location.href = 'login.html?bye=1'; },
  requireAuth() { if (!this.getUser()) window.location.href = 'login.html'; },

  isOnboarded()  { return !!localStorage.getItem('flock_onboarded'); },
  setOnboarded() { localStorage.setItem('flock_onboarded', '1'); },

  getProfile() {
    try { return JSON.parse(localStorage.getItem('flock_profile') || '{}'); } catch { return {}; }
  },
  setProfile(p) { localStorage.setItem('flock_profile', JSON.stringify(p)); },

  getInterests() {
    try { return JSON.parse(localStorage.getItem('flock_interests') || '[]'); } catch { return []; }
  },
  setInterests(a) { localStorage.setItem('flock_interests', JSON.stringify(a)); },

  getPrefs() {
    try {
      return JSON.parse(localStorage.getItem('flock_prefs') || '{"city":"London","dist":25,"friendType":"Both"}');
    } catch { return { city: 'London', dist: 25, friendType: 'Both' }; }
  },
  setPrefs(p) { localStorage.setItem('flock_prefs', JSON.stringify(p)); },

  /* ── Flock group membership ──────────────────────────────── */
  getMyFlocks() {
    try { return JSON.parse(localStorage.getItem('flock_my_flocks') || '[]'); } catch { return []; }
  },
  joinFlock(id) {
    const f = this.getMyFlocks();
    if (!f.includes(id)) { f.push(id); localStorage.setItem('flock_my_flocks', JSON.stringify(f)); }
  },
  leaveFlock(id) {
    localStorage.setItem('flock_my_flocks', JSON.stringify(this.getMyFlocks().filter(x => x !== id)));
    // also clear any flight attendance for this flock
    const att = this.getFlightAttendance();
    Object.keys(att).filter(k => k.startsWith(id + '_')).forEach(k => delete att[k]);
    localStorage.setItem('flock_flight_attendance', JSON.stringify(att));
  },
  isFlockMember(id) { return this.getMyFlocks().includes(id); },

  /* ── Flight attendance ───────────────────────────────────── */
  getFlightAttendance() {
    try { return JSON.parse(localStorage.getItem('flock_flight_attendance') || '{}'); } catch { return {}; }
  },
  attendFlight(flockId, flightId) {
    const att = this.getFlightAttendance();
    att[flockId + '_' + flightId] = true;
    localStorage.setItem('flock_flight_attendance', JSON.stringify(att));
  },
  unattendFlight(flockId, flightId) {
    const att = this.getFlightAttendance();
    delete att[flockId + '_' + flightId];
    localStorage.setItem('flock_flight_attendance', JSON.stringify(att));
  },
  isAttending(flockId, flightId) {
    return !!this.getFlightAttendance()[flockId + '_' + flightId];
  },
  getLiveGoing(flockId, flightId, base) {
    return base + (this.isAttending(flockId, flightId) ? 1 : 0);
  },

  seedNish() {
    this.setProfile(JAGS.profile);
    this.setInterests(JAGS.interests);
    this.setPrefs(JAGS.prefs);
    if (!localStorage.getItem('flock_nish_seeded')) {
      // Nish is already a member of Arsenal Supporters and London Foodies
      localStorage.setItem('flock_my_flocks', JSON.stringify(['FL001','FL004']));
      // And attending specific Flights within those Flocks
      localStorage.setItem('flock_flight_attendance', JSON.stringify({
        'FL001_M1': true,   // Arsenal vs Spurs - North London Derby
        'FL004_M1': true,   // Brick Lane Food Tour
      }));
      localStorage.setItem('flock_nish_seeded', '1');
    }
    this.setOnboarded();
  },

  /* ── Checkout (paid flights) ─────────────────────────────── */
  setCheckoutEvent(id) { localStorage.setItem('flock_checkout_event', id); },
  getCheckoutEvent()   { return localStorage.getItem('flock_checkout_event'); },
  clearCheckoutEvent() { localStorage.removeItem('flock_checkout_event'); },
  setCheckoutInfo(d)   { localStorage.setItem('flock_checkout_info', JSON.stringify(d)); },
  getCheckoutInfo() {
    try { return JSON.parse(localStorage.getItem('flock_checkout_info') || '{}'); } catch { return {}; }
  },
  clearCheckoutInfo() { localStorage.removeItem('flock_checkout_info'); },
  completeCheckout() {
    const key = this.getCheckoutEvent(); // format: "FL001_M2"
    if (key) {
      const [flockId, flightId] = key.split('_M');
      this.joinFlock(flockId);
      this.attendFlight(flockId, 'M' + flightId);
    }
    this.clearCheckoutEvent();
    this.clearCheckoutInfo();
  }
};

function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}
