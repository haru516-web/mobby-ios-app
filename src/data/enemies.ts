import type { ImageSourcePropType } from 'react-native';

export type EnemyId =
  | 'courier'
  | 'informant'
  | 'commander'
  | 'safecracker'
  | 'tracker'
  | 'magician'
  | 'veiled-duchess';

export type Enemy = {
  id: EnemyId;
  name: string;
  image: ImageSourcePropType;
  order: 1 | 2 | 3 | 4 | 5 | 6 | 7;
};

export const ENEMIES: readonly Enemy[] = [
  { id: 'magician', name: '奇術師', image: require('../../assets/enemies/magician.png'), order: 1 },
  { id: 'informant', name: '情報屋', image: require('../../assets/enemies/informant.png'), order: 2 },
  { id: 'tracker', name: '追跡者', image: require('../../assets/enemies/tracker.png'), order: 3 },
  { id: 'safecracker', name: '金庫破り', image: require('../../assets/enemies/safecracker.png'), order: 4 },
  { id: 'veiled-duchess', name: '仮面の貴婦人', image: require('../../assets/enemies/veiled-duchess.png'), order: 5 },
  { id: 'courier', name: '運び屋', image: require('../../assets/enemies/courier.png'), order: 6 },
  { id: 'commander', name: '司令官', image: require('../../assets/enemies/commander.png'), order: 7 },
];

export const ENEMY_BY_ID: Readonly<Record<EnemyId, Enemy>> = Object.fromEntries(
  ENEMIES.map((enemy) => [enemy.id, enemy]),
) as Record<EnemyId, Enemy>;

export function getEnemy(id: EnemyId): Enemy {
  return ENEMY_BY_ID[id];
}
