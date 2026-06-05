# Laura ❤ Nil — LauraiNil_OS

**Play online:** https://albert-gil.github.io/wedding-game-laura-i-nil/

A playable wedding gift. It starts as a serious simulation (**LauraiNil_OS**) and,
suddenly, turns into a retro pixel-art adventure that follows Laura and Nil's story:
Sant Nicolau school, years of adventures, adult life, the chaos of wedding planning,
the final boss, and... the reunion at **Mas d'Osor**.

> The wedding is not the goal. It is the beginning.

## How to play

Open the link above (or **`index.html`**) in any modern browser.
On mobile, **tap the screen once** to enable sound.

### Controls

- **Desktop:** arrow keys or `WASD` to move, `Space` / `Z` / `Enter` for action,
  `X` / `Esc` to go back / achievements.
- **Mobile / tablet:** on-screen D-pad + **A/B** buttons. In text scenes,
  simply **tap the screen** to continue.
- **♪** button (top right): mute/unmute sound.
- **⛶** button: fullscreen.

## Features

- Two phases: **LauraiNil_OS** terminal → playable adventure.
- 4 levels + **final boss** (Wedding Planning Monster).
- **Player 2 connected** moment: Laura becomes playable.
- Chiptune music and synthesized sound effects.
- **18 achievements**, some hidden (Easter eggs).
- Entirely in **Catalan**, made for a couple from **Sabadell**.

## Code structure

Everything is split into separate files to make editing easier (it can be merged into a
single file later if desired):

```
index.html          · page + touch controls
styles.css          · styles and responsive layout
src/core.js         · engine, loop, scene manager, utilities
src/audio.js        · chiptune audio engine + effects
src/input.js        · keyboard + touch controls
src/sprites.js      · procedural pixel art (Laura, Nil, decor)
src/achievements.js · achievements and notifications
src/dialogue.js     · dialogue box with typewriter effect
src/scenes_terminal.js  · LauraiNil_OS (boot, gift, final message)
src/scenes_levels.js    · top-down engine + levels 1..4
src/scenes_boss.js      · final battle
src/scenes_emotional.js · title, reunion, final walk, ending
src/main.js         · startup
```

Tip: `Shift + Alt + R` resets achievements (to experience it fresh again).

Made with love for Laura and Nil's wedding · Mas d'Osor · 13.06.2026
