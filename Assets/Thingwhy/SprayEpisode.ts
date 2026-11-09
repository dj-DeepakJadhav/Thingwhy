import {ActionReplay,ReplayFrame} from "./ActionReplay"
import {ReplayControl} from "./ReplayControl"
import {SprayMechanism} from "./SprayMechanism"
import {SprayView} from "./SprayView"
import {styleText,TextRole,utility,sprayAccent} from "./ThingwhyStyle"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"

type Stage="Use"|"Predict"|"Investigate"|"Fix"|"Prove"|"Complete"
type Action="pump"|"a"|"b"|"replay"|"hint"|"pause"|"reset"|"recenter"|"tools"
type Flow="spray"|"refill"|"none"
const opening="Pinch the trigger, then let go. When does the pump refill?"

export class SprayEpisode {
  readonly pump=new SprayMechanism()
  readonly miniature=new SprayMechanism()
  readonly replay=new ActionReplay<boolean>()
  stage:Stage="Use"
  paused=false
  reveal=0
  rewardCount=0
  private prediction:boolean|null=null
  private inspected=0
  private observedRefill=false
  private primedAfterRepair=false
  private message=opening
  private toolsOpen=false
  private flow:Flow="none"
  private flowClock=0
  private cycleSprayed=false
  private frame:ReplayFrame<boolean>|null=null
  private readonly view:SprayView
  private readonly reward:SprayView
  private readonly title:Text
  private readonly instruction:Text
  private readonly status:Text
  private readonly controls:Record<Action,Text>
  private readonly replayControl:ReplayControl

  constructor(readonly root:SceneObject,private readonly camera:SceneObject,material:Material,unlit:Material){
    this.view=new SprayView(this.node(root,"Spray teaching model",new vec3(-7.25,1.7,0)),material,unlit)
    this.view.root.getTransform().setLocalScale(new vec3(1.16,1.16,1.16))
    this.reward=new SprayView(this.node(root,"Spray miniature",new vec3(-7,1,0)),material,unlit)
    this.reward.root.getTransform().setLocalScale(new vec3(.52,.52,.52))
    this.wireTrigger(this.view.root)
    this.wireTrigger(this.reward.root)
    const panel=this.node(root,"Spray lesson controls",new vec3(6.9,0,0))
    panel.createComponent("Component.Canvas")
    this.title=this.text(panel,"Spray stage",new vec3(0,8.15,.7),15,"title")
    this.instruction=this.text(panel,"Spray explanation",new vec3(0,5.3,.7),14.5,"body")
    this.status=this.text(panel,"Spray status",new vec3(0,2.75,.7),14.5,"caption")
    this.controls={
      pump:this.button(panel,"pump",0,.7,14.2),
      a:this.button(panel,"a",-3.7,-1.65,7.05),
      b:this.button(panel,"b",3.7,-1.65,7.05),
      replay:this.button(panel,"replay",-3.7,-4,7.05),
      hint:this.button(panel,"hint",3.7,-4,7.05,utility.hint),
      pause:this.button(panel,"pause",-3.7,-6.35,7.05),
      reset:this.button(panel,"reset",3.7,-6.35,7.05,utility.reset),
      recenter:this.button(panel,"recenter",0,-8.6,7.05,utility.recenter),
      tools:this.button(panel,"tools",0,-5.35,7.05,"Tools")
    }
    this.replayControl=new ReplayControl(this.controls.replay,unlit)
    this.recenter()
    this.render()
  }

  setPaused(value:boolean):void {this.paused=value;this.render()}

  update(dt:number):void {
    if(!this.root.enabled||this.paused)return
    if(this.replay.active){
      this.frame=this.replay.tick(dt)
      this.render()
    }else if(this.flow!=="none"){
      this.flowClock+=dt
      if(this.flowClock>=.66)this.flow="none"
      this.render()
    }
  }

