import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {ScenarioConfig} from "Leaf.lspkg/Scenarios/scenario/ScenarioConfig"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {IKBodyInteractor} from "Leaf.lspkg/Interactors/interactor/ik/IKBodyInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName,sleep} from "Leaf.lspkg/Utils/common/Utils"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {EarbudEpisode} from "./EarbudEpisode"
import {EarbudSignalModel} from "./EarbudSignalModel"
import {ZipperEpisode} from "./ZipperEpisode"

/** Names verified in EarbudUI/View factories and native VirtualScene snapshot.
 * Thingwhy Earbuds | EarbudEpisode | stage | Use after reset
 * Thingwhy Zipper | ZipperEpisode | paused | true when hidden
 * Earbud removable shell | Transform | position | freezes on pause
 * Earbud a/b/anc/noise/cutaway/hint/pause/recenter/reset | UIKit | enabled | active root only
 * Episode zipper/earbuds | UIKit | enabled | both in persistent picker
 */
@component
export class EarbudLeafScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void> {
    const mode=config?.get("mode")??"flow"
    const root=findSceneObjectByName("Thingwhy Earbuds")
    const zipperRoot=findSceneObjectByName("Thingwhy Zipper")
    if(!root||!zipperRoot)throw new Error("Episode roots missing")
    const episode=root.getComponent(EarbudEpisode.getTypeName()) as EarbudEpisode
    const zipper=zipperRoot.getComponent(ZipperEpisode.getTypeName()) as ZipperEpisode
    const hand=new DefaultLeafInteractor("Earbuds scenario hand")
    const ik=mode==="hand-ray"?new IKBodyInteractor():null
    if(ik){await ik.ready;ik.left.isIndirect=()=>true;ik.right.isIndirect=()=>true}
    const tap=async(name:string):Promise<void>=>{
      if(name.indexOf("Episode ")===0&&!findInteractablesByName(name,undefined,true).length)await tap("Workbench tray")
      const target=findInteractablesByName(name,undefined,true)[0]
      if(!target)throw new Error("Missing enabled target: "+name)
      if(ik)await ik.trigger(target);else await hand.trigger(target)
      await sleep(180)
    }
    const button=async(key:string)=>{
      if(["pause","recenter","reset"].indexOf(key)>=0&&!findInteractablesByName("Earbud "+key,undefined,true).length)await tap("Earbud tools")
      if(key==="anc"&&episode.stage==="Use")await tap("Earbud ANC target")
      else await tap("Earbud "+key)
    }
    await sleep(500);await tap("Episode earbuds");await button("reset")
    expect(episode.stage).toBe("Use")
    if(mode==="visual-use")return
    if(mode==="model"){
      const model=new EarbudSignalModel()
      const off=model.levels().ratio;model.anc=true
      const hum=model.levels().ratio
      expect(hum).toBeLessThan(off)
      for(let i=0;i<500;i++){
        const s=model.sample(i/8000)
        expect(s.residual).toBeCloseTo(s.passive+s.anti,8)
        expect(s.anti).toBeCloseTo(-.9*s.passive,8)
      }
      model.source="changing";const sealed=model.levels().ratio
      expect(sealed).toBeGreaterThan(hum);model.setTip(0)
      expect(model.levels().ratio).toBeGreaterThan(sealed)
      model.paused=true;const time=model.elapsed;model.tick(.05)
      expect(model.elapsed).toBe(time);model.reset()
      expect(model.anc).toBe(false);expect(model.tipName).toBe("Sealed")
      print("Earbud signal invariants and seal/ANC separation passed");return
    }
    if(mode==="lifecycle"){
      await button("cutaway");await sleep(250);await button("pause")
      const elapsed=episode.model.elapsed
      const shell=findSceneObjectByName("Tip assembly")
      if(!shell)throw new Error("Moving tip assembly missing")
      const position=shell.getTransform().getLocalPosition()
      await button("anc");await button("noise");await sleep(400)
      expect(episode.model.elapsed).toBe(elapsed)
      expect(episode.model.anc).toBe(false);expect(episode.model.source).toBe("hum")
      expect(shell.getTransform().getLocalPosition().distance(position)).toBeLessThan(.0001)
      await button("pause");await sleep(200)
      expect(episode.model.elapsed).toBeGreaterThan(elapsed)
      const hints=episode.hintCount;await button("hint");expect(episode.hintCount-hints).toBe(1)
      await tap("Episode zipper");expect(root.enabled).toBe(false)
      expect(episode.model.paused).toBe(true);expect(zipperRoot.enabled).toBe(true)
      expect(findInteractablesByName("Earbud anc",undefined,true).length).toBe(0)
      const hiddenTime=episode.model.elapsed;await sleep(300)
      expect(episode.model.elapsed).toBe(hiddenTime)
      await tap("Episode earbuds");expect(zipperRoot.enabled).toBe(false)
      expect(zipper.paused).toBe(true);expect(episode.cutaway).toBe(true);expect(episode.revealStep).toBe(1)
      expect(episode.model.paused).toBe(true);expect(episode.hintCount-hints).toBe(1)
      expect(findInteractablesByName("Zipper reset",undefined,true).length).toBe(0)
      await button("reset");expect(episode.cutaway).toBe(false);expect(episode.revealStep).toBe(0)
      expect(episode.model.paused).toBe(false);expect(episode.rewardCount).toBe(0)
      print("Earbud pause, hidden input, switching, preserved progress and reset passed");return
    }
    if(mode==="reach"){
      const camera=findSceneObjectByName("Camera Object")
      if(!camera)throw new Error("Camera missing")
      for(const name of ["Earbud b","Earbud anc","Earbud noise","Earbud cutaway","Earbud hint","Earbud pause","Earbud recenter","Earbud reset","Workbench tray","Workbench notebook"]){
        const target=findInteractablesByName(name,undefined,true)[0]
        if(!target)throw new Error("Required seated control missing: "+name)
        expect(target.getSceneObject().getTransform().getWorldPosition().distance(camera.getTransform().getWorldPosition())).toBeLessThan(61)
      }
      print("Earbud and picker controls inside seated 61cm envelope");return
    }
    // Real UIKit controls, including negative/retry paths before the successful proof.
    await button("b");expect(episode.stage).toBe("Use")
    await button("anc");await button("anc");await button("b")
    expect(episode.stage).toBe("Predict")
    if(mode==="visual-predict")return
    await button("noise");expect(episode.model.source).toBe("hum")
    await button("b");await button("noise")
    expect(episode.stage).toBe("Predict");expect(episode.prediction).toBeNull()
    await button("a");await button("noise");expect(episode.stage).toBe("Investigate")
    
