import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {ReplayFrame} from "./ActionReplay"
import {inspectionOutline} from "./InspectionOutline"
import {styleText,earbudAccent,finishes} from "./ThingwhyStyle"
import {EarbudGeometry} from "./EarbudGeometry"
import {EarbudSignalModel} from "./EarbudSignalModel"

@component
export class EarbudView extends BaseScriptComponent {
  @input material!:Material
  @input traceMaterial!:Material
  private geometry!:EarbudGeometry
  private body!:SceneObject
  private mini!:SceneObject
  private parts!:ReturnType<EarbudView["makeEarbud"]>
  private callouts:SceneObject[][]=[]
  private pressurePoint!:SceneObject
  private traces:((sample:(x:number)=>number)=>void)[]=[]
  private model:EarbudSignalModel|null=null
  private revealStep=0
  private reward=false
  private separation=[0,0,0]
  private level=0
  onAnc:()=>void=()=>{}
  private replayFrame:ReplayFrame<EarbudSignalModel>|null=null
  private pressureFocus!:SceneObject
  private driverFocus!:SceneObject

  onAwake():void {
    this.createEvent("OnStartEvent").bind(()=>this.build())
    this.createEvent("UpdateEvent").bind(()=>this.update())
  }

  private build():void {
    this.geometry=new EarbudGeometry(this.material,this.traceMaterial)
    this.body=this.geometry.node(this.sceneObject,"Earbud teaching assembly",new vec3(0,-.4,0))
    this.body.getTransform().setLocalScale(new vec3(1.22,1.22,1.22))
    this.parts=this.makeEarbud(this.body)
    const target=this.geometry.node(this.body,"Earbud ANC target",new vec3(-1.9,.3,1.04))
    const collider=target.createComponent("Physics.ColliderComponent") as ColliderComponent
    collider.fitVisual=false
    const shape=Shape.createBoxShape()
    shape.size=new vec3(1.65,2.2,1.35);collider.shape=shape
    const hit=target.createComponent(Interactable.getTypeName()) as Interactable
    hit.targetingMode=TargetingMode.Direct|TargetingMode.Indirect
    let pinched=false
    hit.onTriggerStart.add(()=>pinched=true)
    const toggle=()=>{
      if(!pinched)return
      pinched=false
      this.onAnc()
    }
    hit.onTriggerEnd.add(toggle)
    hit.onTriggerCanceled.add(toggle)
    const cue=this.label(target,"ANC",-1.5,.85)
    cue.enabled=false
    hit.onHoverEnter.add(()=>cue.enabled=true)
    hit.onHoverExit.add(()=>cue.enabled=false)
    const {tipRoot,shell,board,driver,battery}=this.parts
    this.callouts=[
      [this.label(tipRoot,"Silicone tip",-.35,1.7),this.label(this.parts.mesh,"Acoustic mesh",.3,-1.5)],
      [this.label(shell,"Housing",1,1.7),this.label(this.parts.microphone,"Outside mic",2.2,-1.35)],
      [this.label(board,"Processor",0,1.6),this.label(driver,"Speaker driver",1,-1.5),this.label(battery,"Battery",.1,-1.55)]
    ]
    for(const group of this.callouts)for(const label of group)label.enabled=false
    this.pressurePoint=this.geometry.oval(this.sceneObject,"Virtual ear pressure point",new vec3(5.2,3,0.5),new vec3(.2,.2,.2),new vec4(.35,1,.7,1))
    this.geometry.ring(this.sceneObject,"Virtual ear marker",new vec3(5.2,3,0.5),.62,.045,new vec4(.35,1,.7,1))
    this.pressureFocus=inspectionOutline(this.sceneObject,this.traceMaterial,earbudAccent,5.2,3,.65,1.8,1.8)
    this.driverFocus=inspectionOutline(this.parts.driver,this.traceMaterial,earbudAccent,0,0,.4,2,2)
    const traces=this.geometry.node(this.sceneObject,"Pressure traces")
    for(const [i,color] of [new vec4(.2,.8,1,1),new vec4(1,.65,.25,1),new vec4(.95,1,1,1)].entries()){
      this.geometry.oval(traces,"Pressure baseline",new vec3(0,-4.5-i*2.3,1.9),new vec3(6,.012,.012),new vec4(.3,.4,.45,1))
      this.traces.push(this.geometry.trace(traces,"Earbud pressure "+i,-4.5-i*2.3,color))
    }
    this.mini=this.geometry.node(this.sceneObject,"Things Understood Earbud",new vec3(0,3,0))
    this.mini.getTransform().setLocalScale(new vec3(.4,.4,.4))
    this.makeEarbud(this.mini)
    this.mini.enabled=false
    if(this.model)this.present(this.model,this.revealStep,this.reward)
    print("Earbud procedural body and three linked pressure traces ready")
  }

