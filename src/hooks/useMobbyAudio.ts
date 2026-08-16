import { useCallback, useEffect, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

export type MobbyBgmMode = 'normal' | 'incident' | 'silent';

export type MobbySfx =
  | 'tap'
  | 'notification'
  | 'boxOpen'
  | 'reward'
  | 'place'
  | 'keyJingle'
  | 'incidentSting'
  | 'clueReveal'
  | 'caseSolved'
  | 'transition'
  | 'tab'
  | 'collectionComplete'
  | 'reactionDiscovered'
  | 'stamp'
  | 'dialogue'
  | 'error';

const BGM = require('../../assets/audio/bgm-cozy-room.wav');
const INCIDENT_BGM = require('../../assets/audio/bgm-incident-investigation.wav');
const TAP = require('../../assets/audio/sfx-tap.wav');
const NOTIFICATION = require('../../assets/audio/sfx-notification.wav');
const KEY_JINGLE = require('../../assets/audio/sfx-keychain-jingle.wav');
const BOX_OPEN = require('../../assets/audio/sfx-box-open.wav');
const REWARD = require('../../assets/audio/sfx-reward.wav');
const PLACE = require('../../assets/audio/sfx-place.wav');
const INCIDENT_STING = require('../../assets/audio/sfx-incident-sting.wav');
const CLUE_REVEAL = require('../../assets/audio/sfx-clue-reveal.wav');
const CASE_SOLVED = require('../../assets/audio/sfx-case-solved.wav');
const TRANSITION = require('../../assets/audio/transition-swish.wav');
const TAB = require('../../assets/audio/tab-pop.wav');
const COLLECTION_COMPLETE = require('../../assets/audio/collection-complete.wav');
const REACTION_DISCOVERED = require('../../assets/audio/reaction-discovered.wav');
const STAMP = require('../../assets/audio/stamp-hit.wav');
const DIALOGUE = require('../../assets/audio/dialogue-step.wav');
const ERROR = require('../../assets/audio/action-error.wav');

const NORMAL_BGM_VOLUME = 0.18;
const INCIDENT_BGM_VOLUME = 0.2;
const FADE_INTERVAL_MS = 30;

export function useMobbyAudio({
  bgmEnabled,
  sfxEnabled,
  bgmMode,
}: {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  bgmMode: MobbyBgmMode;
}) {
  const bgmPlayer = useAudioPlayer(BGM);
  const incidentBgmPlayer = useAudioPlayer(INCIDENT_BGM);
  const tapPlayer = useAudioPlayer(TAP, { keepAudioSessionActive: true });
  const notificationPlayer = useAudioPlayer(NOTIFICATION, { keepAudioSessionActive: true });
  const keyJinglePlayer = useAudioPlayer(KEY_JINGLE, { keepAudioSessionActive: true });
  const boxOpenPlayer = useAudioPlayer(BOX_OPEN, { keepAudioSessionActive: true });
  const rewardPlayer = useAudioPlayer(REWARD, { keepAudioSessionActive: true });
  const placePlayer = useAudioPlayer(PLACE, { keepAudioSessionActive: true });
  const incidentStingPlayer = useAudioPlayer(INCIDENT_STING, { keepAudioSessionActive: true });
  const clueRevealPlayer = useAudioPlayer(CLUE_REVEAL, { keepAudioSessionActive: true });
  const caseSolvedPlayer = useAudioPlayer(CASE_SOLVED, { keepAudioSessionActive: true });
  const transitionPlayer = useAudioPlayer(TRANSITION, { keepAudioSessionActive: true });
  const tabPlayer = useAudioPlayer(TAB, { keepAudioSessionActive: true });
  const collectionCompletePlayer = useAudioPlayer(COLLECTION_COMPLETE, { keepAudioSessionActive: true });
  const reactionDiscoveredPlayer = useAudioPlayer(REACTION_DISCOVERED, { keepAudioSessionActive: true });
  const stampPlayer = useAudioPlayer(STAMP, { keepAudioSessionActive: true });
  const dialoguePlayer = useAudioPlayer(DIALOGUE, { keepAudioSessionActive: true });
  const errorPlayer = useAudioPlayer(ERROR, { keepAudioSessionActive: true });
  const fadeGenerationRef = useRef(0);
  const bgmModeRef = useRef(bgmMode);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    bgmPlayer.loop = true;
    incidentBgmPlayer.loop = true;
    bgmPlayer.volume = 0;
    incidentBgmPlayer.volume = 0;
    tapPlayer.volume = 0.34;
    notificationPlayer.volume = 0.42;
    keyJinglePlayer.volume = 0.24;
    boxOpenPlayer.volume = 0.46;
    rewardPlayer.volume = 0.42;
    placePlayer.volume = 0.44;
    incidentStingPlayer.volume = 0.48;
    clueRevealPlayer.volume = 0.4;
    caseSolvedPlayer.volume = 0.48;
    transitionPlayer.volume = 0.36;
    tabPlayer.volume = 0.34;
    collectionCompletePlayer.volume = 0.4;
    reactionDiscoveredPlayer.volume = 0.4;
    stampPlayer.volume = 0.42;
    dialoguePlayer.volume = 0.3;
    errorPlayer.volume = 0.34;
  }, [bgmPlayer, boxOpenPlayer, caseSolvedPlayer, clueRevealPlayer, collectionCompletePlayer, dialoguePlayer, errorPlayer, incidentBgmPlayer, incidentStingPlayer, keyJinglePlayer, notificationPlayer, placePlayer, reactionDiscoveredPlayer, rewardPlayer, stampPlayer, tabPlayer, tapPlayer, transitionPlayer]);

  useEffect(() => {
    bgmModeRef.current = bgmMode;
    const generation = ++fadeGenerationRef.current;
    const normalTarget = bgmEnabled && bgmMode === 'normal' ? NORMAL_BGM_VOLUME : 0;
    const incidentTarget = bgmEnabled && bgmMode === 'incident' ? INCIDENT_BGM_VOLUME : 0;
    const duration = bgmMode === 'normal' ? 600 : bgmMode === 'incident' ? 360 : 250;
    const steps = Math.max(1, Math.ceil(duration / FADE_INTERVAL_MS));
    const normalStart = bgmPlayer.volume;
    const incidentStart = incidentBgmPlayer.volume;
    let step = 0;

    if (!bgmEnabled) {
      bgmPlayer.volume = 0;
      incidentBgmPlayer.volume = 0;
      bgmPlayer.pause();
      incidentBgmPlayer.pause();
      return;
    }

    if (normalTarget > 0) bgmPlayer.play();
    if (incidentTarget > 0) incidentBgmPlayer.play();

    const timer = setInterval(() => {
      if (fadeGenerationRef.current !== generation) {
        clearInterval(timer);
        return;
      }
      step += 1;
      const progress = Math.min(1, step / steps);
      bgmPlayer.volume = normalStart + (normalTarget - normalStart) * progress;
      incidentBgmPlayer.volume = incidentStart + (incidentTarget - incidentStart) * progress;
      if (progress < 1) return;
      clearInterval(timer);
      if (normalTarget === 0) bgmPlayer.pause();
      if (incidentTarget === 0) incidentBgmPlayer.pause();
    }, FADE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [bgmEnabled, bgmMode, bgmPlayer, incidentBgmPlayer]);

  const engageBgm = useCallback(() => {
    if (bgmModeRef.current === 'silent') return;
    const player = bgmModeRef.current === 'incident' ? incidentBgmPlayer : bgmPlayer;
    player.loop = true;
    player.volume = bgmModeRef.current === 'incident' ? INCIDENT_BGM_VOLUME : NORMAL_BGM_VOLUME;
    player.play();
  }, [bgmPlayer, incidentBgmPlayer]);

  const playSfx = useCallback((sound: MobbySfx) => {
    if (!sfxEnabled) return;
    const player = sound === 'tap'
      ? tapPlayer
      : sound === 'notification'
        ? notificationPlayer
        : sound === 'keyJingle'
          ? keyJinglePlayer
        : sound === 'boxOpen'
          ? boxOpenPlayer
          : sound === 'reward'
            ? rewardPlayer
            : sound === 'place'
              ? placePlayer
              : sound === 'incidentSting'
                ? incidentStingPlayer
                : sound === 'clueReveal'
                  ? clueRevealPlayer
                  : sound === 'caseSolved'
                    ? caseSolvedPlayer
                    : sound === 'transition'
                      ? transitionPlayer
                      : sound === 'tab'
                        ? tabPlayer
                        : sound === 'collectionComplete'
                          ? collectionCompletePlayer
                          : sound === 'reactionDiscovered'
                            ? reactionDiscoveredPlayer
                            : sound === 'stamp'
                              ? stampPlayer
                              : sound === 'dialogue'
                                ? dialoguePlayer
                                : errorPlayer;

    void player.seekTo(0)
      .then(() => player.play())
      .catch(() => player.play());
  }, [boxOpenPlayer, caseSolvedPlayer, clueRevealPlayer, collectionCompletePlayer, dialoguePlayer, errorPlayer, incidentStingPlayer, keyJinglePlayer, notificationPlayer, placePlayer, reactionDiscoveredPlayer, rewardPlayer, sfxEnabled, stampPlayer, tabPlayer, tapPlayer, transitionPlayer]);

  return { engageBgm, playSfx };
}
