import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { FURNITURE_ASSETS, type FurnitureAssetId } from '@/data/roomAssets';
import { getMobby, MOBBIES, type InteractionKind, type MobbyId } from '@/data/mobies';

export type Furniture = FurnitureAssetId;
export type FurniturePosition = { left: number; bottom: number };
export type FurniturePositions = Partial<Record<Furniture, FurniturePosition>>;

export type Moment = {
  id: string;
  title: string;
  text: string;
  kind: InteractionKind | 'welcome' | 'room';
};

export type Memory = Moment & {
  mobbyId: MobbyId;
  mobbyName: string;
  day: number;
};

type MobbyGameValue = {
  day: number;
  selectedMobbyId: MobbyId;
  selectedMobby: ReturnType<typeof getMobby>;
  roomItems: Furniture[];
  furniturePositions: FurniturePositions;
  moment: Moment;
  memories: Memory[];
  discoveredReactions: string[];
  interactions: number;
  houseName: string;
  setHouseName: (name: string) => void;
  selectMobby: (id: MobbyId) => void;
  interact: (kind: InteractionKind) => void;
  toggleFurniture: (item: Furniture) => void;
  setFurniturePosition: (item: Furniture, position: FurniturePosition) => void;
  recordMoment: () => void;
};

const DEFAULT_ROOM: Furniture[] = ['ソファ', '植物'];
const STORAGE_KEY = '@mobby-house/game-v2';
const FURNITURE_IDS = new Set<Furniture>(FURNITURE_ASSETS.map((asset) => asset.id));

type PersistedGame = {
  day: number;
  selectedMobbyId: MobbyId;
  roomItems: Furniture[];
  furniturePositions?: FurniturePositions;
  interactions: number;
  memories: Memory[];
  discoveredReactions: string[];
  moment: Moment;
  houseName: string;
};

const MobbyGameContext = createContext<MobbyGameValue | null>(null);

