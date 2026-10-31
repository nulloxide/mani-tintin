export class RadioAudio {
  enabled = true;
  private context?: AudioContext;
  private master?: GainNode;
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.gain.value = 0.1;
        this.master.connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch {
      this.enabled = false;
    }
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.unlock();
    if (this.master && this.context)
      this.master.gain.setValueAtTime(
        this.enabled ? 0.1 : 0,
        this.context.currentTime,
      );
    return this.enabled;
  }
  suspend() {
    void this.context?.suspend().catch(() => {});
  }
  play(
    kind: "collect" | "jump" | "radio" | "wrong" | "win" | "bark" | "engine",
  ) {
    if (
      !this.enabled ||
      !this.context ||
      !this.master ||
      this.context.state !== "running"
    )
      return;
    const notes = {
      collect: [523, 659, 784, 1046],
      jump: [220, 440],
      radio: [880, 660],
      wrong: [180, 130],
      win: [392, 523, 659, 784, 1046],
      bark: [340, 260, 340],
      engine: [65, 85, 110, 140],
    }[kind];
    notes.forEach((frequency, i) => {
      const oscillator = this.context!.createOscillator();
      const volume = this.context!.createGain();
      oscillator.type =
        kind === "bark" || kind === "engine" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      const start = this.context!.currentTime + i * 0.09;
      volume.gain.setValueAtTime(0, start);
      volume.gain.linearRampToValueAtTime(0.45, start + 0.01);
      volume.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      oscillator.connect(volume);
      volume.connect(this.master!);
      oscillator.start(start);
      oscillator.stop(start + 0.23);
      oscillator.onended = () => {
        oscillator.disconnect();
        volume.disconnect();
      };
    });
  }
}
