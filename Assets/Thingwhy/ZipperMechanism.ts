/** A constrained educational zipper, not a cloth or repair simulation.
 * Source: YKK https://www.ykk.com/ykk/tech/01.html (Y-shaped slider tunnel).
 */
export type ZipperStage = "Use" | "Predict" | "Investigate" | "Fix" | "Prove" | "Complete"
export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

export class ZipperMechanism {
  public progress = 0
  public assembled = true
  public shellFlipped = false
  public readonly travel = 22

  public get sliderY(): number { return -11 + this.progress * this.travel }

  public setProgress(value: number): boolean {
    if (!this.assembled || !isFinite(value)) return false
    this.progress = clamp01(value)
    return true
  }

  /** Both tooth rows and the colored tape segments use this same channel path.
   * At a fixed y, raising the slider converges the rows; lowering separates them.
   * Opposing teeth are half a pitch apart and have a positive y clearance.
   */
  public rowOffset(y: number): number {
    const t = clamp01((y - this.sliderY + 2) / 4)
    const smooth = t * t * (3 - 2 * t)
    return 0.35 + smooth * 2.05
  }

  public beginAssembly(): void {
    this.progress = 0.5
    this.assembled = false
    this.shellFlipped = true
  }

  public rotateShell(): void { if (!this.assembled) this.shellFlipped = !this.shellFlipped }

  public tryAssembly(): boolean {
    if (this.shellFlipped) return false
    this.assembled = true
    return true
  }

  public reset(): void {
    this.progress = 0
    this.assembled = true
    this.shellFlipped = false
  }
}
