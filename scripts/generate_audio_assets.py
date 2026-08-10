"""Generate the original MOBBY background loop and interaction sounds.

The synthesis is deterministic and uses only Python's standard library, so
the checked-in WAV files can be reproduced without third-party samples.
"""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 32_000
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "assets" / "audio"
RNG = random.Random(516)


def midi(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def new_buffer(seconds: float) -> list[float]:
    return [0.0] * (math.ceil(seconds * SAMPLE_RATE) * 2)


def add_tone(
    buffer: list[float],
    start: float,
    duration: float,
    frequency: float,
    amplitude: float,
    *,
    voice: str = "music_box",
    pan: float = 0.0,
    attack: float = 0.008,
    release: float = 0.24,
    end_frequency: float | None = None,
    wrap: bool = False,
) -> None:
    frame_count = len(buffer) // 2
    start_frame = round(start * SAMPLE_RATE)
    tone_frames = max(1, round(duration * SAMPLE_RATE))
    phase = 0.0
    left_gain = math.sqrt((1.0 - pan) * 0.5)
    right_gain = math.sqrt((1.0 + pan) * 0.5)

    for offset in range(tone_frames):
        raw_index = start_frame + offset
        if not wrap and raw_index >= frame_count:
            break
        frame = raw_index % frame_count
        progress = offset / max(1, tone_frames - 1)
        freq = frequency + ((end_frequency or frequency) - frequency) * progress
        phase += math.tau * freq / SAMPLE_RATE
        time = offset / SAMPLE_RATE
        remaining = (tone_frames - offset - 1) / SAMPLE_RATE
        envelope = min(1.0, time / max(attack, 1e-5), remaining / max(release, 1e-5))

        if voice == "music_box":
            body = math.sin(phase) + 0.38 * math.sin(2.01 * phase) + 0.16 * math.sin(3.97 * phase)
            envelope *= math.exp(-3.5 * progress)
            body /= 1.54
        elif voice == "felt_pad":
            body = math.sin(phase) + 0.24 * math.sin(0.501 * phase) + 0.12 * math.sin(2.003 * phase)
            body *= 0.9 + 0.1 * math.sin(math.tau * 0.55 * time)
            body /= 1.36
        elif voice == "wood":
            body = math.sin(phase) + 0.32 * math.sin(2.8 * phase)
            envelope *= math.exp(-8.0 * progress)
            body /= 1.32
        elif voice == "soft_bass":
            body = 0.82 * math.sin(phase) + 0.18 * math.sin(2.0 * phase)
            envelope *= math.exp(-1.8 * progress)
        else:
            body = math.sin(phase)

        sample = body * envelope * amplitude
        buffer[frame * 2] += sample * left_gain
        buffer[frame * 2 + 1] += sample * right_gain


def add_noise(
    buffer: list[float],
    start: float,
    duration: float,
    amplitude: float,
    *,
    pan: float = 0.0,
    decay: float = 5.0,
    wrap: bool = False,
) -> None:
    frame_count = len(buffer) // 2
    start_frame = round(start * SAMPLE_RATE)
    noise_frames = max(1, round(duration * SAMPLE_RATE))
    left_gain = math.sqrt((1.0 - pan) * 0.5)
    right_gain = math.sqrt((1.0 + pan) * 0.5)
    previous = 0.0

    for offset in range(noise_frames):
        raw_index = start_frame + offset
        if not wrap and raw_index >= frame_count:
            break
        frame = raw_index % frame_count
        progress = offset / max(1, noise_frames - 1)
        white = RNG.uniform(-1.0, 1.0)
        previous = previous * 0.56 + white * 0.44
        envelope = math.exp(-decay * progress) * math.sin(math.pi * progress)
        sample = previous * envelope * amplitude
        buffer[frame * 2] += sample * left_gain
        buffer[frame * 2 + 1] += sample * right_gain


def write_wav(path: Path, buffer: list[float], peak: float = 0.88) -> None:
    maximum = max(1e-8, max(abs(sample) for sample in buffer))
    gain = peak / maximum
    frames = bytearray((len(buffer) // 2) * 4)
    for frame in range(len(buffer) // 2):
        left = max(-1.0, min(1.0, buffer[frame * 2] * gain))
        right = max(-1.0, min(1.0, buffer[frame * 2 + 1] * gain))
        struct.pack_into("<hh", frames, frame * 4, round(left * 32767), round(right * 32767))

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(frames)


def render_bgm() -> None:
    bpm = 104
    beat = 60.0 / bpm
    bars = 8
    loop_seconds = bars * 4 * beat
    buffer = new_buffer(loop_seconds)
    chords = [
        (48, 52, 55),  # C
        (45, 48, 52),  # Am
        (41, 45, 48),  # F
        (43, 47, 50),  # G
        (40, 43, 47),  # Em
        (45, 48, 52),  # Am
        (38, 41, 45),  # Dm
        (43, 47, 50),  # G
    ]
    melody = [
        [72, 74, 76, 79, 76, 74, 72, None],
        [69, 72, 76, 74, 72, 69, None, 67],
        [69, 72, 74, 76, 74, 72, 69, None],
        [71, 74, 79, 77, 74, 71, None, 67],
        [71, 74, 76, 79, 76, 74, 71, None],
        [72, 76, 81, 79, 76, 72, None, 69],
        [69, 72, 74, 77, 74, 72, 69, None],
        [71, 74, 79, 83, 79, 74, 71, None],
    ]

    for bar, chord in enumerate(chords):
        bar_start = bar * 4 * beat
        for note_index, note in enumerate(chord):
            add_tone(
                buffer,
                bar_start,
                4.35 * beat,
                midi(note),
                0.062,
                voice="felt_pad",
                pan=(note_index - 1) * 0.22,
                attack=0.22,
                release=0.48,
                wrap=True,
            )

        add_tone(buffer, bar_start, 1.25 * beat, midi(chord[0]), 0.12, voice="soft_bass", pan=-0.08, release=0.38, wrap=True)
        add_tone(buffer, bar_start + 2 * beat, 1.1 * beat, midi(chord[0] + 7), 0.085, voice="soft_bass", pan=0.08, release=0.34, wrap=True)

        arpeggio = [chord[0] + 24, chord[1] + 24, chord[2] + 24, chord[1] + 24, chord[0] + 24, chord[1] + 24, chord[2] + 24, chord[1] + 24]
        for step, note in enumerate(arpeggio):
            add_tone(buffer, bar_start + step * beat / 2, 0.72 * beat, midi(note), 0.073, voice="music_box", pan=-0.3 + 0.6 * (step / 7), release=0.22, wrap=True)

        for step, note in enumerate(melody[bar]):
            if note is None:
                continue
            add_tone(buffer, bar_start + step * beat / 2, 0.86 * beat, midi(note), 0.066, voice="music_box", pan=0.26 * math.sin(step), release=0.3, wrap=True)

        for beat_index in range(4):
            beat_start = bar_start + beat_index * beat
            if beat_index in (0, 2):
                add_tone(buffer, beat_start, 0.22, 96, 0.105, voice="soft_bass", end_frequency=52, release=0.12, wrap=True)
            else:
                add_tone(buffer, beat_start, 0.13, 460, 0.055, voice="wood", end_frequency=260, pan=0.16, release=0.06, wrap=True)
            add_noise(buffer, beat_start + beat / 2, 0.12, 0.026, pan=-0.18 if beat_index % 2 else 0.18, decay=8.0, wrap=True)

    write_wav(OUTPUT_DIR / "bgm-cozy-room.wav", buffer, peak=0.82)


def render_tap() -> None:
    buffer = new_buffer(0.16)
    add_tone(buffer, 0.0, 0.12, 720, 0.35, voice="wood", end_frequency=330, release=0.07)
    add_noise(buffer, 0.004, 0.08, 0.11, decay=12.0)
    write_wav(OUTPUT_DIR / "sfx-tap.wav", buffer)


def render_notification() -> None:
    buffer = new_buffer(0.92)
    for index, note in enumerate((76, 81, 84)):
        add_tone(buffer, index * 0.16, 0.72, midi(note), 0.22, voice="music_box", pan=-0.22 + index * 0.22, release=0.36)
    write_wav(OUTPUT_DIR / "sfx-notification.wav", buffer)


def render_box_open() -> None:
    buffer = new_buffer(1.65)
    for index in range(3):
        add_tone(buffer, index * 0.13, 0.18, 310 + index * 70, 0.19, voice="wood", end_frequency=180 + index * 40, pan=-0.2 + index * 0.2, release=0.08)
    for step in range(10):
        start = 0.34 + step * 0.055
        add_tone(buffer, start, 0.22, 250 + step * 55, 0.035 + step * 0.004, voice="sine", end_frequency=390 + step * 66, pan=-0.5 + step / 9, release=0.12)
        add_noise(buffer, start, 0.18, 0.024, pan=-0.4 + step * 0.09, decay=2.0)
    for index, note in enumerate((72, 76, 79, 84)):
        add_tone(buffer, 0.86 + index * 0.11, 0.68, midi(note), 0.15, voice="music_box", pan=-0.3 + index * 0.2, release=0.34)
    write_wav(OUTPUT_DIR / "sfx-box-open.wav", buffer)


def render_reward() -> None:
    buffer = new_buffer(1.92)
    notes = (72, 76, 79, 84, 88)
    for index, note in enumerate(notes):
        add_tone(buffer, index * 0.14, 0.96, midi(note), 0.19, voice="music_box", pan=-0.38 + index * 0.19, release=0.48)
    for note, pan in ((60, -0.18), (64, 0.0), (67, 0.18)):
        add_tone(buffer, 0.58, 1.22, midi(note), 0.075, voice="felt_pad", pan=pan, attack=0.09, release=0.52)
    add_noise(buffer, 0.52, 0.8, 0.035, decay=2.2)
    write_wav(OUTPUT_DIR / "sfx-reward.wav", buffer)


def render_place() -> None:
    buffer = new_buffer(1.28)
    add_tone(buffer, 0.0, 0.72, 880, 0.12, voice="sine", end_frequency=240, pan=-0.4, attack=0.02, release=0.18)
    add_noise(buffer, 0.04, 0.7, 0.045, pan=-0.12, decay=1.8)
    add_tone(buffer, 0.62, 0.2, 330, 0.32, voice="wood", end_frequency=170, release=0.09)
    for index, note in enumerate((67, 72, 79)):
        add_tone(buffer, 0.7 + index * 0.09, 0.5, midi(note), 0.13, voice="music_box", pan=-0.2 + index * 0.2, release=0.3)
    write_wav(OUTPUT_DIR / "sfx-place.wav", buffer)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    render_bgm()
    render_tap()
    render_notification()
    render_box_open()
    render_reward()
    render_place()
    for path in sorted(OUTPUT_DIR.glob("*.wav")):
        print(f"{path.name}: {path.stat().st_size / 1024:.1f} KiB")


if __name__ == "__main__":
    main()
