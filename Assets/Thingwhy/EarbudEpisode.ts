import {ActionReplay} from "./ActionReplay"
import {EarbudSignalModel} from "./EarbudSignalModel"
import {EarbudView} from "./EarbudView"
import {EarbudUI,EarbudAction} from "./EarbudUI"

export type EarbudStage="Use"|"Predict"|"Investigate"|"Fix"|"Prove"|"Complete"

@component
export class EarbudEpisode extends BaseScriptComponent {
  @input view!:EarbudView
  @input ui!:EarbudUI
  @input experienceRoot!:SceneObject
  @input cameraObject!:SceneObject
  public model=new EarbudSignalModel()
  readonly replay=new ActionReplay<EarbudSignalModel>()
  private replayStatus=-1
  public stage:EarbudStage="Use"
  public cutaway=false
  public revealStep=0
  public discovered=false
  public repaired=false
  public understood=false
  public rewardCount=0
  public hintCount=0
  public prediction:string|null=null
  public attempts=0
  private sawOn=false
  private sawOff=false
  private sawHum=false
  private sawChanging=false
  private proofOff=false
  private humProven=false
  private message="How can adding sound make it quieter?\nPinch the earbud stem to toggle ANC, then Continue."

  onAwake():void {
    this.createEvent("OnStartEvent").bind(()=>{
      if(!this.view||!this.ui||!this.experienceRoot||!this.cameraObject)throw new Error("Earbud episode inputs are required")
      this.view.onAnc=()=>this.act("anc")
      this.ui.onAction.add(action=>this.act(action));this.recenter();this.updateView()
      print("Thingwhy Earbuds ready: muted, seated, hands-first teaching model")
    })
    this.createEvent("UpdateEvent").bind(()=>{
      const dt=getDeltaTime()
      if(!this.replay.active){this.model.tick(dt);return}
      const frame=this.replay.tick(dt,this.model.paused)
      this.view.setReplayFrame(frame)
      if(!frame){this.updateView();return}
      const phase=frame.holding?2:frame.progress<.5?0:1
      if(this.replayStatus!==phase){
        this.replayStatus=phase
        const signal=phase===0?frame.from:frame.to
        this.ui.showReplayFrame(phase===0,frame.holding,signal.anc,signal.levels().ratio)
      }
    })
  }

  public setPaused(paused:boolean):void {this.model.paused=paused;this.updateView()}

  public act(action:EarbudAction):void {
    if(action==="pause"){this.setPaused(!this.model.paused);return}
    if(action==="reset"){this.reset();return}
    if(action==="recenter"){this.recenter();return}
    if(this.model.paused)return
    if(action==="replay"){
      if(this.stage!=="Investigate")return
      if(this.replay.active){this.replay.stop();this.view.setReplayFrame(null)}
      else if(this.replay.start())this.message="Watch the opposing trace change, then compare the residual."
      else this.message="Toggle ANC first to capture the comparison."
      this.updateView();return
    }
    if(this.replay.active)return
    if(action==="hint"){this.hintCount++;this.hint();this.updateView();return}
    if(action==="anc"||(action==="a"&&(this.stage==="Use"||this.stage==="Complete"))){
      const before=this.stage==="Investigate"?this.snapshotSignal():null
      this.model.anc=!this.model.anc
      if(before)this.replay.remember(before,this.snapshotSignal())
      if(this.stage==="Use"){if(this.model.anc)this.sawOn=true;else this.sawOff=true}
      if(this.stage==="Prove"&&this.model.source==="hum"){
        if(!this.model.anc)this.proofOff=true
        else if(this.proofOff&&this.model.fit===1)this.humProven=true
      }
      this.inspect();this.updateView();return
    }
    if(action==="noise"){
      if(this.stage==="Predict"&&!this.prediction){this.message="Make your prediction first, then test the changing sound.";this.updateView();return}
      this.model.source=this.model.source==="hum"?"changing":"hum"
      if(this.stage==="Predict"&&this.model.source==="changing"){
        if(this.prediction==="less"){
          this.stage="Investigate";this.message="Some sound remains. Open the shell and compare both sound patterns."
        }else{
          this.prediction=null;this.attempts++;this.model.source="hum"
          this.message="Changing sound was not removed as completely. Predict again, then test."
        }
      }
      this.inspect();this.updateView();return
    }
    if(action==="cutaway"||(action==="a"&&this.stage==="Investigate")){
      this.revealStep=(this.revealStep+1)%4
      this.cutaway=this.revealStep>0
      if(this.stage==="Investigate"){
        this.message=[
          "Open the cutaway to inspect the earbud.",
          "The silicone seal reduces sound leaking in.\nThe mesh protects the sound outlet.",
          "The outside microphone picks up ambient sound.\nThe housing protects the electronics.",
          "The processor drives an opposing signal through the speaker.\nThe battery powers the circuit."
        ][this.revealStep]
      }
      this.inspect();this.updateView();return
    }
    if(this.stage==="Use"&&action==="b"){
      if(this.sawOn&&this.sawOff){
        this.stage="Predict";this.model.anc=true;this.model.source="hum"
        this.message="Will changing sound be reduced as completely as this steady hum? Predict, then test."
      }else this.message="Compare ANC ON and OFF first. Watch the bottom residual trace."
    }else if(this.stage==="Predict"&&(action==="a"||action==="b")){
      this.prediction=action==="a"?"less":"same"
      this.message="Prediction saved. Pinch Try changing to test it."
    }else if(this.stage==="Investigate"&&action==="b"){
      if(this.cutaway&&this.sawHum&&this.sawChanging){
        this.discovered=true;this.stage="Fix";this.model.setTip(0);this.model.anc=false
        this.message="This virtual tip leaks. Choose a sealed fit, enable ANC, then check the setup."
      }else this.message="Open the shell and compare hum and changing sound before continuing."
    }else if(this.stage==="Fix"){
      if(action==="a")this.model.cycleTip()
      if(action==="b"){
        if(this.model.fit===1&&this.model.anc){
          this.repaired=true;this.stage="Prove";this.model.source="hum"
          this.message="Compare ANC off/on for hum. Then try changing sound: is everything gone?"
        }else{
          this.attempts++;this.message="Choose the Sealed virtual tip and enable ANC. Fit and active control do different jobs."
        }
      }
    }else if(this.stage==="Prove"&&(action==="a"||action==="b")){
      if(!this.humProven||this.model.source!=="changing"||!this.model.anc||this.model.fit!==1){
        this.message="First compare hum with ANC off/on. Then try changing sound and choose your answer."
      }else if(action==="a"){
        this.attempts++;this.message="The changing signal still leaves a residual. Inspect the bottom trace and try again."
      }else{
        this.stage="Complete";this.understood=true;this.rewardCount=1;this.cutaway=false;this.revealStep=0
        this.message="Things Understood: your miniature earbud. Toggle Mini ANC and watch the residual."
      }
    }else if(this.stage==="Complete"&&action==="b"){this.reset();return}
    this.updateView()
  }

