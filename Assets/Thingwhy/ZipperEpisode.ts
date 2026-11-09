import {ActionReplay} from "./ActionReplay"
import {ZipperMesh} from "./ZipperMesh"
import {ZipperUI,ZipperAction} from "./ZipperUI"
import {ZipperMechanism,ZipperStage} from "./ZipperMechanism"

@component
export class ZipperEpisode extends BaseScriptComponent {
  @input @hint("Procedural zipper view and hand-driven pull") mesh!:ZipperMesh
  @input @hint("Passive UIKit control panel") ui!:ZipperUI
  @input @hint("Authored group moved by Recenter") experienceRoot!:SceneObject
  @input @hint("Main camera used only for manual recenter") cameraObject!:SceneObject
  @input @hint("Slider travel per second, as fraction of full rail") travelSpeed:number=0.45

  public mechanism=new ZipperMechanism()
  public stage:ZipperStage="Use"
  public paused=false
  public slow=false
  public discovered=false
  public repaired=false
  public understood=false
  public rewardCount=0
  public prediction:string|null=null
  public cutaway=false
  public inspectionStep=0
  public hintCount=0
  public assemblyAttempts=0
  private target:number|null=null
  readonly replay=new ActionReplay<number>()
  private readonly playbackModel=new ZipperMechanism()
  private travelStart=0
  private lastTravelAt=-1
  private travelDirection=0
  private observedMotion=0
  private proofClosed=false
  private retryPrediction=false
  private showMiniature=true
  private message="Pinch-drag the pull upward to close.\nOr use the large Close button."

  onAwake():void {
    this.createEvent("OnStartEvent").bind(()=>{
      if(!this.mesh||!this.ui||!this.experienceRoot||!this.cameraObject)throw new Error("Wire all ZipperEpisode inputs")
      this.mesh.onPull.add(delta=>this.drag(delta))
      this.ui.onAction.add(action=>this.act(action))
      this.recenter();this.updateView()
      print("Thingwhy ready: seated zipper Use > Predict > Investigate > Fix > Prove")
    })
    this.createEvent("UpdateEvent").bind(()=>{
      if(this.replay.active){
        const frame=this.replay.tick(getDeltaTime(),this.paused)
        if(frame){
          this.playbackModel.setProgress(frame.from+(frame.to-frame.from)*frame.progress)
          this.mesh.render(this.playbackModel,true,this.inspectionStep)
          this.ui.showReplayFrame(this.playbackModel.progress,frame.holding)
        }else this.updateView()
        return
      }
      if(this.paused||this.target===null)return
      const step=getDeltaTime()*this.travelSpeed*(this.slow?0.2:1)
      const progress=this.mechanism.progress
      const next=Math.abs(this.target-progress)<=step?this.target:progress+Math.sign(this.target-progress)*step
      this.move(next)
      if(this.target!==null&&Math.abs(this.target-this.mechanism.progress)<0.0001)this.target=null
    })
  }