export function MobbyGameProvider({ children }: { children: ReactNode }) {
  const [day, setDay] = useState(1);
  const [selectedMobbyId, setSelectedMobbyId] = useState<MobbyId>('mobichi');
  const [roomItems, setRoomItems] = useState<Furniture[]>(DEFAULT_ROOM);
  const [furniturePositions, setFurniturePositions] = useState<FurniturePositions>({});
  const [interactions, setInteractions] = useState(0);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [discoveredReactions, setDiscoveredReactions] = useState<string[]>([]);
  const [houseName, setHouseName] = useState('ひだまりの一部屋');
  const [isHydrated, setIsHydrated] = useState(false);
  const [moment, setMoment] = useState<Moment>({
    id: 'welcome-1',
    title: '今日のモビータイム',
    text: 'モビーが部屋の中で、いつものリズムを過ごしています。小さな変化を探してみよう。',
    kind: 'welcome',
  });

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const saved = JSON.parse(raw) as Partial<PersistedGame>;
          if (typeof saved.day === 'number') setDay(Math.max(1, saved.day));
          if (typeof saved.interactions === 'number') setInteractions(Math.max(0, saved.interactions));
          if (typeof saved.selectedMobbyId === 'string' && MOBBIES.some((mobby) => mobby.id === saved.selectedMobbyId)) {
            setSelectedMobbyId(saved.selectedMobbyId as MobbyId);
          }
          if (Array.isArray(saved.roomItems)) {
            const validItems = saved.roomItems.filter((item): item is Furniture => typeof item === 'string' && FURNITURE_IDS.has(item as Furniture));
            setRoomItems(validItems.length ? validItems : DEFAULT_ROOM);
          }
          if (saved.furniturePositions && typeof saved.furniturePositions === 'object') {
            const validPositions = Object.entries(saved.furniturePositions).reduce<FurniturePositions>((result, [item, position]) => {
              if (!FURNITURE_IDS.has(item as Furniture) || !position || typeof position !== 'object') return result;
              const next = position as Partial<FurniturePosition>;
              if (typeof next.left !== 'number' || typeof next.bottom !== 'number') return result;
              result[item as Furniture] = {
                left: Math.max(0, Math.min(100, next.left)),
                bottom: Math.max(0, Math.min(100, next.bottom)),
              };
              return result;
            }, {});
            setFurniturePositions(validPositions);
          }
          if (Array.isArray(saved.memories)) setMemories(saved.memories as Memory[]);
          if (Array.isArray(saved.discoveredReactions)) setDiscoveredReactions(saved.discoveredReactions.filter((item): item is string => typeof item === 'string'));
          if (typeof saved.houseName === 'string' && saved.houseName.trim()) setHouseName(saved.houseName.slice(0, 18));
          if (saved.moment && typeof saved.moment.id === 'string') setMoment(saved.moment as Moment);
        } catch {
          // A broken local cache should never prevent the app from opening.
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const snapshot: PersistedGame = { day, selectedMobbyId, roomItems, furniturePositions, interactions, memories, discoveredReactions, moment, houseName };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => undefined);
  }, [day, discoveredReactions, furniturePositions, houseName, interactions, isHydrated, memories, moment, roomItems, selectedMobbyId]);

  const selectedMobby = useMemo(() => getMobby(selectedMobbyId), [selectedMobbyId]);

  const selectMobby = useCallback((id: MobbyId) => {
    const nextMobby = getMobby(id);
    setSelectedMobbyId(id);
    setMoment({
      id: `select-${id}-${Date.now()}`,
      title: `${nextMobby.name}が来たよ`,
      text: nextMobby.lines.care[0],
      kind: 'care',
    });
  }, []);

  const interact = useCallback((kind: InteractionKind) => {
    const nextMobby = getMobby(selectedMobbyId);
    const nextCount = interactions + 1;
    const line = nextMobby.lines[kind][nextCount % nextMobby.lines[kind].length];
    const furniture = roomItems[nextCount % Math.max(roomItems.length, 1)];
    const titles: Record<InteractionKind, string> = {
      tease: `${nextMobby.name}にちょっかい`,
      care: `${nextMobby.name}と過ごす`,
      move: '部屋に小さな変化',
      gift: '思いがけない贈り物',
    };

    setInteractions(nextCount);
    setDiscoveredReactions((current) => {
      const reactionKey = `${selectedMobbyId}:${kind}`;
      return current.includes(reactionKey) ? current : [...current, reactionKey];
    });
    if (nextCount % 7 === 0) setDay((currentDay) => currentDay + 1);
    setMoment({
      id: `${selectedMobbyId}-${nextCount}`,
      title: titles[kind],
      text: kind === 'move' && furniture ? `${line} 「${furniture}」のそばで、いつもと違う動きが見えたよ。` : line,
      kind,
    });
  }, [interactions, roomItems, selectedMobbyId]);

  const toggleFurniture = useCallback((item: Furniture) => {
    setRoomItems((current) => {
      const next = current.includes(item) ? current.filter((currentItem) => currentItem !== item) : [...current, item];
      setMoment({
        id: `room-${item}-${Date.now()}`,
        title: '部屋に小さな変化',
        text: next.includes(item) ? `${item}を置いたよ。モビーの動きが少し変わるかも。` : `${item}を片づけたよ。空いた場所も暮らしの一部。`,
        kind: 'room',
      });
      return next;
    });
  }, []);

  const setFurniturePosition = useCallback((item: Furniture, position: FurniturePosition) => {
    setFurniturePositions((current) => ({
      ...current,
      [item]: {
        left: Math.max(0, Math.min(100, position.left)),
        bottom: Math.max(0, Math.min(100, position.bottom)),
      },
    }));
  }, []);

  const recordMoment = useCallback(() => {
    setMemories((current) => {
      if (current.some((memory) => memory.id === moment.id)) return current;
      return [{ ...moment, mobbyId: selectedMobbyId, mobbyName: selectedMobby.name, day }, ...current];
    });
    setMoment((current) => ({
      ...current,
      title: '思い出アルバムに保存したよ',
      text: 'この瞬間を、あとから何度でも見返せるようになりました。',
    }));
  }, [day, moment, selectedMobby.name, selectedMobbyId]);

  const value = useMemo<MobbyGameValue>(() => ({
    day,
    selectedMobbyId,
    selectedMobby,
    roomItems,
    furniturePositions,
    moment,
    memories,
    discoveredReactions,
    interactions,
    houseName,
    setHouseName,
    selectMobby,
    interact,
    toggleFurniture,
    setFurniturePosition,
    recordMoment,
  }), [day, discoveredReactions, furniturePositions, houseName, interact, interactions, memories, moment, recordMoment, roomItems, selectMobby, selectedMobby, selectedMobbyId, setFurniturePosition, toggleFurniture]);

  return <MobbyGameContext.Provider value={value}>{children}</MobbyGameContext.Provider>;
}

export function useMobbyGame() {
  const context = useContext(MobbyGameContext);
  if (!context) throw new Error('useMobbyGame must be used inside MobbyGameProvider');
  return context;
}

export { MOBBIES };