  private snapshotSignal():EarbudSignalModel {
    const copy=new EarbudSignalModel()
    copy.anc=this.model.anc;copy.source=this.model.source
    copy.setTip(this.model.tipIndex)
    copy.elapsed=this.model.elapsed
    return copy
  }

  private inspect():void {
    if(this.stage!=="Investigate"||!this.cutaway)return
    if(this.model.source==="hum")this.sawHum=true
    else this.sawChanging=true
  }

  private hint():void {
    const hints:{[key:string]:string}={
      Use:"ANC adds an opposing contribution. Compare the bottom trace with ANC on and off.",
      Predict:"ANC is more effective for a steady hum than rapidly changing sound. Choose, then test.",
      Investigate:"Open Cutaway. Switch between hum and changing sound; follow microphone → processor → speaker.",
      Fix:"Next tip cycles Loose → Partial → Sealed. A seal helps passive isolation; ANC needs to be ON too.",
      Prove:"For hum, turn ANC off then on. Try changing sound; some residual remains.",
      Complete:"Mini ANC controls your in-session teaching model. Reset starts one clean episode."
    }
    this.message=hints[this.stage]
  }

  public reset():void {
    this.replay.clear();this.view.setReplayFrame(null)
    this.model.reset();this.stage="Use";this.cutaway=false;this.revealStep=0
    this.discovered=false;this.repaired=false;this.understood=false;this.rewardCount=0;this.hintCount=0;this.attempts=0
    this.prediction=null;this.sawOn=false;this.sawOff=false;this.sawHum=false;this.sawChanging=false;this.proofOff=false;this.humProven=false
    this.message="How can adding sound make it quieter?\nToggle ANC on and off, then Continue."
    this.updateView()
  }

  public recenter():void {
    const camera=this.cameraObject.getTransform(),position=camera.getWorldPosition()
    const forward=camera.getWorldRotation().multiplyVec3(new vec3(0,0,-1)),flat=new vec3(forward.x,0,forward.z)
    const direction=flat.length>0.001?flat.normalize():new vec3(0,0,-1)
    this.experienceRoot.getTransform().setWorldPosition(position.add(direction.uniformScale(55)).add(new vec3(0,-3,0)))
    this.experienceRoot.getTransform().setWorldRotation(quat.lookAt(direction.uniformScale(-1),vec3.up()))
  }

  private updateView():void {
    this.replayStatus=-1
    const actions:{[key:string]:[string,string]}={
      Use:["Toggle ANC","Continue"],Predict:["Less complete","Same quiet"],Investigate:["","Continue"],
      Fix:["Next tip","Check setup"],Prove:["All gone","Some remains"],Complete:["Mini ANC","Replay"]
    }
    const pair=actions[this.stage]
    this.view.present(this.model,this.revealStep,this.stage==="Complete")
    this.ui.present({stage:this.stage,message:this.message,actionA:pair[0],actionB:pair[1],
      milestones:"Discovered "+(this.discovered?"✓":"○")+" · Repaired "+(this.repaired?"✓":"○")+"\nUnderstood "+(this.understood?"✓":"○"),
      anc:this.model.anc,source:this.model.source,tip:this.model.tipName,residual:this.model.levels().ratio,
      paused:this.model.paused,revealStep:this.revealStep,reward:this.stage==="Complete",replayActive:this.replay.active})
  }
}