  public act(action:ZipperAction):void {
    if(action==="pause") {
      this.paused=!this.paused;this.target=null
      this.mesh.setInputEnabled(!this.paused&&!this.replay.active);this.updateView();return
    }
    if(action==="reset"){this.reset();return}
    if(action==="recenter"){this.recenter();return}
    if(this.paused)return
    if(action==="replay"){
      if(this.stage!=="Investigate")return
      if(this.replay.active)this.replay.stop()
      else if(!this.cutaway)this.message="Open the cutaway before replaying the slider."
      else if(this.replay.start()){
        this.target=null
        this.message="Watch the rows converge at the guide channels."
      }else this.message="Move the slider first to capture its motion."
      this.mesh.setInputEnabled(!this.replay.active)
      this.updateView()
      return
    }
    if(this.replay.active)return
    if(action==="hint"){this.hint();return}
    if(action==="slow"){this.slow=!this.slow;this.updateView();return}
    if(action==="close"||action==="open") {
      if(this.stage==="Predict"&&!this.prediction){this.message="Predict first: will reversing separate or join the teeth?";this.updateView();return}
      this.lastTravelAt=-1
      this.target=action==="close"?1:0
      if(!this.mechanism.assembled){this.target=null;this.message="Fit the teaching shell correctly before using the slider.";this.updateView()}
      return
    }
    if(this.stage==="Use"||this.stage==="Prove") {this.act(action==="a"?"close":"open");return}
    if(this.stage==="Predict") {
      if(this.prediction)return
      this.prediction=action==="a"?"separate":"join"
      if(this.mechanism.progress<=0.02)this.target=1
      this.message="Prediction saved: "+this.prediction+".\nClose if needed, then pull down to test it."
      this.updateView();return
    }
    if(this.stage==="Investigate") {
      if(action==="a") {
        this.inspectionStep=(this.inspectionStep+1)%3
        this.cutaway=this.inspectionStep>0
        this.message=[
          "Open the cutaway to trace the guide channels.",
          "Two guide channels bring the rows together.\nMove the pull slowly to follow the teeth.",
          "Offset teeth mesh into one chain.\nReverse the slider to separate the rows."
        ][this.inspectionStep]
      } else if(this.cutaway&&this.observedMotion>=0.15) {
        this.discovered=true;this.stage="Fix";this.target=null;this.mechanism.beginAssembly()
        this.message="Teaching-model reassembly.\nRotate the shell so its green wide mouth faces the two rows, then Fit."
      } else this.message="Expose the cutaway and move the slider\nto inspect how the two paths converge."
      this.updateView();return
    }
    if(this.stage==="Fix") {
      if(action==="a") {this.mechanism.rotateShell();this.message="Compare the shell's green wide mouth\nwith the two open rows above the slider."}
      else {
        this.assemblyAttempts++
        if(this.mechanism.tryAssembly()) {
          this.repaired=true;this.stage="Prove";this.cutaway=false;this.inspectionStep=0;this.proofClosed=false
          this.message="Reassembled! Close fully, then reopen\nto prove the zipper works."
        } else this.message="That orientation is reversed.\nThe wide mouth must face the two rows. Try again."
      }
      this.updateView();return
    }
    if(this.stage==="Complete") {
      if(action==="b")this.reset()
      else {this.showMiniature=!this.showMiniature;this.message=this.showMiniature?"Things Understood: your working miniature.\nPinch-drag its pull to operate it.":"Keep exploring your restored zipper.\nView reward returns to your miniature.";this.updateView()}
    }
  }

  public drag(delta:number):void {
    if(this.paused||this.replay.active||!isFinite(delta))return
    if(this.stage==="Predict"&&!this.prediction)return
    this.target=null;this.move(this.mechanism.progress+delta*(this.slow?0.2:1))
  }

  private move(value:number):void {
    const previous=this.mechanism.progress
    if(!this.mechanism.setProgress(value))return
    const progress=this.mechanism.progress
    if(this.stage==="Investigate"&&progress!==previous){
      if(this.cutaway)this.observedMotion+=Math.abs(progress-previous)
      const direction=Math.sign(progress-previous),now=getTime()
      if(this.lastTravelAt<0||now-this.lastTravelAt>.22||direction!==this.travelDirection)this.travelStart=previous
      this.lastTravelAt=now
      this.travelDirection=direction
      this.replay.remember(this.travelStart,progress)
    }
    if(this.stage==="Use"&&progress>=0.99) {
      this.stage="Predict";this.target=null
      this.message="What happens when you reverse the slider?\nChoose, then pull down to test."
    } else if(this.stage==="Predict"&&this.prediction&&progress<=0.02&&previous>progress) {
      this.target=null
      if(this.prediction==="join"){
        this.prediction=null;this.retryPrediction=true
        this.message="The test shows the teeth separate.\nChoose again; no penalty. We will re-close for your next test."
      }else{
        this.stage="Investigate"
        this.message=this.retryPrediction?"You tested and revised your prediction!\nExpose the Cutaway to investigate why.":"You predicted it!\nExpose the Cutaway to investigate why."
      }
    } else if(this.stage==="Prove") {
      if(progress>=0.99)this.proofClosed=true
      if(this.proofClosed&&progress<=0.02) {
        this.stage="Complete";this.understood=true;this.rewardCount=1;this.target=null
        this.showMiniature=true
        this.message="Things Understood: your working miniature.\nPinch-drag its pull to try it!"
      }
    }
    this.updateView()
  }