  act(action:Action):void {
    if(action==="tools"){this.toolsOpen=!this.toolsOpen;this.render();return}
    if(action==="pause"){this.setPaused(!this.paused);return}
    if(action==="reset"){this.reset();return}
    if(action==="recenter"){this.recenter();return}
    if(this.paused)return
    if(action==="replay"){
      if(this.stage!=="Investigate")return
      if(this.replay.active){this.replay.stop();this.frame=null}
      else if(this.replay.start())this.message="Follow the liquid out, then up the tube."
      else this.message="Squeeze and release once to capture the cycle."
      this.render();return
    }
    if(this.replay.active)return
    if(action==="pump")this.stroke()
    else if(action==="hint"){
      this.message={
        Use:opening,
        Predict:"Think about when the piston makes room for more liquid.",
        Investigate:"Reveal both views. Squeeze and release with the inlet visible.",
        Fix:"Clear the red obstruction, then squeeze and release to prime.",
        Prove:"Spray from the primed chamber to prove the repair.",
        Complete:"Squeeze and release to try the miniature."
      }[this.stage]
    }else if(this.stage==="Predict"){
      this.prediction=action==="b"
      this.message="Prediction saved. Squeeze and release to test it."
    }else if(this.stage==="Investigate"){
      if(action==="a"){
        this.reveal=(this.reveal+1)%3
        if(this.reveal>0)this.inspected|=1<<(this.reveal-1)
        this.message=["Open the cover to see the pump.","Squeeze pushes the piston in and sends liquid to the nozzle.","Release opens the inlet and draws liquid up the dip tube."][this.reveal]
      }else if(this.inspected===3&&this.observedRefill&&!this.pump.pressed){
        this.stage="Fix";this.reveal=2;this.pump.beginRepair();this.flow="none"
        this.message="The red obstruction blocks the inlet. Clear it, then prime the chamber."
      }else this.message="Inspect both views, then squeeze and release with the inlet visible."
    }else if(this.stage==="Fix"&&action==="a"){
      this.pump.clearInlet()
      this.message="Inlet cleared. Squeeze the dry chamber and release to prime it."
    }
    this.render()
  }

  private stroke():void {
    const active=this.stage==="Complete"?this.miniature:this.pump
    if(this.stage==="Predict"&&this.prediction===null){
      this.message="Choose Squeeze or Release first."
      return
    }
    if(!active.pressed){
      this.cycleSprayed=active.squeeze()
      this.setFlow(this.cycleSprayed?"spray":"none")
      return
    }
    const refilled=active.release()
    this.setFlow(refilled?"refill":"none")
    if(this.stage==="Use"){
      this.stage="Predict"
      this.message="When does liquid refill the chamber?"
    }else if(this.stage==="Predict"){
      if(this.prediction){
        this.stage="Investigate";this.message="Correct. Open the cutaway to watch the pump."
      }else{
        this.prediction=null
        this.message="Squeeze pushes liquid out. Predict when the chamber fills again."
      }
    }else if(this.stage==="Investigate"){
      this.replay.remember(this.cycleSprayed,refilled)
      if(this.reveal===2&&refilled)this.observedRefill=true
    }else if(this.stage==="Prove"&&this.cycleSprayed&&this.primedAfterRepair){
      this.stage="Complete";this.rewardCount=1;this.reveal=0;this.flow="none"
      this.message="The nozzle sprayed. Try the working miniature."
    }else if(this.stage==="Fix"){
      if(refilled){
        this.primedAfterRepair=true;this.stage="Prove";this.message="The chamber is primed. Squeeze to prove it sprays."
      }else this.message="The inlet is blocked. Clear the obstruction before priming."
    }
  }

  private setFlow(flow:Flow):void {this.flow=flow;this.flowClock=0}

  private reset():void {
    this.pump.reset();this.miniature.reset();this.replay.clear();this.frame=null
    this.stage="Use";this.paused=false;this.reveal=0;this.rewardCount=0;this.prediction=null
    this.inspected=0;this.observedRefill=false;this.primedAfterRepair=false;this.cycleSprayed=false
    this.setFlow("none");this.message=opening;this.render()
  }

