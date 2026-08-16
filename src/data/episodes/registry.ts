import type { ImageSourcePropType } from 'react-native';

import type { EpisodeAssetRegistry, EpisodeData, EpisodeId } from './types';
import { EPISODE_01_SAFECRACKER_REOMOBY } from './episode01SafecrackerReomoby';
import { EPISODE_02_INFORMANT_YAMI } from './episode02InformantYami';
import { EPISODE_03_TRACKER_MOBIYAN } from './episode03TrackerMobiyan';
import { EPISODE_04_MAGICIAN_MOBIYURA } from './episode04MagicianMobiyura';
import { EPISODE_05_VEILED_DUCHESS_MOBIRIN } from './episode05VeiledDuchessMobirin';
import { EPISODE_06_COURIER_POTEMOBY } from './episode06CourierPotemoby';
import { EPISODE_07_COMMANDER_MOBIBOU } from './episode07CommanderMobibou';

export {
  EPISODE_01_SAFECRACKER_REOMOBY,
  EPISODE_02_INFORMANT_YAMI,
  EPISODE_03_TRACKER_MOBIYAN,
  EPISODE_04_MAGICIAN_MOBIYURA,
  EPISODE_05_VEILED_DUCHESS_MOBIRIN,
  EPISODE_06_COURIER_POTEMOBY,
  EPISODE_07_COMMANDER_MOBIBOU,
};

export const EPISODE_ASSETS: EpisodeAssetRegistry = {
  'bg-mansion': { source: require('../../../assets/incidents/midnight-mansion-corridor-v2.png') as ImageSourcePropType, accessibilityLabel: '月夜の屋敷の廊下' },
  'bg-corridor': { source: require('../../../assets/incidents/midnight-mansion-corridor-v2.png') as ImageSourcePropType, accessibilityLabel: '屋敷の廊下' },
  'bg-evidence': { source: require('../../../assets/incidents/delivery-box-evidence.png') as ImageSourcePropType, accessibilityLabel: '証拠品が置かれた部屋' },
  'bg-service': { source: require('../../../assets/incidents/illusionist-theatre-service-passage.png') as ImageSourcePropType, accessibilityLabel: '薄暗い秘密通路' },
  'bg-confrontation': { source: require('../../../assets/incidents/illusionist-theatre-service-passage.png') as ImageSourcePropType, accessibilityLabel: '対決の舞台' },
  'mobby-reomoby': { source: require('../../../assets/mobies/reomoby.webp') as ImageSourcePropType, accessibilityLabel: 'れおもび' },
  'mobby-reomoby-joy': { source: require('../../../assets/mobies/joy/reomoby-joy.png') as ImageSourcePropType, accessibilityLabel: '笑顔のれおもび' },
  'enemy-safecracker': { source: require('../../../assets/enemies/safecracker.png') as ImageSourcePropType, accessibilityLabel: '金庫破り' },
};

export const EPISODES: readonly EpisodeData[] = [
  EPISODE_01_SAFECRACKER_REOMOBY,
  EPISODE_02_INFORMANT_YAMI,
  EPISODE_03_TRACKER_MOBIYAN,
  EPISODE_04_MAGICIAN_MOBIYURA,
  EPISODE_05_VEILED_DUCHESS_MOBIRIN,
  EPISODE_06_COURIER_POTEMOBY,
  EPISODE_07_COMMANDER_MOBIBOU,
];
export const EPISODE_BY_ID: Readonly<Partial<Record<EpisodeId, EpisodeData>>> = Object.fromEntries(EPISODES.map((episode) => [episode.id, episode]));
export const getEpisode = (id: EpisodeId): EpisodeData | undefined => EPISODE_BY_ID[id];
export const resolveEpisodeAsset = (assetId: string) => EPISODE_ASSETS[assetId];
