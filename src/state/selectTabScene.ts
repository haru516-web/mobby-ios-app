export type TabScene = 'home' | 'collection' | 'time' | 'casebook';

const EXACT_TAB_SCENES: Readonly<Record<string, TabScene>> = {
  '/': 'home',
  '/collection': 'collection',
  '/mobby-time': 'time',
  '/stories': 'casebook',
};

/** Returns a scene only for an exact tab route. Nested routes and modals own their content. */
export function selectTabScene(pathname: string): TabScene | null {
  return EXACT_TAB_SCENES[pathname] ?? null;
}

export const TAB_SCENE_CASES = [
  ['/', 'home'],
  ['/collection', 'collection'],
  ['/mobby-time', 'time'],
  ['/stories', 'casebook'],
  ['/mobby-time/open', null],
  ['/story/episode-01', null],
  ['/settings', null],
  ['/notifications', null],
  ['/collection/extra', null],
] as const satisfies readonly (readonly [string, TabScene | null])[];
