import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {ScenarioConfig} from "Leaf.lspkg/Scenarios/scenario/ScenarioConfig"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName,sleep} from "Leaf.lspkg/Utils/common/Utils"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {ZipperEpisode} from "./ZipperEpisode"
import {ZipperMechanism} from "./ZipperMechanism"
import {IKBodyInteractor} from "Leaf.lspkg/Interactors/interactor/ik/IKBodyInteractor"
import {SIK} from "SpectaclesInteractionKit.lspkg/SIK"
import {InteractorInputType} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {DiagnosticRecorder} from "Leaf.lspkg/Diagnostic/DiagnosticRecorder"

/** Object names are authored by the MCP bootstrap and ZipperUI/ZipperMesh factories.
 * Each scenario resets through the same UIKit action used by hands before asserting.
 */
@component
export class ZipperLeafScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void> {
    const root=findSceneObjectByName("Thingwhy Zipper")
    if(!root)throw new Error("Thingwhy Zipper authored root missing")
    const episode=root.getComponent(ZipperEpisode.getTypeName()) as ZipperEpisode
    if(!episode)throw new Error("ZipperEpisode component missing")
    const mode=config?.get("mode")??"flow"
    const hand=new DefaultLeafInteractor("Zipper scenario hand")
    const ikFlow=mode==="ik-flow"||mode==="ik-ray-flow"?new IKBodyInteractor():null
    if(ikFlow)await ikFlow.ready
    if(ikFlow&&mode==="ik-ray-flow"){
      // Explicitly exercise hand-ray input, including when the target is near.
      // This changes strategy selection, never injects target/trigger events.
      // Keep ik-flow unchanged as a separate direct-contact regression.
      ikFlow.left.isIndirect=()=>true
      ikFlow.right.isIndirect=()=>true
    }
    const tap=async(name:string):Promise<void>=>{
      if((episode.stage==="Use"||episode.stage==="Prove")&&(name==="close"||name==="open"))name=name==="close"?"a":"b"
      if(["pause","recenter","reset"].indexOf(name)>=0&&!findInteractablesByName("Zipper "+name,undefined,true).length)await tap("tools")
      const target=findInteractablesByName("Zipper "+name,undefined,true)[0]
      if(!target)throw new Error("Missing enabled UIKit target: Zipper "+name)
      if(ikFlow)await ikFlow.trigger(target)
      else await hand.trigger(target)
      await sleep(150)
    }
    await sleep(500)
    if(!findInteractablesByName("Episode zipper",undefined,true).length){
      const tray=findInteractablesByName("Workbench tray",undefined,true)[0]
      if(!tray)throw new Error("Workbench tray missing")
      await hand.trigger(tray);await sleep(180)
    }
    const picker=findInteractablesByName("Episode zipper",undefined,true)[0]
    if(!picker)throw new Error("Zipper miniature missing")
    await hand.trigger(picker);await sleep(180);await tap("reset")
    // Visual checkpoints use the same visible controls; leave Preview at the checkpoint.
    if(["visual-open","visual-mid","visual-closed","visual-cutaway","visual-teeth"].indexOf(mode)>=0){
      if(mode==="visual-open"){
        expect(findSceneObjectByName("Pull tab callout")?.enabled).toBe(true)
        expect(findSceneObjectByName("Slider callout")?.enabled).toBe(true)
        return
      }
      await tap("a");await sleep(mode==="visual-mid"?900:2500)
      if(mode==="visual-mid"){await tap("pause");return}
      if(mode==="visual-closed")return
      await tap("a");await tap("open");await sleep(2500)
      await tap("a");await tap("slow");await tap("close");await sleep(2200)
      if(mode==="visual-teeth")await tap("a")
      expect(findSceneObjectByName(mode==="visual-teeth"?"Interlocking teeth callout":"Guide channels callout")?.enabled).toBe(true)
      await tap("pause");await tap("pause")
      return
    }
    if(mode==="reach"){
      const names=["a","b","hint","slow","pause","recenter","reset"]
      const camera=findSceneObjectByName("Camera Object")
      if(!camera)throw new Error("Authored camera missing")
      for(const name of names){
        const target=findInteractablesByName("Zipper "+name,undefined,true)[0]
        if(!target)throw new Error("Required control missing: "+name)
        const distance=target.getSceneObject().getTransform().getWorldPosition().distance(camera.getTransform().getWorldPosition())
        expect(distance).toBeLessThan(61)
      }
      // Exercise IK hands without an unrelated remote Bitmoji/avatar dependency.
      // No fallback: a failed IK pinch must fail this assertion.
      const ik=new IKBodyInteractor()
      await ik.ready
      for(const name of names){
        const target=findInteractablesByName("Zipper "+name,undefined,true)[0]
        print("Reach target "+name+" at "+target.getSceneObject().getTransform().getWorldPosition())
        target.onTriggerEnd.add(()=>print("IK actual trigger: "+name))
        target.onHoverEnter.add(()=>print("IK hover: "+name))
        target.onTriggerStart.add(()=>print("IK trigger start: "+name))
        target.onTriggerCanceled.add(()=>print("IK trigger canceled: "+name))
      }
      const before=episode.hintCount
      const right=SIK.InteractionManager.getInteractorsByType(InteractorInputType.RightHand)[0]
      let previous=""
      const trace=this.createEvent("LateUpdateEvent")
      trace.bind(()=>{
        const state="target="+(right.currentInteractable?.getSceneObject().name??"none")+" trigger="+right.currentTrigger
        if(state!==previous){print("IK state: "+state);previous=state}
      })
      try{await ik.trigger(findInteractablesByName("Zipper hint",undefined,true)[0])}finally{trace.enabled=false}
      await sleep(150)
      expect(episode.hintCount-before).toBe(1)
      print("Seated reach: all required controls within61cm; IK hint pinch passed without fallback")
      return
    }
    if(mode==="mechanism"){
      const model=new ZipperMechanism()
      for(let sample=0;sample<=100;sample++){
        model.setProgress(sample/100)
        const parts:{x0:number;x1:number;y0:number;y1:number;tooth:number}[]=[]
        for(const side of [-1,1])for(let i=0;i<16;i++){
          const y=-10.5+i*1.35+(side===1?0.675:0),x=side*model.rowOffset(y),tooth=(side===1?16:0)+i
          parts.push({x0:x+side*.9-.9,x1:x+side*.9+.9,y0:y-.21,y1:y+.21,tooth})
          parts.push({x0:x-side*.35-.45,x1:x-side*.35+.45,y0:y-.28,y1:y+.28,tooth})
        }
        for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
          const a=parts[i],b=parts[j]
          if(a.tooth===b.tooth)continue
          const overlap=a.x0<b.x1&&a.x1>b.x0&&a.y0<b.y1&&a.y1>b.y0
          expect(overlap).toBe(false)
        }
        const obstacles=[{x:0,y:.8,w:1.2,h:1.2,angle:Math.PI/4},{x:-4.4,y:0,w:.3,h:5.2,angle:.39},{x:4.4,y:0,w:.3,h:5.2,angle:-.39}]
        for(const part of parts)for(const obstacle of obstacles){
          expect(this.intersects((part.x0+part.x1)/2,(part.y0+part.y1)/2-model.sliderY,part.x1-part.x0,part.y1-part.y0,obstacle)).toBe(false)
        }
      }
      model.setProgress(2);expect(model.progress).toBe(1)
      model.beginAssembly();expect(model.setProgress(0)).toBe(false)
      expect(model.tryAssembly()).toBe(false);model.rotateShell();expect(model.tryAssembly()).toBe(true)
      model.reset();expect(model.progress).toBe(0)
      print("Zipper geometry: 101 positions, no inter-tooth AABB overlap; assembly guards pass")
      return
    }
    if(mode==="pause-reset"){
      const pull=findInteractablesByName("Zipper Pull",undefined,true)[0]
      if(!pull)throw new Error("Large zipper pull missing")
      const original=episode.mechanism.progress
      await hand.drag(pull,new vec3(0,.08,0),600)
      expect(episode.mechanism.progress).toBeGreaterThan(original)
      await tap("close");await sleep(600);await tap("pause")
      const progress=episode.mechanism.progress
      await tap("open");await sleep(700)
      expect(episode.mechanism.progress).toBeCloseTo(progress,4)
      await hand.drag(pull,new vec3(0,-.08,0),600)
      expect(episode.mechanism.progress).toBeCloseTo(progress,4)
      await tap("pause");await sleep(400)
      expect(episode.mechanism.progress).toBeCloseTo(progress,4)
      const beforeHint=episode.hintCount;await tap("hint")
      expect(episode.hintCount-beforeHint).toBe(1)
      await tap("reset")
      expect(episode.stage).toBe("Use");expect(episode.rewardCount).toBe(0)
      expect(episode.mechanism.progress).toBe(0);expect(episode.paused).toBe(false)
      expect(root.getChildrenCount()).toBe(3)
      return
    }
    // End-to-end positive and recovery paths through real SIK/UIKit targets.
    if(ikFlow){
      const pull=findInteractablesByName("Zipper Pull",undefined,true)[0]
      if(!pull)throw new Error("Large zipper pull missing for IK drag")
      const before=episode.mechanism.progress
      try{await ikFlow.trigger(pull,"left");await ikFlow.drag(pull,new vec3(0,2,0),"left")}finally{
        const report=DiagnosticRecorder.getInstance().toReport()
        if(report)print("IK pull diagnostics: "+report)
      }
      expect(episode.mechanism.progress).toBeGreaterThan(before)
      await tap("reset")
    }
    await tap("a");await sleep(2500);expect(episode.stage).toBe("Predict")
    await tap("b");await tap("open");await sleep(2500)
    expect(episode.stage).toBe("Predict");expect(episode.prediction).toBeNull()
    await tap("a");await sleep(2500);await tap("open");await sleep(2500)
    expect(episode.stage).toBe("Investigate")
    await tap("b");expect(episode.stage).toBe("Investigate")
    await tap("a");expect(episode.cutaway).toBe(true)
    expect(episode.inspectionStep).toBe(1)
    await tap("a");expect(episode.inspectionStep).toBe(2)
    await tap("a");expect(episode.inspectionStep).toBe(0)
    await tap("a");expect(episode.inspectionStep).toBe(1)
    await tap("slow");await tap("close");await sleep(2200)
    if(mode==="replay"||mode==="visual-replay"){
      await tap("pause");await tap("pause")
      const live=episode.mechanism.progress
      await tap("replay");expect(episode.replay.active).toBe(true)
      await sleep(950);await tap("pause")
      expect(episode.replay.active).toBe(true)
      expect(episode.mechanism.progress).toBe(live)
      expect(episode.stage).toBe("Investigate")
      if(mode==="visual-replay")return
      await tap("pause");await sleep(1000)
      expect(episode.replay.active).toBe(false)
      expect(episode.mechanism.progress).toBe(live)
      return
    }
    await tap("b");expect(episode.stage).toBe("Fix");expect(episode.discovered).toBe(true)
    if(mode==="motion"){
      const shell=findSceneObjectByName("Teaching shell")
      if(!shell)throw new Error("Teaching shell missing")
      await tap("pause")
      const position=shell.getTransform().getLocalPosition()
      await sleep(400)
      expect(shell.getTransform().getLocalPosition().distance(position)).toBeCloseTo(0,5)
      await tap("pause");await sleep(1000)
      expect(shell.getTransform().getLocalPosition().distance(position)).toBeGreaterThan(0.5)
      await tap("reset");await sleep(100)
      expect(shell.getTransform().getLocalPosition().distance(new vec3(0,0,0.8))).toBeCloseTo(0,4)
      print("Shell presentation: pause freezes separation, resume continues, reset restores assembled pose")
      return
    }
    if(mode==="visual-fix"){await sleep(1200);return}
    await tap("b");expect(episode.stage).toBe("Fix");expect(episode.repaired).toBe(false)
    await tap("a");await tap("b");expect(episode.stage).toBe("Prove");expect(episode.repaired).toBe(true)
    if(mode==="visual-prove"){await sleep(1200);return}
    await tap("slow")
    await tap("open");await sleep(1500);expect(episode.rewardCount).toBe(0)
    await tap("close");await sleep(2500);await tap("open");await sleep(2500)
    expect(episode.stage).toBe("Complete");expect(episode.rewardCount).toBe(1)
    expect(episode.understood).toBe(true)
    const shelf=findSceneObjectByName("Things Understood Shelf")
    expect(shelf?.enabled).toBe(true)
    const mini=findInteractablesByName("Miniature Pull",undefined,true)[0]
    if(!mini)throw new Error("Operable miniature pull missing")
    const initialY=mini.getSceneObject().getTransform().getLocalPosition().y
    if(ikFlow)await ikFlow.drag(mini,new vec3(0,1,0),"left")
    else await hand.drag(mini,new vec3(0,0.1,0),600)
    expect(mini.getSceneObject().getTransform().getLocalPosition().y).toBeGreaterThan(initialY)
    await tap("pause")
    const pausedMiniY=mini.getSceneObject().getTransform().getLocalPosition().y
    if(ikFlow)await ikFlow.drag(mini,new vec3(0,-1,0),"left")
    else await hand.drag(mini,new vec3(0,-0.1,0),600)
    expect(mini.getSceneObject().getTransform().getLocalPosition().y).toBeCloseTo(pausedMiniY,4)
    await tap("pause")
    if(mode==="visual-complete")return
    await tap("a");await tap("close");await sleep(2500);await tap("open");await sleep(2500)
    expect(episode.rewardCount).toBe(1)
    await tap("reset");expect(episode.rewardCount).toBe(0);expect(shelf?.enabled).toBe(false)
    expect(root.getChildrenCount()).toBe(3)
    print("Zipper full-flow passed: prediction retry, inspection gate, wrong assembly, proof, collectible, reset")
  }

  /** Separating-axis test of tooth rectangles against rotated solid channel parts. */
  private intersects(x:number,y:number,w:number,h:number,other:{x:number;y:number;w:number;h:number;angle:number}):boolean {
    const polygon=(cx:number,cy:number,width:number,height:number,angle:number):number[][]=>{
      const c=Math.cos(angle),s=Math.sin(angle)
      return [[-1,-1],[1,-1],[1,1],[-1,1]].map(p=>[cx+p[0]*width/2*c-p[1]*height/2*s,cy+p[0]*width/2*s+p[1]*height/2*c])
    }
    const a=polygon(x,y,w,h,0),b=polygon(other.x,other.y,other.w,other.h,other.angle)
    for(const points of [a,b])for(let i=0;i<4;i++){
      const p=points[i],q=points[(i+1)%4],axis=[-(q[1]-p[1]),q[0]-p[0]]
      const project=(poly:number[][])=>poly.map(point=>point[0]*axis[0]+point[1]*axis[1])
      const pa=project(a),pb=project(b)
      if(Math.max(...pa)<=Math.min(...pb)||Math.max(...pb)<=Math.min(...pa))return false
    }
    return true
  }
}
