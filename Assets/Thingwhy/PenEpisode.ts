import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {ReplayControl} from "./ReplayControl"
import {ActionReplay,ReplayFrame} from "./ActionReplay"
import {TextRole,styleText,penAccent,utility} from "./ThingwhyStyle"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {PenMechanism} from "./PenMechanism"
import {PenPose,PenView} from "./PenView"

type Stage="Use"|"Predict"|"Investigate"|"Fix"|"Prove"|"Complete"
type Action="click"|"a"|"b"|"hint"|"pause"|"reset"|"recenter"|"replay"|"tools"

export class PenEpisode {
  readonly model=new PenMechanism()
  readonly miniature=new PenMechanism()
  readonly replay=new ActionReplay<PenPose>()
  private beforeClick:PenPose|null=null
  private playbackFrame:ReplayFrame<PenPose>|null=null
  stage:Stage="Use"
  paused=false
  reveal=0
  rewardCount=0
  private toolsOpen=false
  private readonly backdrop:SceneObject
  private pressTime=0
  private clicks=0
  private predicted:boolean|null=null
  private inspected=0
  private sawCamTurn=false
  private provedExtension=false
  private message="Pinch the cap twice. Watch the tip."
  private readonly view:PenView
  private readonly reward:PenView
  private readonly title:Text
  private readonly instruction:Text
  private readonly status:Text
  private readonly buttons:Record<Action,Text>
  private readonly replayControl:ReplayControl

  constructor(readonly root:SceneObject,private camera:SceneObject,material:Material,trace:Material) {
    this.view=new PenView(this.node(root,"Pen teaching model",new vec3(0,6,0)),material,trace)
    this.wireCap(this.view.root)
    this.reward=new PenView(this.node(root,"Pen miniature",new vec3(0,6,0)),material,trace)
    this.reward.root.getTransform().setLocalScale(new vec3(.46,.46,.46))
    const panel=this.node(root,"Pen controls",new vec3(0,-3,0))
    panel.createComponent("Component.Canvas")
    this.backdrop=this.node(panel,"Pen utility backdrop",vec3.zero())
    const plate=this.backdrop.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size=new vec2(22,14)
    plate.onInitialized.add(()=>{plate.interactable.targetingMode=TargetingMode.None})
    this.title=this.text(panel,"Pen stage",new vec3(0,5.5,.7),20,"title")
    this.instruction=this.text(panel,"Pen explanation",new vec3(0,3.6,.7),20,"body")
    this.status=this.text(panel,"Pen status",new vec3(0,1.5,.7),20,"caption")
    this.buttons={
      click:this.button(panel,"click",-4.6,-.45,8.8),
      replay:this.button(panel,"replay",4.6,-.45,8.8),
      a:this.button(panel,"a",-4.6,-2.45,8.8),
      b:this.button(panel,"b",4.6,-2.45,8.8),
      hint:this.button(panel,"hint",-6.15,-4.45,5.9),
      pause:this.button(panel,"pause",0,-4.45,5.9),
      reset:this.button(panel,"reset",6.15,-4.45,5.9),
      recenter:this.button(panel,"recenter",0,-6.2,8),
      tools:this.button(panel,"tools",0,-2.5,8)
    }
    this.replayControl=new ReplayControl(this.buttons.replay,trace)
    this.recenter()
    this.render(0)
  }

  setPaused(value:boolean):void {this.paused=value;this.render(0)}

  update(dt:number):void {
    if(!this.root.enabled||this.paused)return
    if(this.replay.active){
      this.playbackFrame=this.replay.tick(dt)
      this.render(dt)
      return
    }
    if(this.pressTime>0){
      this.pressTime-=dt
      if(this.pressTime<=0)this.finishClick()
    }
    this.render(dt)
  }