  private makeEarbud(root:SceneObject) {
    const g=this.geometry,housing=finishes.petrol,dark=new vec4(.12,.22,.3,1),copper=finishes.amber
    g.oval(root,"Earbud back shell",new vec3(-1,3,-.7),new vec3(2.2,1.75,.8),new vec4(.3,.45,.55,1))
    g.stem(root,"Earbud stem",new vec3(-1.9,.25,.3),.57,5.1,housing)
    const battery=g.node(root,"Battery assembly",new vec3(-1.3,2.5,.65))
    const board=g.node(root,"Circuit board assembly",new vec3(-.8,3.85,1.25))
    const driver=g.node(root,"Driver assembly",new vec3(0,2.7,.9))
    g.oval(battery,"Battery",vec3.zero(),new vec3(1.05,1.05,.35),new vec4(.65,.73,.8,1))
    g.housing(board,"Processor board",vec3.zero(),new vec4(.035,.32,.21,1)).getTransform().setLocalScale(new vec3(.5,.32,.12))
    g.housing(board,"ANC processor",new vec3(0,0,.22),dark).getTransform().setLocalScale(new vec3(.23,.18,.09))
    for(let i=0;i<5;i++)g.oval(board,"Chip contact",new vec3(-.8+i*.4,-.48,.23),new vec3(.06,.13,.035),copper)
    g.oval(driver,"Speaker driver",vec3.zero(),new vec3(.8,.8,.24),dark)
    for(const radius of [.45,.6,.74])g.ring(driver,"Speaker coil",new vec3(0,0,.29),radius,.045,copper)
    g.oval(root,"Nozzle",new vec3(1.5,3.2,.5),new vec3(1.1,.7,.7),housing)
    const tipRoot=g.node(root,"Tip assembly",new vec3(2.45,3.3,.85))
    const mesh=g.node(root,"Mesh assembly",new vec3(2.12,3.23,.73))
    const grille=g.oval(mesh,"Acoustic mesh",vec3.zero(),new vec3(.52,.52,.07),new vec4(.66,.74,.78,1))
    grille.getTransform().setLocalRotation(quat.fromEulerAngles(0,1.05,.12))
    const tip=g.ring(tipRoot,"Silicone ear tip",vec3.zero(),.7,.3,new vec4(.06,.21,.25,1))
    tip.getTransform().setLocalRotation(quat.fromEulerAngles(0,1.05,.12))
    const shell=g.housing(root,"Earbud removable shell",new vec3(-1,3,1.2),housing)
    const seam=g.housing(shell,"Housing seam",new vec3(0,0,-.19),new vec4(.055,.16,.16,1))
    seam.getTransform().setLocalScale(new vec3(1.01,1.01,.86))
    const microphone=g.node(shell,"Outside microphone",new vec3(-1.1,.2,.91))
    g.oval(microphone,"External microphone grille",vec3.zero(),new vec3(.23,.58,.055),dark)
    shell.getTransform().setLocalRotation(quat.fromEulerAngles(0,0,.22))
    g.oval(root,"Stem pressure control",new vec3(-1.9,.3,.89),new vec3(.17,.52,.035),finishes.mint,true)
    g.ring(root,"Stem metal contact",new vec3(-1.9,-1.8,.3),.48,.08,new vec4(.85,.5,.27,1)).getTransform().setLocalRotation(quat.fromEulerAngles(Math.PI/2,0,0))
    g.oval(root,"Stem microphone",new vec3(-1.9,-1.85,.8),new vec3(.24,.075,.035),dark)
    return {shell,tip,tipRoot,mesh,board,driver,battery,microphone}
  }

