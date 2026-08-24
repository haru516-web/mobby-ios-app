import { useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { INCIDENTS_ENABLED } from '@/config/features';
import { getEpisode } from '@/data/episodes/registry';
import type { EpisodeId, PlaybackState } from '@/data/episodes/types';
import { EpisodeScreen } from '@/screens/EpisodeScreen';
import { useMobbyAppShell } from '@/state/MobbyAppShell';

export default function StoryRoute() {
  const params = useLocalSearchParams<{ episodeId?: string | string[] }>();
  const requestedId = Array.isArray(params.episodeId) ? params.episodeId[0] : params.episodeId;
  const episode = requestedId ? getEpisode(requestedId as EpisodeId) : undefined;
  const shell = useMobbyAppShell();
  const leaving = useRef(false);
  const matchesActiveRun = Boolean(episode && shell.activeEpisode && shell.activeEpisode.episodeId === episode.id && shell.activeEpisodeData?.id === episode.id);

  useEffect(() => {
    if (!INCIDENTS_ENABLED || (shell.isHydrated && !matchesActiveRun)) router.replace('/stories');
  }, [matchesActiveRun, shell.isHydrated]);

  if (!INCIDENTS_ENABLED || !episode || !shell.activeEpisode || !matchesActiveRun) return null;
  const interrupt = async (playback: PlaybackState) => {
    if (leaving.current) return;
    leaving.current = true;
    try {
      await shell.interruptEpisode(playback);
      router.replace('/stories');
    } catch (error) {
      leaving.current = false;
      throw error;
    }
  };
  return <EpisodeScreen episode={episode} initialState={shell.activeEpisode.playback} reduceMotion={shell.reduceMotion} onCue={shell.emitEpisodeCue} onProgress={shell.saveEpisodeProgress} onInterrupt={interrupt} onComplete={async (result) => {
    if (leaving.current) return;
    leaving.current = true;
    try {
      await shell.completeActiveEpisode(result);
      router.replace('/');
    } catch (error) {
      leaving.current = false;
      throw error;
    }
  }} />;
}