  act(action:Action):void {
    if(action==="tools"){this.toolsOpen=!this.toolsOpen;this.render(0);return}
    if(action==="pause"){this.setPaused(!this.paused);return}
    if(action==="reset"){this.reset();return}
    if(action==="recenter"){this.recenter();return}
    if(this.paused||this.pressTime>0)return
    if(action==="replay"){
      if(this.stage!=="Investigate")return
      if(this.replay.active){this.replay.stop();this.playbackFrame=null}
      else if(this.replay.start()){
        this.message="Watch the cam turn, then hold at the next stop."
      }else this.message="Click the pen first to capture its motion."
      this.render(0)
      return
    }
    if(this.replay.active)return
    if(action==="click"){
      if(this.stage==="Predict"&&this.predicted===null)this.message="Predict where the tip will land, then click to test it."
      else if(this.stage==="Fix")this.message="Align the cam with the guide before you click."
      else {
        const active=this.stage==="Complete"?this.miniature:this.model
        const before=this.stage==="Investigate"?this.pose():null
        if(active.press()){this.pressTime=.24;this.beforeClick=before}
      }
    }else if(action==="hint"){
      this.message={
        Use:"Click twice and watch the tip alternate.",
        Predict:"The cam is at its deep stop. What will happen at the next stop?",
        Investigate:"Step through all three views and click while the rotary cam is exposed.",
        Fix:"Rotate the loose cam to line up its lug, then Seat cam.",
        Prove:"Click once to extend the tip, then again to retract it.",
        Complete:"Click the miniature or reset the episode."
      }[this.stage]
    }else if(this.stage==="Predict"){
      this.predicted=action==="a"
      this.message="Prediction recorded. Click to test it."
    }else if(this.stage==="Investigate"){
      if(action==="a"){
        this.reveal=(this.reveal+1)%4
        if(this.reveal>0)this.inspected|=1<<(this.reveal-1)
        this.message=[
          "Click Cutaway to expose the mechanism.",
          "The push button drives the mechanism forward. The barrel guides it.",
          "The cam turns one step per click. A shallow stop holds the tip out.",
          "At a deeper groove, the spring can pull the refill farther back."
        ][this.reveal]
      }else if(this.inspected===7&&this.sawCamTurn){
        this.stage="Fix";this.reveal=2;this.model.beginAssembly()
        this.message="The teaching cam is out of alignment. Rotate it, then seat it."
      }else this.message="Open all three views and click with the cam exposed before continuing."
    }else if(this.stage==="Fix"){
      if(action==="a"){
        this.model.rotateLooseCam()
        this.message=this.model.camAligned?"The lug lines up with the guide. Try seating the cam.":"The lug is turned away from its guide."
      }else if(this.model.trySeatCam()){
        this.stage="Prove";this.reveal=0
        this.message="Cam seated. Extend and retract the tip to prove the fix."
      }else this.message="The lug hits the guide. Rotate the cam, then try again."
    }
    this.render(0)
  }

  private finishClick():void {
    if(this.stage==="Complete"){this.miniature.release();return}
    this.model.release()
    if(this.beforeClick)this.replay.remember(this.beforeClick,this.pose())
    this.beforeClick=null
    if(this.stage==="Use"&&++this.clicks===2){
      this.stage="Predict";this.message="The tip is in. Where will it land on the next click?"
    }else if(this.stage==="Predict"){
      if(this.predicted===this.model.extended){
        this.stage="Investigate";this.message="You found the next stop. Open the cutaway to see how it works."
      }else{
        this.predicted=null
        this.message=this.model.extended?"The tip moved out. Predict the next click.":"The tip moved in. Predict the next click."
      }
    }else if(this.stage==="Investigate"&&this.reveal===2)this.sawCamTurn=true
    else if(this.stage==="Prove"){
      if(this.model.extended){
        this.provedExtension=true;this.message="Extended stop holds. Click again to test spring return."
      }else if(this.provedExtension){
        this.stage="Complete";this.rewardCount=1
        this.message="The tip returned. Your working miniature is unlocked."
      }
    }
  }

  private pose():PenPose {
    const {camIndex,pressed,assembled,camAligned,refillTravel}=this.model
    return {camIndex,pressed,assembled,camAligned,refillTravel}
  }

  private reset():void {
    this.replay.clear();this.beforeClick=null;this.playbackFrame=null
    this.model.reset();this.miniature.reset();this.stage="Use";this.paused=false;this.reveal=0;this.rewardCount=0
    this.toolsOpen=false
    this.pressTime=0;this.clicks=0;this.predicted=null;this.inspected=0;this.sawCamTurn=false;this.provedExtension=false
    this.message="Pinch the cap twice. Watch the tip."
    this.render(0)
  }

