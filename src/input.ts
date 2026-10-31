export class Input {
  keys = new Set<string>();
  x = 0;
  y = 0;
  jump = false;
  action = false;
  private pointer: number | null = null;
  private stick = document.querySelector<HTMLElement>("#joystick")!;
  private knob = document.querySelector<HTMLElement>("#stick-knob")!;
  constructor(onPause: () => void) {
    window.addEventListener("keydown", (e) => {
      const element = e.target as HTMLElement;
      if (
        element.matches("select, input, textarea") ||
        (element.closest("button") && ["Space", "Enter"].includes(e.code))
      )
        return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat && e.code === "Space") this.jump = true;
      if (!e.repeat && e.code === "KeyE") this.action = true;
      if (!e.repeat && e.code === "Escape") onPause();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.clear());
    this.stick.addEventListener("pointerdown", (e) => {
      if (this.pointer !== null) return;
      this.pointer = e.pointerId;
      this.stick.setPointerCapture(e.pointerId);
      this.move(e);
    });
    this.stick.addEventListener("pointermove", (e) => {
      if (e.pointerId === this.pointer) this.move(e);
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      this.stick.addEventListener(event, (e) => {
        if ((e as PointerEvent).pointerId === this.pointer) this.release();
      });
    document.querySelector("#jump")!.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.jump = true;
    });
    document.querySelector("#jump")!.addEventListener("keydown", (e) => {
      if (["Space", "Enter"].includes((e as KeyboardEvent).code)) {
        e.preventDefault();
        this.jump = true;
      }
    });
  }
  private move(e: PointerEvent) {
    const rect = this.stick.getBoundingClientRect();
    const range = rect.width * 0.31;
    const dx = (e.clientX - rect.left - rect.width / 2) / range;
    const dy = (e.clientY - rect.top - rect.height / 2) / range;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.x = dx / length;
    this.y = -dy / length;
    this.knob.style.transform = `translate(${this.x * range}px, ${-this.y * range}px)`;
  }
  private release() {
    const pointer = this.pointer;
    this.pointer = null;
    if (pointer !== null && this.stick.hasPointerCapture(pointer))
      this.stick.releasePointerCapture(pointer);
    this.x = 0;
    this.y = 0;
    this.knob.style.transform = "";
  }
  get axes() {
    const x =
      this.x +
      Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
      Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
    const y =
      this.y +
      Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) -
      Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"));
    const length = Math.max(1, Math.hypot(x, y));
    return { x: x / length, y: y / length };
  }
  clear() {
    this.keys.clear();
    this.jump = false;
    this.action = false;
    this.release();
  }
}
