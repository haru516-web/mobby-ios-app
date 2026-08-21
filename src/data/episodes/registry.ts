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
  'bg-mansion': { source: require('../../../assets/episodes/backgrounds/episode-mansion-night-v1.png') as ImageSourcePropType, accessibilityLabel: '月夜の屋敷の客間' },
  'bg-corridor': { source: require('../../../assets/episodes/backgrounds/episode-mansion-night-v1.png') as ImageSourcePropType, accessibilityLabel: '屋敷のあたたかな廊下' },
  'bg-evidence': { source: require('../../../assets/episodes/backgrounds/episode-keepsake-workroom-v1.png') as ImageSourcePropType, accessibilityLabel: '思い出の小物を並べた作業机' },
  'bg-service': { source: require('../../../assets/episodes/backgrounds/episode-backstage-passage-v1.png') as ImageSourcePropType, accessibilityLabel: '小道具が並ぶ舞台裏' },
  'bg-confrontation': { source: require('../../../assets/episodes/backgrounds/episode-backstage-passage-v1.png') as ImageSourcePropType, accessibilityLabel: '灯りのともる舞台' },
  'bg-relationship': { source: require('../../../assets/episodes/backgrounds/episode-conservatory-sunset-v1.png') as ImageSourcePropType, accessibilityLabel: '夕暮れの温室テラス' },
  'bg-episode-2-communications': { source: require('../../../assets/episodes/backgrounds/episode-02-communications-v1.png') as ImageSourcePropType, accessibilityLabel: '午前三時の通信室' },
  'bg-episode-3-archive': { source: require('../../../assets/episodes/backgrounds/episode-03-archive-corridor-v1.png') as ImageSourcePropType, accessibilityLabel: '月明かりの記録保管回廊' },
  'bg-episode-4-magic-backstage': { source: require('../../../assets/episodes/backgrounds/episode-04-magic-backstage-v1.png') as ImageSourcePropType, accessibilityLabel: '小道具が入れ替わる奇術の舞台裏' },
  'bg-episode-5-masked-conservatory': { source: require('../../../assets/episodes/backgrounds/episode-05-masked-conservatory-v1.png') as ImageSourcePropType, accessibilityLabel: '仮面の貴婦人が待つ夜の温室' },
  'bg-episode-6-parcel-room': { source: require('../../../assets/episodes/backgrounds/episode-06-parcel-room-v1.png') as ImageSourcePropType, accessibilityLabel: '荷物と線路のある配送室' },
  'bg-episode-7-command-room': { source: require('../../../assets/episodes/backgrounds/episode-07-command-room-v1.png') as ImageSourcePropType, accessibilityLabel: '七人の作戦を並べる司令室' },
  'mobby-reomoby': { source: require('../../../assets/mobies/reomoby.webp') as ImageSourcePropType, accessibilityLabel: 'れおもび' },
  'mobby-reomoby-joy': { source: require('../../../assets/mobies/joy/reomoby-joy.png') as ImageSourcePropType, accessibilityLabel: '笑顔のれおもび' },
  'enemy-safecracker': { source: require('../../../assets/enemies/safecracker.png') as ImageSourcePropType, accessibilityLabel: '金庫破り' },
  'mobby-yami': { source: require('../../../assets/mobies/yami-mobby.webp') as ImageSourcePropType, accessibilityLabel: 'やみ' },
  'mobby-mobiyan': { source: require('../../../assets/mobies/mobiyan.webp') as ImageSourcePropType, accessibilityLabel: 'もびやん' },
  'mobby-mobiyura': { source: require('../../../assets/mobies/mobiyura.webp') as ImageSourcePropType, accessibilityLabel: 'もびゆら' },
  'mobby-mobirin': { source: require('../../../assets/mobies/mobirin.webp') as ImageSourcePropType, accessibilityLabel: 'もびりん' },
  'mobby-potemoby': { source: require('../../../assets/mobies/potemoby.webp') as ImageSourcePropType, accessibilityLabel: 'ぽてもび' },
  'mobby-mobibou': { source: require('../../../assets/mobies/mobibou.webp') as ImageSourcePropType, accessibilityLabel: 'もびぼう' },
  'enemy-informant': { source: require('../../../assets/enemies/informant.png') as ImageSourcePropType, accessibilityLabel: '情報屋' },
  'enemy-tracker': { source: require('../../../assets/enemies/tracker.png') as ImageSourcePropType, accessibilityLabel: '追跡者' },
  'enemy-magician': { source: require('../../../assets/enemies/magician.png') as ImageSourcePropType, accessibilityLabel: '奇術師' },
  'enemy-veiled-duchess': { source: require('../../../assets/enemies/veiled-duchess.png') as ImageSourcePropType, accessibilityLabel: '仮面の貴婦人' },
  'enemy-courier': { source: require('../../../assets/enemies/courier.png') as ImageSourcePropType, accessibilityLabel: '運び屋' },
  'enemy-commander': { source: require('../../../assets/enemies/commander.png') as ImageSourcePropType, accessibilityLabel: '司令官' },
  'reaction-reomoby-startled': { source: require('../../../assets/mobies/reactions/reomoby_pull_reaction_01_startled.webp') as ImageSourcePropType, accessibilityLabel: '驚くれおもび' },
  'reaction-reomoby-sulk': { source: require('../../../assets/mobies/reactions/reomoby_pull_reaction_04_haughty_sulk.webp') as ImageSourcePropType, accessibilityLabel: 'すねるれおもび' },
  'reaction-reomoby-joy': { source: require('../../../assets/mobies/joy/reomoby-joy.png') as ImageSourcePropType, accessibilityLabel: '喜ぶれおもび' },
  'reaction-yami-startled': { source: require('../../../assets/mobies/reactions/yami_pull_reaction_01_startled.webp') as ImageSourcePropType, accessibilityLabel: '驚くやみ' },
  'reaction-yami-sulk': { source: require('../../../assets/mobies/reactions/yami_pull_reaction_04_dignified_sulk.webp') as ImageSourcePropType, accessibilityLabel: 'すねるやみ' },
  'reaction-yami-joy': { source: require('../../../assets/mobies/joy/yami-joy.png') as ImageSourcePropType, accessibilityLabel: '喜ぶやみ' },
  'reaction-mobiyan-startled': { source: require('../../../assets/mobies/reactions/mobiyan_pull_reaction_01_startled.webp') as ImageSourcePropType, accessibilityLabel: '驚くもびやん' },
  'reaction-mobiyan-sulk': { source: require('../../../assets/mobies/reactions/mobiyan_pull_reaction_04_dignified_sulk.webp') as ImageSourcePropType, accessibilityLabel: 'すねるもびやん' },
  'reaction-mobiyan-joy': { source: require('../../../assets/mobies/joy/mobiyan-joy.png') as ImageSourcePropType, accessibilityLabel: '喜ぶもびやん' },
  'reaction-mobiyura-startled': { source: require('../../../assets/mobies/reactions/mobiyura_pull_reaction_01_startled.webp') as ImageSourcePropType, accessibilityLabel: '驚くもびゆら' },
  'reaction-mobiyura-sulk': { source: require('../../../assets/mobies/reactions/mobiyura_pull_reaction_04_haughty_sulk.webp') as ImageSourcePropType, accessibilityLabel: 'すねるもびゆら' },
  'reaction-mobiyura-joy': { source: require('../../../assets/mobies/joy/mobiyura-joy.png') as ImageSourcePropType, accessibilityLabel: '喜ぶもびゆら' },
  'reaction-mobirin-startled': { source: require('../../../assets/mobies/reactions/mobirin_mobirin_pull_reaction_01_startled.webp') as ImageSourcePropType, accessibilityLabel: '驚くもびりん' },
  'reaction-mobirin-sulk': { source: require('../../../assets/mobies/reactions/mobirin_mobirin_pull_reaction_04_dignified_sulk.webp') as ImageSourcePropType, accessibilityLabel: 'すねるもびりん' },
  'reaction-mobirin-joy': { source: require('../../../assets/mobies/joy/mobirin-joy.png') as ImageSourcePropType, accessibilityLabel: '喜ぶもびりん' },
  'reaction-potemoby-startled': { source: require('../../../assets/mobies/reactions/potemoby_pote_pull_reaction_01_sleepy_startled.webp') as ImageSourcePropType, accessibilityLabel: '驚くぽてもび' },
  'reaction-potemoby-sulk': { source: require('../../../assets/mobies/reactions/potemoby_pote_pull_reaction_04_lazy_sulk.webp') as ImageSourcePropType, accessibilityLabel: 'すねるぽてもび' },
  'reaction-potemoby-joy': { source: require('../../../assets/mobies/joy/potemoby-joy.png') as ImageSourcePropType, accessibilityLabel: '喜ぶぽてもび' },
  'reaction-mobibou-startled': { source: require('../../../assets/mobies/reactions/mobibou_pull_reaction_01_startled.webp') as ImageSourcePropType, accessibilityLabel: '驚くもびぼう' },
  'reaction-mobibou-sulk': { source: require('../../../assets/mobies/reactions/mobibou_pull_reaction_04_sulking.webp') as ImageSourcePropType, accessibilityLabel: 'すねるもびぼう' },
  'reaction-mobibou-joy': { source: require('../../../assets/mobies/joy/mobibou-joy.png') as ImageSourcePropType, accessibilityLabel: '喜ぶもびぼう' },
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
