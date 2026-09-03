function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export class BattleAudio {
  private ctx: AudioContext | null = null;
  private beatEl: HTMLAudioElement | null = null;
  private beatSource: MediaElementAudioSourceNode | null = null;
  private beatGain: GainNode | null = null;
  private vocalGain: GainNode | null = null;
  private queue: ArrayBuffer[] = [];
  private playing = false;
  private onIdle: (() => void) | null = null;

  async ensure(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.beatGain = this.ctx.createGain();
      this.vocalGain = this.ctx.createGain();
      this.beatGain.gain.value = 0.32;
      this.vocalGain.gain.value = 1;
      this.beatGain.connect(this.ctx.destination);
      this.vocalGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  async startBeat(url = "/beats/loop.wav"): Promise<void> {
    await this.ensure();
    if (!this.ctx || !this.beatGain) return;

    if (!this.beatEl) {
      this.beatEl = new Audio(url);
      this.beatEl.loop = true;
      this.beatEl.crossOrigin = "anonymous";
      this.beatSource = this.ctx.createMediaElementSource(this.beatEl);
      this.beatSource.connect(this.beatGain);
    }

    try {
      await this.beatEl.play();
    } catch {
      // autoplay may require gesture — caller starts after click
    }
  }

  stopBeat(): void {
    this.beatEl?.pause();
    if (this.beatEl) this.beatEl.currentTime = 0;
  }

  duck(active: boolean): void {
    if (!this.beatGain || !this.ctx) return;
    const g = this.beatGain.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(active ? 0.14 : 0.32, now, 0.05);
  }

  enqueueMp3Chunks(chunks: Uint8Array[]): void {
    const bytes = concatChunks(chunks);
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    this.queue.push(copy);
    void this.pump();
  }

  enqueueBase64Mp3(parts: string[]): void {
    const bins = parts.map((b64) => {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    });
    this.enqueueMp3Chunks(bins);
  }

  setOnIdle(cb: (() => void) | null): void {
    this.onIdle = cb;
  }

  private async pump(): Promise<void> {
    if (this.playing) return;
    const next = this.queue.shift();
    if (!next) {
      this.duck(false);
      this.onIdle?.();
      return;
    }
    await this.ensure();
    if (!this.ctx || !this.vocalGain) return;

    this.playing = true;
    this.duck(true);

    try {
      const audio = await this.ctx.decodeAudioData(next.slice(0));
      await new Promise<void>((resolve) => {
        const src = this.ctx!.createBufferSource();
        src.buffer = audio;
        src.connect(this.vocalGain!);
        src.onended = () => resolve();
        src.start();
      });
    } catch (err) {
      console.error("Vocal decode/play failed", err);
    } finally {
      this.playing = false;
      void this.pump();
    }
  }

  dispose(): void {
    this.stopBeat();
    this.queue = [];
    void this.ctx?.close();
    this.ctx = null;
    this.beatEl = null;
    this.beatSource = null;
    this.beatGain = null;
    this.vocalGain = null;
  }
}
