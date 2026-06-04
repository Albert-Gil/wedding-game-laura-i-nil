/* =====================================================================
   ASSOLIMENTS — registre, persistència i notificacions (toasts)
   ===================================================================== */

const ACH_DEFS = [
  { id: 'sant_nicolau', title: 'Llegenda de Sant Nicolau', desc: 'Completa els anys d\'escola.' },
  { id: 'examens', title: 'Supervivents dels Exàmens', desc: 'Esquiva 8 exàmens i deures.' },
  { id: 'antic_alumne', title: 'Antic Alumne', desc: 'Recull totes les amistats.' },
  { id: 'muntanya', title: 'Amants de la Muntanya', desc: 'Conquereix el cim.' },
  { id: 'exploradors', title: 'Exploradors Professionals', desc: 'Completa els anys d\'aventures.' },
  { id: 'escapades', title: 'Experts en Escapades', desc: 'Recull totes les aventures.' },
  { id: 'no_descans', title: 'No Necessitem Descans', desc: 'Un cap de setmana més!' },
  { id: 'cafe', title: 'Addictes al Cafè', desc: 'Pren 8 cafès. Energia infinita.' },
  { id: 'vida_adulta', title: 'La Vida Adulta és Complicada', desc: 'Sobreviu a la feina.' },
  { id: 'whatsapp', title: 'Campions del WhatsApp', desc: 'Sobreviu al grup familiar.' },
  { id: 'pressupost', title: 'Derrotador del Pressupost', desc: 'Venç el Monstre de la Planificació.' },
  { id: 'has_arribat', title: 'Has Arribat', desc: 'Arriba al Mas d\'Osor.' },
  { id: 'jugador2', title: 'Jugador 2 Connectat', desc: 'Laura entra a la partida.' },
  { id: 'equip', title: 'Equip Imparable', desc: 'Camineu junts cap a l\'altar.' },
  { id: 'futur', title: 'Futur Prometedor', desc: 'Descobreix el fons d\'aventures.' },
  { id: 'complet', title: 'Tutorial Completat', desc: 'Arriba al final de tot.' },
  // Ocults / Easter eggs
  { id: 'paciencia', title: 'La Paciència és una Virtut', desc: 'Espera tranquil·lament al títol.', hidden: true },
  { id: 'silenci', title: 'Silenci Incòmode', desc: 'Has tocat el botó del so.', hidden: true },
  { id: 'sabadell', title: 'Orgull de Sabadell', desc: 'Has trobat un racó molt local.', hidden: true },
];

const Achievements = {
  unlocked: {},
  toasts: [],

  load() {
    try { this.unlocked = JSON.parse(localStorage.getItem('mos_ach') || '{}'); }
    catch (e) { this.unlocked = {}; }
  },
  save() { localStorage.setItem('mos_ach', JSON.stringify(this.unlocked)); },

  has(id) { return !!this.unlocked[id]; },
  countUnlocked() { return Object.keys(this.unlocked).length; },

  def(id) { return ACH_DEFS.find(a => a.id === id); },

  unlock(id) {
    if (this.unlocked[id]) return false;
    const d = this.def(id);
    if (!d) return false;
    this.unlocked[id] = true;
    this.save();
    this.toasts.push({ title: d.title, t: 0, life: 4.2 });
    if (window.AudioEngine) AudioEngine.sfx('star');
    return true;
  },

  reset() { this.unlocked = {}; this.save(); },

  update(dt) {
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter(t => t.t < t.life);
  },

  // Es dibuixa per sobre de tot, a dalt de la pantalla.
  renderToasts(ctx) {
    let y = 8;
    for (const t of this.toasts) {
      // animació entrada/sortida
      let a = 1;
      if (t.t < 0.3) a = t.t / 0.3;
      else if (t.t > t.life - 0.6) a = (t.life - t.t) / 0.6;
      a = U.clamp(a, 0, 1);
      const slide = (1 - a) * 10;
      const w = 168, x = VW / 2 - w / 2;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(8,14,20,0.92)';
      ctx.fillRect(x, y - slide, w, 26);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(x, y - slide, 3, 26);
      drawText(ctx, '★ ASSOLIMENT DESBLOQUEJAT', x + 8, y - slide + 7, { size: 6, color: '#ffd166' });
      drawText(ctx, t.title, x + 8, y - slide + 17, { size: 8, color: '#fff' });
      ctx.globalAlpha = 1;
      y += 30;
    }
  },
};
