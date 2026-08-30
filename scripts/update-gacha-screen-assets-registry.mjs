import fs from 'node:fs';

const registryPath = new URL('../src/data/gachaScreenAssets.generated.ts', import.meta.url);
const characters = [
  'mobirin', 'mobichi', 'yami', 'mobiyan', 'mobiyura', 'reomoby', 'potemoby', 'mobibou', 'babumoby',
  'magician', 'informant', 'tracker', 'safecracker', 'veiled-duchess', 'courier', 'commander',
];
const slots = ['header', 'themeStats', 'toolStats', 'pullStats', 'machine', 'lineup', 'dressup'];
const lines = [
  "import type { ImageSourcePropType } from 'react-native';",
  '',
  `export type GachaScreenAssetSlot = ${slots.map((slot) => `'${slot}'`).join(' | ')};`,
  'export type GachaScreenAssetGroup = Readonly<Record<GachaScreenAssetSlot, ImageSourcePropType>>;',
  '',
  '/** Transparent gacha overlays for every character/style combination. */',
  'export const GENERATED_GACHA_SCREEN_ASSETS: Readonly<Record<string, GachaScreenAssetGroup>> = {',
];
for (const character of characters) {
  for (let style = 1; style <= 5; style += 1) {
    const styleDir = String(style).padStart(2, '0');
    lines.push(`  '${character}:${style}': {`);
    for (const slot of slots) lines.push(`    ${slot}: require('../../assets/themes/${character}/${styleDir}/gacha/${slot}.png'),`);
    lines.push('  },');
  }
}
lines.push(
  '};',
  '',
  'export function getGeneratedGachaScreenAssets(characterId: string, styleNumber: number): GachaScreenAssetGroup {',
  '  const assets = GENERATED_GACHA_SCREEN_ASSETS[`${characterId}:${styleNumber}`];',
  '  if (!assets) throw new Error(`Missing gacha screen assets for ${characterId}:${styleNumber}`);',
  '  return assets;',
  '}',
  '',
);
fs.writeFileSync(registryPath, lines.join('\n'));
console.log('Rebuilt transparent gacha screen asset registry.');
