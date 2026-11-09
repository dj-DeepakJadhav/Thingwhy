/** Indexed teaching latch. Travel is normalized to one extended-stop depth. */
export class PenMechanism {
  private index = 0
  private down = false
  private seated = true
  private aligned = true

  get camIndex(): number { return this.index }
  get pressed(): boolean { return this.down }
  get assembled(): boolean { return this.seated }
  get camAligned(): boolean { return this.aligned }
  get extended(): boolean { return this.seated && this.index % 2 === 1 }
  get refillTravel(): number { return this.down ? 1.3 : this.extended ? 1 : 0 }

  press(): boolean {
    if (!this.seated || this.down) return false
    this.down = true
    return true
  }

  release(): boolean {
    if (!this.down) return false
    this.down = false
    this.index = (this.index + 1) % 8
    return true
  }

  beginAssembly(): void {
    this.reset()
    this.seated = false
    this.aligned = false
  }

  rotateLooseCam(): void {
    if (!this.seated) this.aligned = !this.aligned
  }

  trySeatCam(): boolean {
    if (this.seated || !this.aligned) return false
    this.seated = true
    return true
  }

  reset(): void {
    this.index = 0
    this.down = false
    this.seated = true
    this.aligned = true
  }
}
