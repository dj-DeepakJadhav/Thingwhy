import {ZipperMechanism} from "./ZipperMechanism"

/** Presentation only. One separation phase orders lift before spread, as in Teardown.
 * Gameplay assembly/orientation remain owned by ZipperMechanism and ZipperEpisode.
 */
export class ZipperPresentationMotion {
  private separation=0
  private angle=0

  public reset():void {this.separation=0;this.angle=0}

  public update(model:ZipperMechanism,dt:number,paused:boolean):void {
    if(paused)return
    const seconds=Math.min(dt,0.05)
    const target=model.assembled?0:1
    this.separation=this.approach(this.separation,target,seconds/0.8)
    this.angle=this.approach(this.angle,model.shellFlipped?Math.PI:0,seconds*Math.PI/0.6)
  }

  public get position():vec3 {
    const lift=this.smooth(this.separation*2),spread=this.smooth(this.separation*2-1)
    return new vec3(0.7*spread,6.8*spread,0.8+2.5*lift)
  }

  public get rotation():quat {
    return quat.fromEulerAngles(-0.2*this.smooth(this.separation*2-1),0,this.angle)
  }

  private approach(value:number,target:number,step:number):number {
    return value+Math.sign(target-value)*Math.min(step,Math.abs(target-value))
  }

  private smooth(value:number):number {
    const t=Math.max(0,Math.min(1,value))
    return t*t*(3-2*t)
  }
}
