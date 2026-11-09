export type ReplayFrame<T>={from:T;to:T;progress:number;holding:boolean}

/** Playback state is separate from the live lesson and holds the result for inspection. */
export class ActionReplay<T> {
  private last:{from:T;to:T}|null=null
  private elapsed:number|null=null

  get available():boolean {return this.last!==null}
  get active():boolean {return this.elapsed!==null}

  remember(from:T,to:T):void {this.last={from,to}}
  start():boolean {
    if(!this.last)return false
    this.elapsed=0
    return true
  }
  stop():void {this.elapsed=null}
  clear():void {this.stop();this.last=null}

  tick(dt:number,paused=false):ReplayFrame<T>|null {
    if(this.elapsed===null||!this.last)return null
    if(!paused)this.elapsed+=dt
    if(this.elapsed>=1.65){this.stop();return null}
    return {...this.last,progress:Math.min(1,this.elapsed),holding:this.elapsed>=1}
  }
}
