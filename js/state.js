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
    // also clear any meetup attendance for this flock
    const att = this.getMeetupAttendance();
    Object.keys(att).filter(k => k.startsWith(id + '_')).forEach(k => delete att[k]);
    localStorage.setItem('flock_meetup_attendance', JSON.stringify(att));
  },
  isFlockMember(id) { return this.getMyFlocks().includes(id); },

  /* ── Meetup attendance ───────────────────────────────────── */
  getMeetupAttendance() {
    try { return JSON.parse(localStorage.getItem('flock_meetup_attendance') || '{}'); } catch { return {}; }
  },
  attendMeetup(flockId, meetupId) {
    const att = this.getMeetupAttendance();
    att[flockId + '_' + meetupId] = true;
    localStorage.setItem('flock_meetup_attendance', JSON.stringify(att));
  },
  unattendMeetup(flockId, meetupId) {
    const att = this.getMeetupAttendance();
    delete att[flockId + '_' + meetupId];
    localStorage.setItem('flock_meetup_attendance', JSON.stringify(att));
  },
  isAttending(flockId, meetupId) {
    return !!this.getMeetupAttendance()[flockId + '_' + meetupId];
  },
  getLiveGoing(flockId, meetupId, base) {
    return base + (this.isAttending(flockId, meetupId) ? 1 : 0);
  },

  seedNish() {
    this.setProfile(JAGS.profile);
    this.setInterests(JAGS.interests);
    this.setPrefs(JAGS.prefs);
    if (!localStorage.getItem('flock_nish_seeded')) {
      localStorage.setItem('flock_my_flocks', '[]');
      localStorage.setItem('flock_meetup_attendance', '{}');
      localStorage.setItem('flock_nish_seeded', '1');
    }
    this.setOnboarded();
  },

  /* ── Checkout (paid meetups) ─────────────────────────────── */
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
      const [flockId, meetupId] = key.split('_M');
      this.joinFlock(flockId);
      this.attendMeetup(flockId, 'M' + meetupId);
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
