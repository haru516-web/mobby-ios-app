import { useCallback, useEffect } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

export type MobbySfx = 'tap' | 'notification' | 'boxOpen' | 'reward' | 'place';

const BGM = require('../../assets/audio/bgm-cozy-room.wav');
const TAP = require('../../assets/audio/sfx-tap.wav');
const NOTIFICATION = require('../../assets/audio/sfx-notification.wav');
const BOX_OPEN = require('../../assets/audio/sfx-box-open.wav');
const REWARD = require('../../assets/audio/sfx-reward.wav');
const PLACE = require('../../assets/audio/sfx-place.wav');

export function useMobbyAudio({
  bgmEnabled,
  sfxEnabled,
}: {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
}) {
  const bgmPlayer = useAudioPlayer(BGM);
  const tapPlayer = useAudioPlayer(TAP, { keepAudioSessionActive: true });
  const notificationPlayer = useAudioPlayer(NOTIFICATION, { keepAudioSessionActive: true });
  const boxOpenPlayer = useAudioPlayer(BOX_OPEN, { keepAudioSessionActive: true });
  const rewardPlayer = useAudioPlayer(REWARD, { keepAudioSessionActive: true });
  const placePlayer = useAudioPlayer(PLACE, { keepAudioSessionActive: true });

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    bgmPlayer.loop = true;
    bgmPlayer.volume = 0.18;
    tapPlayer.volume = 0.34;
    notificationPlayer.volume = 0.42;
    boxOpenPlayer.volume = 0.46;
    rewardPlayer.volume = 0.42;
    placePlayer.volume = 0.44;
  }, [bgmPlayer, boxOpenPlayer, notificationPlayer, placePlayer, rewardPlayer, tapPlayer]);

  useEffect(() => {
    if (bgmEnabled) bgmPlayer.play();
    else bgmPlayer.pause();
  }, [bgmEnabled, bgmPlayer]);

  const engageBgm = useCallback(() => {
    bgmPlayer.loop = true;
    bgmPlayer.volume = 0.18;
    bgmPlayer.play();
  }, [bgmPlayer]);

  const playSfx = useCallback((sound: MobbySfx) => {
    if (!sfxEnabled) return;
    const player = sound === 'tap'
      ? tapPlayer
      : sound === 'notification'
        ? notificationPlayer
        : sound === 'boxOpen'
          ? boxOpenPlayer
          : sound === 'reward'
            ? rewardPlayer
            : placePlayer;

    void player.seekTo(0)
      .then(() => player.play())
      .catch(() => player.play());
  }, [boxOpenPlayer, notificationPlayer, placePlayer, rewardPlayer, sfxEnabled, tapPlayer]);

  return { engageBgm, playSfx };
}
