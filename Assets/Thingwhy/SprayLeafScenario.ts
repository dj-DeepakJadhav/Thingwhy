import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {ScenarioConfig} from "Leaf.lspkg/Scenarios/scenario/ScenarioConfig"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {IKBodyInteractor} from "Leaf.lspkg/Interactors/interactor/ik/IKBodyInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName,sleep} from "Leaf.lspkg/Utils/common/Utils"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {EpisodeSelector} from "./EpisodeSelector"

@component
export class SprayLeafScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void> {
    const mode=config?.get("mode")??"flow"
    const picker=findSceneObjectByName("Thingwhy Episodes")
    const selector=picker?.getComponent(EpisodeSelector.getTypeName()) as EpisodeSelector
    if(!selector?.spray)throw new Error("Spray episode missing")
    const episode=selector.spray
    const ik=mode==="hand-ray"?new IKBodyInteractor():null
    const hand=ik?null:new DefaultLeafInteractor("Spray test hand")
    if(ik){await ik.ready;ik.left.isIndirect=()=>true;ik.right.isIndirect=()=>true}
    const tap=async(name:string):Promise<void>=>{
      if(name.indexOf("Episode ")===0&&!findInteractablesByName(name,undefined,true).length)await tap("Workbench tray")
      const target=findInteractablesByName(name,undefined,true)[0]
      if(!target)throw new Error("Missing target: "+name)
      if(ik)await ik.trigger(target);else if(hand)await hand.trigger(target)
      await sleep(150)
    }
    const button=async(name:string)=>{
      if(["pause","reset","hint","recenter"].indexOf(name)>=0&&!findInteractablesByName("Spray "+name,undefined,true).length)await tap("Spray tools")
      await tap("Spray "+name)
    }
    const cycle=async()=>{await button("pump");await button("pump")}
    await tap("Episode spray");await button("reset")
    expect(episode.stage).toBe("Use")
    if(mode==="visual-use")return
    if(mode==="visual-spray"){await button("pump");await button("pause");return}
    await tap("Spray physical trigger")
    expect(episode.stage).toBe("Predict")
    expect(episode.pump.primed).toBe(true)
    await button("pump");expect(episode.pump.pressed).toBe(false)
    await button("a");await cycle();expect(episode.stage).toBe("Predict")
    await button("b");await cycle();expect(episode.stage).toBe("Investigate")
    await button("b");expect(episode.stage).toBe("Investigate")
    await button("a");expect(episode.reveal).toBe(1)
    await button("a");expect(episode.reveal).toBe(2)
    await cycle()
    await button("replay");expect(episode.replay.active).toBe(true)
    if(mode==="visual-replay"){
      await sleep(940);await button("pause")
      expect(episode.replay.active).toBe(true)
      return
    }
    await sleep(1700)
    expect(episode.pump.primed).toBe(true)
    expect(episode.stage).toBe("Investigate")
    expect(episode.replay.active).toBe(false)
    await tap("Episode pen")
    expect(episode.paused).toBe(true)
    expect(findInteractablesByName("Spray pump",undefined,true).length).toBe(0)
    await tap("Episode spray");expect(episode.reveal).toBe(2)
    await button("pause")
    await button("b");expect(episode.stage).toBe("Fix")
    await cycle();expect(episode.pump.primed).toBe(false)
    await button("a");expect(episode.pump.blocked).toBe(false)
    await cycle();expect(episode.stage).toBe("Prove")
    await cycle();expect(episode.stage).toBe("Complete")
    expect(episode.rewardCount).toBe(1)
    await cycle();expect(episode.rewardCount).toBe(1)
    await button("reset");expect(episode.stage).toBe("Use")
    expect(episode.rewardCount).toBe(0)
  }
}