  private label(parent:SceneObject,value:string,x:number,y:number):SceneObject {
    const label=this.geometry.node(parent,value+" callout",new vec3(x,y,1.6))
    const text=label.createComponent("Component.Text") as Text
    text.text=value
    styleText(text,"part",earbudAccent)
    const line=this.geometry.oval(label,"Leader",new vec3(-x/2,-y/2,-.3),
      new vec3(Math.sqrt(x*x+y*y)/2,.028,.028),new vec4(.7,.96,1,1))
    line.getTransform().setLocalRotation(quat.fromEulerAngles(0,0,Math.atan2(y,x)))
    return label
  }

  public present(model:EarbudSignalModel,revealStep:number,reward:boolean):void {
    this.model=model;this.revealStep=revealStep;this.reward=reward;this.level=model.levels().ratio
    if(!this.body)return
    this.body.enabled=!reward;this.mini.enabled=reward
    this.parts.tip.getTransform().setLocalScale(new vec3(.8+.2*model.fit,1,1))
    if(model.elapsed===0&&revealStep===0)this.separation.fill(0)
    for(let i=0;i<this.callouts.length;i++)for(const label of this.callouts[i])label.enabled=i+1===revealStep&&!reward
  }

  public setReplayFrame(frame:ReplayFrame<EarbudSignalModel>|null):void {
    this.replayFrame=frame
    if(this.pressureFocus)this.pressureFocus.enabled=!!frame
    if(this.driverFocus)this.driverFocus.enabled=!!frame&&this.revealStep>=2
  }

  private ease(value:number):number {return value*value*(3-2*value)}

  private update():void {
    if(!this.model||!this.body)return
    if(!this.model.paused){
      const step=Math.min(getDeltaTime(),.05)/.65
      for(let i=0;i<this.separation.length;i++){
        const value=this.separation[i],target=this.revealStep>i?1:0
        this.separation[i]=value+Math.sign(target-value)*Math.min(step,Math.abs(target-value))
      }
    }
    const t=this.ease(this.separation[0]),s=this.ease(this.separation[1]),p=this.ease(this.separation[2])
    const {tipRoot,mesh,shell,board,driver,battery}=this.parts
    tipRoot.getTransform().setLocalPosition(new vec3(2.45+2.7*t,3.3+.55*t,.85+.6*t))
    mesh.getTransform().setLocalPosition(new vec3(2.12+1.25*t,3.23,.73+.3*t))
    shell.getTransform().setLocalPosition(new vec3(-1-1.85*s,3+3*s,1.2+1.3*s))
    shell.getTransform().setLocalRotation(quat.fromEulerAngles(0,-.23*s,.22-.2*s))
    board.getTransform().setLocalPosition(new vec3(-.8+1.15*p,3.85+2.85*p,1.25+.65*p))
    driver.getTransform().setLocalPosition(new vec3(2.3*p,2.7-1.5*p,.9+.7*p))
    battery.getTransform().setLocalPosition(new vec3(-1.3-2.5*p,2.5-1.5*p,.65+.5*p))
    const frame=this.replayFrame
    const signal=frame?(frame.progress<.5?frame.from:frame.to):this.model
    const time=(signal.elapsed+(frame?frame.progress*.25:0))/240
    for(let channel=0;channel<3;channel++)this.traces[channel](x=>{
      const sample=signal.sample(time+x/60)
      return channel===0?sample.passive:channel===1?sample.anti:sample.residual
    })
    const pulse=.18+this.level*.15+.02*Math.sin(this.model.elapsed*3)
    this.pressurePoint.getTransform().setLocalScale(new vec3(pulse,pulse,pulse))
  }
}
