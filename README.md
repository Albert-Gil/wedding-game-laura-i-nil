# Laura ❤ Nil — LauraiNil_OS

**Juga en línia:** https://albert-gil.github.io/wedding-game-laura-i-nil/

Un regal de casament jugable. Comença com una simulació seriosa (**LauraiNil_OS**) i,
de cop, es transforma en una aventura pixel-art retro que recorre la història de la
Laura i el Nil: l'escola de Sant Nicolau, els anys d'aventures, la vida adulta, el caos
de planificar el casament, el boss final i... el retrobament al **Mas d'Osor**.

> El casament no és la meta. És el començament.

## Com jugar-hi

Obre l'enllaç de dalt (o **`index.html`**) amb qualsevol navegador modern.
Al mòbil, **toca la pantalla un cop** per activar el so.

### Controls

- **Ordinador:** fletxes o `WASD` per moure's, `Espai` / `Z` / `Enter` per acció,
  `X` / `Esc` per tornar / assoliments.
- **Mòbil / tauleta:** creueta tàctil + botons **A/B** a la pantalla. A les escenes
  de text, només cal **tocar la pantalla** per avançar.
- Botó **♪** (a dalt a la dreta): silenciar/activar el so.
- Botó **⛶**: pantalla completa.

## Característiques

- Dues fases: terminal **LauraiNil_OS** → aventura jugable.
- 4 nivells + **boss final** (Monstre de la Planificació del Casament).
- Moment **Jugador 2 connectat**: la Laura es torna jugable.
- Música chiptune i efectes de so sintetitzats (sense fitxers externs).
- **18 assoliments**, alguns ocults (Easter eggs).
- Tot en **català**, pensat per a una parella de **Sabadell**.

## Estructura del codi

Tot està en fitxers separats per facilitar-ne l'edició (es pot unir en un sol fitxer
més endavant si es vol):

```
index.html          · pàgina + controls tàctils
styles.css          · estils i layout responsiu
src/core.js         · motor, bucle, gestor d'escenes, utilitats
src/audio.js        · motor d'àudio chiptune + efectes
src/input.js        · teclat + controls tàctils
src/sprites.js      · pixel-art procedural (Laura, Nil, decorats)
src/achievements.js · assoliments i notificacions
src/dialogue.js     · quadre de diàleg amb màquina d'escriure
src/scenes_terminal.js  · LauraiNil_OS (boot, regal, missatge final)
src/scenes_levels.js    · motor top-down + nivells 1..4
src/scenes_boss.js      · batalla final
src/scenes_emotional.js · títol, retrobament, caminada final, final
src/main.js         · arrencada
```

Truc: `Shift + Alt + R` reinicia els assoliments (per estrenar-lo de nou).

Fet amb amor per al casament de la Laura i el Nil · Mas d'Osor · 13.06.2026
