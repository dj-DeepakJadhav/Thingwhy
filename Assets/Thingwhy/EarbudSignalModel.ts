export type EarbudSound="hum"|"changing"
export interface EarbudSample {external:number;passive:number;anti:number;residual:number}

/** Deterministic single-point teaching model, not an adaptive ANC product DSP.
 * Source amplitudes, seal factors and cancellation gains are illustrative units.
 * All displayed traces and level estimates use this same pressure calculation.
 */
export class EarbudSignalModel {
  public anc=false
  public source:EarbudSound="hum"
  public paused=false
  public elapsed=0
  private tip=2

  public get fit():number{return [0.2,0.6,1][this.tip]}
  public get tipIndex():number{return this.tip}
  public get tipName():string{return ["Loose","Partial","Sealed"][this.tip]}

  public setTip(index:number):void {
    if(!Number.isInteger(index)||index<0||index>2)throw new RangeError("Tip index must be 0, 1 or 2")
    this.tip=index
  }

  public cycleTip():void {this.tip=(this.tip+1)%3}

  public tick(dt:number):void {
    if(!Number.isFinite(dt)||dt<0)throw new RangeError("Elapsed frame time must be finite and nonnegative")
    if(!this.paused)this.elapsed+=Math.min(dt,0.05)
  }

  public sample(t:number):EarbudSample {
    const tau=2*Math.PI
    const low=0.7*Math.sin(tau*120*t)+0.08*Math.sin(tau*240*t)
    const high=this.source==="hum"?0:
      0.4*Math.sin(tau*850*t)*(0.65+0.35*Math.sin(tau*3*t))+
      0.25*Math.sin(tau*1800*t+0.6*Math.sin(tau*5*t))
    const passiveLow=low*(1-0.24*this.fit),passiveHigh=high*(1-0.65*this.fit)
    const passive=passiveLow+passiveHigh
    // Opposing low-band contribution is stronger; changing/high content remains.
    const anti=this.anc?-(0.9*passiveLow+0.15*passiveHigh):0
    return {external:low+high,passive,anti,residual:passive+anti}
  }

  public levels():{external:number;passive:number;residual:number;ratio:number} {
    let external=0,passive=0,residual=0
    for(let i=0;i<512;i++){
      const s=this.sample(i/8000)
      external+=s.external*s.external;passive+=s.passive*s.passive;residual+=s.residual*s.residual
    }
    const e=Math.sqrt(external/512),p=Math.sqrt(passive/512),r=Math.sqrt(residual/512)
    return {external:e,passive:p,residual:r,ratio:e>0?r/e:0}
  }

  public reset():void {
    this.anc=false;this.source="hum";this.paused=false;this.elapsed=0;this.tip=2
  }
}