    await button("b");expect(episode.discovered).toBe(false)
    await button("cutaway");await button("noise");await button("noise")
    if(mode==="visual-cutaway"){await sleep(1000);return}
    if(mode==="replay"||mode==="visual-replay"){
      await button("cutaway");await button("cutaway")
      await button("anc")
      const live=episode.model.anc
      await button("replay")
      expect(episode.replay.active).toBe(true)
      await sleep(900);await button("pause")
      expect(episode.replay.active).toBe(true)
      expect(episode.model.anc).toBe(live)
      expect(episode.stage).toBe("Investigate")
      if(mode==="visual-replay")return
      await button("pause");await sleep(1000)
      expect(episode.replay.active).toBe(false)
      expect(episode.model.anc).toBe(live)
      return
    }
    expect(episode.revealStep).toBe(1)
    await button("cutaway");expect(episode.revealStep).toBe(2)
    if(mode==="visual-housing"){await sleep(1000);return}
    await button("cutaway");expect(episode.revealStep).toBe(3)
    if(mode==="visual-internals"){await sleep(1000);return}
    await button("cutaway");expect(episode.revealStep).toBe(0)
    await button("cutaway");expect(episode.revealStep).toBe(1)
    await button("b");expect(episode.stage).toBe("Fix");expect(episode.discovered).toBe(true)
    if(mode==="visual-fix")return
    await button("b");expect(episode.repaired).toBe(false)
    await button("a");await button("a");await button("b")
    expect(episode.repaired).toBe(false)
    await button("anc");await button("b");expect(episode.stage).toBe("Prove")
    if(mode==="visual-prove")return
    await button("b");expect(episode.understood).toBe(false)
    await button("anc");await button("anc");await button("noise")
    await button("a");expect(episode.understood).toBe(false)
    const rewards=episode.rewardCount;await button("b")
    expect(episode.stage).toBe("Complete");expect(episode.rewardCount-rewards).toBe(1)
    expect(episode.understood).toBe(true)
    const anc=episode.model.anc;await button("a");expect(episode.model.anc).toBe(!anc)
    await button("a");expect(episode.rewardCount-rewards).toBe(1)
    print("Earbud five-stage flow, retries, proof guards and one operable reward passed: "+mode)
  }
}