  private render():void {
    const done=this.stage==="Complete",view=done?this.reward:this.view
    const active=done?this.miniature:this.pump
    this.view.root.enabled=!done;this.reward.root.enabled=done
    const frame=this.frame,compressing=frame?frame.progress<.48:active.pressed
    const flow=frame?(compressing?(frame.from?"spray":"none"):(frame.to?"refill":"none")):this.flow
    view.show(compressing,frame?!compressing&&frame.to:active.primed,active.blocked,frame?2:this.reveal,flow,frame?frame.progress*1.6:this.flowClock*2,!!frame)
    this.title.text="Spray bottle / "+this.stage
    this.instruction.text=this.paused?"Paused. Resume to continue.":this.message
    this.status.text=frame?(frame.holding?"Held · chamber refilled":compressing?"Replay · discharge":"Replay · refill")
      :active.blocked?"Inlet blocked":active.primed?"Chamber primed":active.pressed?"Trigger squeezed":"Chamber dry"
    this.controls.pump.text=active.pressed?"Release":"Squeeze"
    const choices:Partial<Record<Stage,[string,string]>>={
      Predict:["Squeeze","Release"],
      Investigate:[["Cutaway","Next: inlet","Close cutaway"][this.reveal],"Continue"],
      Fix:["Clear inlet",""]
    }
    const choice=choices[this.stage]
    for(const [i,key] of (["a","b"] as const).entries()){
      const label=choice?.[i]??""
      this.controls[key].getSceneObject().getParent().enabled=label!==""
      this.controls[key].text=label
    }
    this.controls.replay.getSceneObject().getParent().enabled=this.stage==="Investigate"
    this.replayControl.present(this.replay.active)
    this.controls.pause.text=this.paused?utility.resume:utility.pause
    this.controls.tools.text=this.toolsOpen?"Close tools":"Tools"
    const tools=this.controls.tools.getSceneObject().getParent().getTransform()
    tools.setLocalPosition(new vec3(0,this.toolsOpen?-10.55:-6.35,.6))
    for(const key of ["hint","pause","reset","recenter"] as const)
      this.controls[key].getSceneObject().getParent().enabled=this.toolsOpen
  }

  private wireTrigger(parent:SceneObject):void {
    const target=this.node(parent,"Spray physical trigger",new vec3(-2,1.05,1.05))
    const collider=target.createComponent("Physics.ColliderComponent") as ColliderComponent
    collider.fitVisual=false
    const shape=Shape.createBoxShape()
    shape.size=new vec3(1.1,2.5,.75)
    collider.shape=shape
    const interactable=target.createComponent(Interactable.getTypeName()) as Interactable
    interactable.targetingMode=TargetingMode.Direct|TargetingMode.Indirect
    let held=false
    interactable.onTriggerStart.add(()=>{
      const active=this.stage==="Complete"?this.miniature:this.pump
      if(active.pressed)return
      this.act("pump")
      held=(this.stage==="Complete"?this.miniature:this.pump).pressed
    })
    const release=()=>{
      if(!held)return
      held=false
      if((this.stage==="Complete"?this.miniature:this.pump).pressed)this.act("pump")
    }
    interactable.onTriggerEnd.add(release)
    interactable.onTriggerCanceled.add(release)
  }

  private recenter():void {
    const camera=this.camera.getTransform()
    const forward=camera.getWorldRotation().multiplyVec3(new vec3(0,0,-1))
    const flat=new vec3(forward.x,0,forward.z),direction=flat.length>.001?flat.normalize():new vec3(0,0,-1)
    const transform=this.root.getTransform()
    transform.setWorldPosition(camera.getWorldPosition().add(direction.uniformScale(55)).add(new vec3(0,-3,0)))
    transform.setWorldRotation(quat.lookAt(direction.uniformScale(-1),vec3.up()))
  }

  private button(parent:SceneObject,key:Action,x:number,y:number,width:number,value=key as string):Text {
    const object=this.node(parent,"Spray "+key,new vec3(x,y,.6))
    const button=object.createComponent(Button.getTypeName()) as Button
    button.size=new vec3(width,2,.5);button.colliderFitElement=false;button.colliderSize=button.size
    button.setVariant({theme:"SnapOS2",shape:"Rectangle",style:key==="pump"?"Primary":"Secondary"})
    button.onInitialized.add(()=>{button.interactable.targetingMode=TargetingMode.Direct|TargetingMode.Indirect})
    if(key==="a"||key==="b"||key==="tools")button.onTriggerUp.add(()=>this.act(key))
    else button.onTriggerDown.add(()=>this.act(key))
    return this.text(object,"Spray "+key+" label",new vec3(0,0,.3),width-.3,"button",value)
  }

  private text(parent:SceneObject,name:string,position:vec3,width:number,role:TextRole,value=""):Text {
    const text=this.node(parent,name,position).createComponent("Component.Text") as Text
    text.text=value;styleText(text,role,role==="title"?sprayAccent:undefined)
    text.horizontalAlignment=HorizontalAlignment.Center;text.verticalAlignment=VerticalAlignment.Center
    text.layoutRect=Rect.create(-width/2,width/2,-1.5,1.5)
    text.horizontalOverflow=HorizontalOverflow.Wrap
    return text
  }

  private node(parent:SceneObject,name:string,position:vec3):SceneObject {
    const object=global.scene.createSceneObject(name)
    object.setParent(parent);object.getTransform().setLocalPosition(position)
    return object
  }
}
