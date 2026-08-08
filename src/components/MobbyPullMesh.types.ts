import type { ImageSourcePropType } from 'react-native';

export type MobbyPullMeshHandle = {
  begin: (x: number, y: number) => void;
  update: (dx: number, dy: number) => void;
  release: () => void;
  reset: () => void;
};

export type MobbyPullMeshProps = {
  source: ImageSourcePropType;
  size: number;
  visible: boolean;
};
