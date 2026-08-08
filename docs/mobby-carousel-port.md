# Mobby carousel port

The interaction model in `src/components/Mobby2DScene.tsx` is a React Native port of the default nine-character carousel in:

`C:\Users\User\Downloads\mobby-main\mobby-main\docs\index.html`

The port keeps the source behavior that matters on a phone:

- the active character is centered and the neighboring characters remain visible;
- horizontal movement over the active character changes the selected Mobby with a circular carousel;
- pull mode follows the source's restrained cheek displacement (`0.28x` horizontal, `0.22x` vertical), stretch, rotation, and 550 ms return;
- the source's pull-vs-swipe guard is retained: a horizontal movement over 22 px with a 1.2 horizontal bias becomes a carousel swipe;
- throw mode is represented as a springy drag-and-return gesture, with the same stretch and rotation cues but no 3D dependency;
- the interaction mode is explicit so a vertical pull does not accidentally change the selected character.

The app's 9 Mobby images remain the 2D assets in `assets/mobies/`. The previous Three.js scene is no longer used by any game route.
