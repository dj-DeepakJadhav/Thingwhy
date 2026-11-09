import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {ScenarioConfig} from "Leaf.lspkg/Scenarios/scenario/ScenarioConfig"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {IKBodyInteractor} from "Leaf.lspkg/Interactors/interactor/ik/IKBodyInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName,sleep} from "Leaf.lspkg/Utils/common/Utils"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {EpisodeSelector} from "./EpisodeSelector"

@component
export class PenLeafScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void> {
    const mode=config?.get("mode")??"flow"
    const picker=findSceneObjectByName("Thingwhy Episodes")
    if(!picker)throw new Error("Episode picker missing")
    const selector=picker.getComponent(EpisodeSelector.getTypeName()) as EpisodeSelector
    if(!selector?.pen)throw new Error("Pen episode did not start")
    const pen=selector.pen
    const ik=mode==="hand-ray"?new IKBodyInteractor():null
    const fallback=ik?null:new DefaultLeafInteractor("Pen scenario hand")
    if(ik){await ik.ready;ik.left.isIndirect=()=>true;ik.right.isIndirect=()=>true}
    const tap=async(name:string):Promise<void>=>{
      if(name.indexOf("Episode ")===0&&!findInteractablesByName(name,undefined,true).length)await tap("Workbench tray")
      const target=findInteractablesByName(name,undefined,true)[0]
      if(!target)throw new Error("Missing enabled target: "+name)
      if(ik)await ik.trigger(target);else if(fallback)await fallback.trigger(target)
      await sleep(370)
    }
    const button=async(name:string)=>{
      if(name==="click"&&(pen.stage==="Use"||pen.stage==="Prove")){
        await tap("Pen cap target");return
      }
      if(["pause","reset","hint","recenter"].indexOf(name)>=0&&!findInteractablesByName("Pen "+name,undefined,true).length)
        await tap("Pen tools")
      await tap("Pen "+name)
    }
    await tap("Episode pen");await button("reset")
    expect(selector.current).toBe("pen")
    expect(pen.stage).toBe("Use")
    if(mode==="visual-use")return
    await button("click");expect(pen.model.extended).toBe(true)
    await button("click");expect(pen.stage).toBe("Predict")
    await button("click");expect(pen.model.extended).toBe(false)
    await button("b");await button("click");expect(pen.stage).toBe("Predict")
    await button("b");await button("click");expect(pen.stage).toBe("Investigate")
    await button("b");expect(pen.stage).toBe("Investigate")
    await button("a");expect(pen.reveal).toBe(1)
    if(mode==="visual-barrel")return
    await button("a");expect(pen.reveal).toBe(2)
    await button("click")
    if(mode==="visual-cam")return
    if(mode==="replay"||mode==="visual-replay"){
      const index=pen.model.camIndex,travel=pen.model.refillTravel
      await button("replay");expect(pen.replay.active).toBe(true)
      await sleep(680);await button("pause")
      expect(pen.replay.active).toBe(true)
      expect(pen.model.camIndex).toBe(index)
      expect(pen.model.refillTravel).toBe(travel)
      expect(pen.stage).toBe("Investigate")
      if(mode==="visual-replay")return
      await button("pause");await sleep(1000)
      expect(pen.replay.active).toBe(false)
      expect(pen.model.camIndex).toBe(index)
      return
    }
    await button("a");expect(pen.reveal).toBe(3)
    if(mode==="visual-spring")return
    await tap("Episode earbuds")
    expect(pen.paused).toBe(true)
    expect(findInteractablesByName("Pen click",undefined,true).length).toBe(0)
    await tap("Episode zipper")
    expect(selector.current).toBe("zipper")
    await tap("Episode pen")
    expect(pen.reveal).toBe(3)
    expect(pen.paused).toBe(true)
    await button("pause")
    await button("b");expect(pen.stage).toBe("Fix")
    await button("b");expect(pen.model.assembled).toBe(false)
    await button("a");await button("b");expect(pen.stage).toBe("Prove")
    await button("click");expect(pen.model.extended).toBe(true)
    expect(pen.rewardCount).toBe(0)
    await button("click");expect(pen.stage).toBe("Complete")
    expect(pen.rewardCount).toBe(1)
    await button("click");expect(pen.miniature.extended).toBe(true)
    expect(pen.rewardCount).toBe(1)
    await tap("Workbench notebook")
    expect(findSceneObjectByName("Field notebook")?.enabled).toBe(true)
    expect(pen.root.enabled).toBe(false)
    const notebookTitle=findSceneObjectByName("Field notebook label")?.getComponent("Component.Text") as Text
    expect(notebookTitle.text).toBe("Field notebook   1/4")
    if(mode==="visual-notebook")return
    await tap("Workbench notebook")
    expect(pen.root.enabled).toBe(true)
    await button("reset");expect(pen.rewardCount).toBe(0)
    expect(pen.reveal).toBe(0);expect(pen.stage).toBe("Use")
  }
}
