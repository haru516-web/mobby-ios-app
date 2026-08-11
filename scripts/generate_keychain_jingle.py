"""Generate the short, soft metallic keychain sound used by drag gestures."""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "audio" / "sfx-keychain-jingle.wav"
SAMPLE_RATE = 44_100
DURATION = 0.46


def main() -> None:
    random.seed(516)
    resonances = (
        (1260.0, 0.31),
        (1930.0, 0.26),
        (3120.0, 0.21),
        (4860.0, 0.15),
        (7230.0, 0.07),
    )
    hits = ((0.0, 1.0), (0.074, 0.55), (0.151, 0.32))
    samples: list[float] = []

    for sample_index in range(round(SAMPLE_RATE * DURATION)):
        time = sample_index / SAMPLE_RATE
        value = 0.0
        for hit_time, hit_gain in hits:
            elapsed = time - hit_time
            if elapsed < 0:
                continue
            tone = sum(
                weight
                * math.sin(2 * math.pi * frequency * elapsed + frequency * 0.00031)
                for frequency, weight in resonances
            )
            value += hit_gain * tone * math.exp(-elapsed * 15.5)
            if elapsed < 0.022:
                value += (
                    hit_gain
                    * (random.random() * 2 - 1)
                    * 0.22
                    * math.exp(-elapsed * 92)
                )
        tail_fade = min(1.0, max(0.0, (DURATION - time) / 0.045))
        samples.append(value * tail_fade)

    peak = max(abs(sample) for sample in samples) or 1.0
    pcm = b"".join(
        struct.pack("<h", round(max(-1.0, min(1.0, sample / peak * 0.76)) * 32767))
        for sample in samples
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm)
    print(OUTPUT)


if __name__ == "__main__":
    main()
