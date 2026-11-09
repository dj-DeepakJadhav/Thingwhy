/** Discrete teaching pump. A dry squeeze can only prime on release. */
export class SprayMechanism {
  pressed=false
  primed=true
  blocked=false

  squeeze():boolean {
    if(this.pressed)return false
    this.pressed=true
    const emitted=this.primed
    this.primed=false
    return emitted
  }

  release():boolean {
    if(!this.pressed)return false
    this.pressed=false
    this.primed=!this.blocked
    return this.primed
  }

  beginRepair():void {this.pressed=false;this.primed=false;this.blocked=true}
  clearInlet():void {this.blocked=false}
  reset():void {this.pressed=false;this.primed=true;this.blocked=false}
}