  private hint():void {
    this.hintCount++
    const hints:{[key:string]:string}={
      Use:"Pull upward: the slider guides two rows\ninto one chain. No need to rush.",
      Predict:"Look at the open rows above the slider.\nWhat will moving it down do to the chain?",
      Investigate:"Open Cutaway. Move the pull, or press\nClose/Open with Slow enabled. Then Continue.",
      Fix:"Green marks the wide end. It belongs\nabove the diamond, facing the two rows.",
      Prove:"Close all the way first. Then reopen\nall the way to earn Understood.",
      Complete:"The small zipper is yours for this session.\nExplore freely or Replay to start over."
    }
    this.message=hints[this.stage];this.updateView()
  }

  public reset():void {
    this.replay.clear();this.lastTravelAt=-1
    this.mechanism.reset();this.stage="Use";this.paused=false;this.slow=false;this.cutaway=false;this.inspectionStep=0
    this.discovered=false;this.repaired=false;this.understood=false;this.rewardCount=0
    this.prediction=null;this.hintCount=0;this.assemblyAttempts=0;this.observedMotion=0;this.proofClosed=false;this.retryPrediction=false;this.showMiniature=true;this.target=null
    this.message="Pinch-drag the pull upward to close.\nOr use the large Close button."
    this.mesh.setInputEnabled(true);this.updateView()
  }

  public recenter():void {
    const camera=this.cameraObject.getTransform()
    const position=camera.getWorldPosition()
    const rotation=camera.getWorldRotation()
    const forward=rotation.multiplyVec3(new vec3(0,0,-1))
    const flat=new vec3(forward.x,0,forward.z)
    const direction=flat.length>0.001?flat.normalize():new vec3(0,0,-1)
    this.experienceRoot.getTransform().setWorldPosition(position.add(direction.uniformScale(55)).add(new vec3(0,-3,0)))
    this.experienceRoot.getTransform().setWorldRotation(quat.lookAt(direction.uniformScale(-1),vec3.up()))
  }

  private updateView():void {
    const actions:{[key:string]:[string,string]}={Use:["Close ↑","Open ↓"],Predict:["Separates","Joins"],Investigate:[["Open cutaway","Next: teeth","Close cutaway"][this.inspectionStep],"Continue"],Fix:["Rotate shell","Fit shell"],Prove:["Close ↑","Open ↓"],Complete:[this.showMiniature?"Explore zipper":"View reward","Replay"]}
    const pair=actions[this.stage]
    if(!this.replay.active){
      this.mesh.render(this.mechanism,this.cutaway,this.inspectionStep)
      this.mesh.setInputEnabled(!this.paused)
    }
    this.mesh.showInspectionFocus(this.stage==="Investigate"&&this.cutaway)
    this.mesh.showReward(this.rewardCount===1,this.rewardCount===1&&this.showMiniature)
    this.ui.present({stage:this.stage,message:this.message,milestone:"Discovered "+(this.discovered?"✓":"○")+" · Repaired "+(this.repaired?"✓":"○")+"\nUnderstood "+(this.understood?"✓":"○"),actionA:pair[0],actionB:pair[1],paused:this.paused,slow:this.slow,progress:this.mechanism.progress,replayActive:this.replay.active})
  }
}
