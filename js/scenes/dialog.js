// ---- Dialog scene: runs a generator script over whatever scene is beneath ------------
// script: function*(d) { yield d.say('Hello'); yield d.choice(['Yes','No']); if (d.result === 'Yes') ... }
class DialogScene {
  constructor(script, opts) {
    this.opts = opts || {}; this.script = script; this.transparent = true;
    this.tb = new TextBox(8, 160, UI.W - 16, 56);
    this.menu = null; this.result = null; this.co = null; this.onDone = this.opts.onDone || null;
    this.portrait = null; this.hideBox = false;
  }
  enter() { this.co = Co.run(this.script(this)); }
  say(text, opts) { this.tb.say(text, opts); return () => this.tb.done; }
  sys(text) { return this.say(text, { speaker: 'SYSTEM', color: UI.COLORS.sys }); }
  who(name, text) { return this.say(text, { speaker: name }); }
  choice(items, opts) {
    opts = opts || {};
    const labels = items.map(it => typeof it === 'string' ? { label: it, value: it } : it);
    const w = opts.w || Math.max(...labels.map(l => UI.width(TextBox.measureCtx, l.label))) + 28;
    const rows = opts.rows ? Math.min(opts.rows, labels.length) : labels.length;
    this.menu = new Menu(labels, { x: opts.x != null ? opts.x : UI.W - 8 - (opts.w || w), y: opts.y != null ? opts.y : 160 - (rows * UI.LINE + 10) - 2, w: opts.w || w, rows, cancelable: opts.cancelable !== false, title: opts.title });
    this.result = null;
    return () => this.menu === null;
  }
  wait(n) { return Co.wait(n); }
  close() { this.tb.hide(); }
  update() {
    this.tb.update();
    if (this.menu) {
      const r = this.menu.update();
      if (r) { this.result = r.cancel ? null : r.select.value; this.menu = null; }
      return;
    }
    if (Co.step(this.co)) { Game.pop(); if (this.onDone) this.onDone(this.result); }
  }
  draw(ctx) {
    if (this.opts.dim) UI.fade(ctx, this.opts.dim);
    if (!this.hideBox) this.tb.draw(ctx);
    if (this.menu) this.menu.draw(ctx);
  }
}

// Convenience: push a dialog that just says a sequence of lines.
function sayLines(lines, opts) {
  opts = opts || {};
  Game.push(new DialogScene(function* (d) {
    for (const ln of lines) yield d.say(typeof ln === 'string' ? ln : ln.text, typeof ln === 'string' ? { speaker: opts.speaker } : ln);
  }, opts));
}

// The opening cutscene (played on the overworld of floor 1).
function* INTRO_SCRIPT(d) {
  yield d.wait(20);
  yield d.say('...');
  yield d.say('You wake up on a cold tile floor. The last thing you remember is stepping outside to get the mail.');
  yield d.say('There is no outside anymore.');
  yield d.sys('Welcome, Crawler #' + U.rand(1000000, 9999999) + '! Congratulations on surviving the Reset.');
  yield d.sys('Your planet has been converted into an 18-floor entertainment dungeon. Descend to survive. Stairs are at the end of each floor.');
  yield d.sys('You have been assigned a companion, as per network content guidelines.');
  yield d.wait(30);
  yield d.who('???', 'Ugh. UGH. What is this. Why do I have THOUGHTS.');
  yield d.who('???', 'I was in a dumpster. I was HAPPY in the dumpster. Now I know what "amortization" means.');
  yield d.who('Chancellor Tibbs', 'The voice says my name is Chancellor Tibbs and that I am your "emotional support mammal". I have decided I am in charge.');
  yield d.who('Chancellor Tibbs', 'Fine. Fine! Let\'s go be famous. Don\'t touch my tail.');
  const tibbs = new Actor({ name: 'Tibbs', cls: 'raccoon', level: 1, pal: null });
  tibbs.equip.armor = 'collar';
  G.party.add(tibbs);
  G.flags.intro = true;
  Sound.sfx('levelup');
  yield d.sys('Chancellor Tibbs joined the party!');
  yield d.sys('Tip: monsters roam the floor. Touch one to fight. Hit it from BEHIND to strike first. Other crawlers roam too. Some want friends. Some want your stuff.');
}
