import {Workbench,WorkbenchObject} from "./Workbench"
import {SprayEpisode} from "./SprayEpisode"
import {EarbudUI} from "./EarbudUI"
import {EarbudEpisode} from "./EarbudEpisode"
import {ZipperEpisode} from "./ZipperEpisode"
import {PenEpisode} from "./PenEpisode"

type EpisodeId=WorkbenchObject

/** Each episode owns its state; switching leaves it paused. */
@component
export class EpisodeSelector extends BaseScriptComponent {
  @input picker!:EarbudUI
  @input zipperRoot!:SceneObject
  @input earbudsRoot!:SceneObject
  @input zipper!:ZipperEpisode
  @input earbuds!:EarbudEpisode
  public current:EpisodeId="earbuds"
  public pen!:PenEpisode
  public spray!:SprayEpisode
  private workbench!:Workbench
  private ready=false
  private booted=false

  onAwake():void {
    this.createEvent("OnStartEvent").bind(()=>{
      if(!this.picker||!this.zipperRoot||!this.earbudsRoot||!this.zipper||!this.earbuds)throw new Error("EpisodeSelector inputs required")
      const root=global.scene.createSceneObject("Thingwhy Pen")
      this.pen=new PenEpisode(root,this.earbuds.cameraObject,this.earbuds.view.material,this.earbuds.view.traceMaterial)
      root.enabled=false
      const sprayRoot=global.scene.createSceneObject("Thingwhy Spray")
      this.spray=new SprayEpisode(sprayRoot,this.earbuds.cameraObject,this.earbuds.view.material,this.earbuds.view.traceMaterial)
      sprayRoot.enabled=false
      const unlit=this.earbuds.view.traceMaterial
      this.zipper.mesh.inspectionMaterial=unlit
      this.zipper.ui.replayMaterial=unlit
      this.earbuds.ui.replayMaterial=unlit
      this.workbench=new Workbench(this.sceneObject,this.earbuds.view.material,unlit,
        id=>this.select(id),show=>{if(this.ready)this.activeRoot().enabled=!show})
      this.ready=true
    })
    this.createEvent("LateUpdateEvent").bind(()=>{
      if(!this.ready)return
      // Authored roots must complete startup before the outgoing one is disabled.
      if(!this.booted){this.select("earbuds");this.booted=true}
      this.workbench.update(getDeltaTime())
      this.pen.update(getDeltaTime())
      this.spray.update(getDeltaTime())
      if(this.zipper.rewardCount)this.workbench.mark("zipper")
      if(this.earbuds.rewardCount)this.workbench.mark("earbuds")
      if(this.pen.rewardCount)this.workbench.mark("pen")
      if(this.spray.rewardCount)this.workbench.mark("spray")
      const root=this.activeRoot().getTransform()
      this.sceneObject.getTransform().setWorldPosition(root.getWorldPosition().add(root.getWorldRotation().multiplyVec3(new vec3(0,this.workbench.trayOpen?6.2:14.8,1))))
      this.sceneObject.getTransform().setWorldRotation(root.getWorldRotation())
    })
  }

  private activeRoot():SceneObject {
    switch(this.current){
      case "zipper":return this.zipperRoot
      case "earbuds":return this.earbudsRoot
      case "pen":return this.pen.root
      case "spray":return this.spray.root
    }
  }

  public select(next:EpisodeId):void {
    if(next!=="zipper"&&!this.zipper.paused)this.zipper.act("pause")
    if(next!=="earbuds")this.earbuds.setPaused(true)
    if(next!=="pen"&&this.current==="pen")this.pen.setPaused(true)
    this.zipperRoot.enabled=next==="zipper"
    this.earbudsRoot.enabled=next==="earbuds"
    this.pen.root.enabled=next==="pen"
    if(next!=="spray"&&this.current==="spray")this.spray.setPaused(true)
    this.spray.root.enabled=next==="spray"
    this.current=next
    if(this.workbench.overlayOpen)this.activeRoot().enabled=false
  }
}