  private render(dt:number):void {
    const done=this.stage==="Complete"
    this.view.root.enabled=!done;this.reward.root.enabled=done
    if(done)this.reward.present(this.miniature,0,dt)
    else {
      const frame=this.playbackFrame
      const pose=frame?(frame.progress<.34?{...frame.from,pressed:true,refillTravel:1.3}:frame.to):this.model
      this.view.present(pose,frame?2:this.reveal,dt,!!frame)
    }
    this.title.text="Retractable pen / "+this.stage
    this.instruction.text=this.paused?"Paused. Resume to continue.":this.message
    const active=done?this.miniature:this.model
    const frame=this.playbackFrame
    if(frame){
      const stop=frame.to.refillTravel>0?"Shallow stop · tip out":"Deep groove · tip in"
      this.status.text=frame.holding?"Held · "+stop:frame.progress<.34?"Replay · button pressed":"Replay · "+stop
    }else this.status.text=active.assembled?(active.extended?"Tip extended · shallow stop":"Tip retracted · deep groove"):"Cam unseated"
    const choices:Partial<Record<Stage,[string,string]>>={
      Predict:["Tip out","Tip in"],
      Investigate:[["Cutaway","Next: cam","Next: spring","Close cutaway"][this.reveal],"Continue"],
      Fix:["Rotate cam","Seat cam"]
    }
    const choice=choices[this.stage]
    for(const [index,key] of (["a","b"] as const).entries()){
      this.buttons[key].getSceneObject().getParent().enabled=!!choice
      if(choice)this.buttons[key].text=choice[index]
    }
    const objectFirst=this.stage==="Use"||this.stage==="Prove"
    this.backdrop.enabled=this.toolsOpen||!objectFirst
    this.buttons.click.getSceneObject().getParent().enabled=!objectFirst
    this.buttons.tools.getSceneObject().getParent().enabled=objectFirst
    this.buttons.tools.text=this.toolsOpen?"Close tools":"Tools"
    for(const key of ["hint","pause","reset","recenter"] as const)
      this.buttons[key].getSceneObject().getParent().enabled=!objectFirst||this.toolsOpen
    this.buttons.click.text=done?"Click miniature":"Click pen"
    this.buttons.replay.getSceneObject().getParent().enabled=this.stage==="Investigate"
    this.replayControl.present(this.replay.active)
    this.buttons.pause.text=this.paused?utility.resume:utility.pause
  }

  private wireCap(parent:SceneObject):void {
    const target=this.node(parent,"Pen cap target",new vec3(-8.4,0,.45))
    const collider=target.createComponent("Physics.ColliderComponent") as ColliderComponent
    collider.fitVisual=false
    const shape=Shape.createBoxShape()
    shape.size=new vec3(2.8,1.75,1.7)
    collider.shape=shape
    const hit=target.createComponent(Interactable.getTypeName()) as Interactable
    hit.targetingMode=TargetingMode.Direct|TargetingMode.Indirect
    const marker=this.text(target,"Cap targeting cue",new vec3(0,1.45,1),3.5,"button","Click")
    marker.getSceneObject().enabled=false
    hit.onHoverEnter.add(()=>marker.getSceneObject().enabled=true)
    hit.onHoverExit.add(()=>marker.getSceneObject().enabled=false)
    let pinched=false
    hit.onTriggerStart.add(()=>pinched=true)
    const click=()=>{
      if(!pinched)return
      pinched=false
      this.act("click")
    }
    hit.onTriggerEnd.add(click)
    hit.onTriggerCanceled.add(click)
  }

  private recenter():void {
    const camera=this.camera.getTransform()
    const forward=camera.getWorldRotation().multiplyVec3(new vec3(0,0,-1))
    const flat=new vec3(forward.x,0,forward.z)
    const direction=flat.length>.001?flat.normalize():new vec3(0,0,-1)
    const transform=this.root.getTransform()
    transform.setWorldPosition(camera.getWorldPosition().add(direction.uniformScale(55)).add(new vec3(0,-3,0)))
    transform.setWorldRotation(quat.lookAt(direction.uniformScale(-1),vec3.up()))
  }

  private button(parent:SceneObject,key:Action,x:number,y:number,width:number):Text {
    const object=this.node(parent,"Pen "+key,new vec3(x,y,.58))
    const button=object.createComponent(Button.getTypeName()) as Button
    button.size=new vec3(width,1.65,.5);button.colliderFitElement=false;button.colliderSize=button.size
    button.setVariant({theme:"SnapOS2",shape:"Rectangle",style:key==="click"?"Primary":"Secondary"})
    button.onInitialized.add(()=>{button.interactable.targetingMode=TargetingMode.Direct|TargetingMode.Indirect})
    // Choice buttons may hide as a result of their own action. Let the pinch
    // release complete before changing the visible controls.
    if(key==="a"||key==="b"||key==="reset")button.onTriggerUp.add(()=>this.act(key))
    else button.onTriggerDown.add(()=>this.act(key))
    return this.text(object,"Pen "+key+" label",new vec3(0,0,.3),width-.3,"button",key==="hint"?utility.hint:key==="reset"?utility.reset:key==="recenter"?utility.recenter:key)
  }

  private text(parent:SceneObject,name:string,position:vec3,width:number,role:TextRole,value=""):Text {
    const object=this.node(parent,name,position)
    const text=object.createComponent("Component.Text") as Text
    text.text=value;styleText(text,role,role==="title"?penAccent:undefined)
    text.horizontalAlignment=HorizontalAlignment.Center;text.verticalAlignment=VerticalAlignment.Center
    text.layoutRect=Rect.create(-width/2,width/2,-1.2,1.2)
    text.horizontalOverflow=HorizontalOverflow.Wrap
    return text
  }

  private node(parent:SceneObject,name:string,position:vec3):SceneObject {
    const object=global.scene.createSceneObject(name)
    object.setParent(parent);object.getTransform().setLocalPosition(position)
    return object
  }
}
