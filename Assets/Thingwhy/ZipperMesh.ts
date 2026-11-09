import {inspectionOutline} from "./InspectionOutline"
import {styleText,zipperAccent,finishes} from "./ThingwhyStyle"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {ZipperMechanism} from "./ZipperMechanism"
import {ZipperGeometry} from "./ZipperGeometry"
import {ZipperSurfaces} from "./ZipperSurfaces"
import {ZipperPresentationMotion} from "./ZipperPresentationMotion"

@component
export class ZipperMesh extends BaseScriptComponent {
  @input @hint("Simple PBR template for shared zipper surfaces") material!: Material
  @input @hint("Authored reward anchor beside the teaching model") rewardRoot!: SceneObject

  public onPull = new Event<number>()
  private teeth: {object: SceneObject; side: number; y: number}[] = []
  private tapes: {object: SceneObject; side: number; y: number}[] = []
  private ribbons:{side:number;update:(path:(y:number)=>number)=>void}[]=[]
  private slider!: SceneObject
  private modelContent!: SceneObject
  private shell!: SceneObject
  private pull!: SceneObject
  private pullVisual!: SceneObject
  private channelRoot!: SceneObject
  private callouts: SceneObject[] = []
  private focus:SceneObject|null=null
  public inspectionMaterial:Material|null=null
  private rewardPull!: SceneObject
  private rewardParts: {object: SceneObject; side: number; y: number}[] = []
  private interaction!: Interactable
  private mechanism: ZipperMechanism | null = null
  private grabbing = false
  private acceptingPull = true
  private rewardProgress = 0
  private cutaway = false
  private inspectionStep = 0
  private motion=new ZipperPresentationMotion()
  private geometry!:ZipperGeometry
  private surfaces!:ZipperSurfaces

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.build())
    this.createEvent("UpdateEvent").bind(() => {
      if(!this.mechanism||!this.shell||!this.acceptingPull)return
      this.motion.update(this.mechanism,getDeltaTime(),false)
      this.renderShell()
    })
  }

  private build(): void {
    if (!this.material || !this.rewardRoot) throw new Error("ZipperMesh requires material and rewardRoot")
    this.surfaces=new ZipperSurfaces(this.material)
    this.geometry=new ZipperGeometry(this.surfaces)
    this.modelContent=this.node(this.sceneObject,"Full size zipper")
    const left = finishes.water
    const right = finishes.amber
    for (let side = -1; side <= 1; side += 2) {
      const fabric=side===-1?new vec4(.07,.31,.59,1):new vec4(.57,.29,.08,1)
      this.ribbons.push({side,update:this.geometry.tape(this.modelContent,"Tape ribbon",fabric)})
      for (let i = 0; i < 16; i++) {
        const y = -10.5 + i * 1.35 + (side === 1 ? 0.675 : 0)
        const tooth = this.node(this.modelContent, (side === -1 ? "Blue" : "Amber") + " tooth " + i)
        // Staggered angular head + narrower neck: simplified interlocking elements.
        this.box(tooth, "Neck", side * 0.9, 0, 0, 1.8, 0.42, 0.65, side === -1 ? left : right)
        this.box(tooth, "Head", -side * 0.35, 0, 0.03, 0.9, 0.56, 0.75, side === -1 ? left : right)
        this.teeth.push({object: tooth, side, y})
        const tape=this.node(this.modelContent,"Tape stitch")
        const thread=side===-1?new vec4(0.45,0.72,0.83,1):new vec4(0.83,0.6,0.37,1)
        this.box(tape,"Tape thread",side*1.15,0,0.1,0.07,0.3,0.025,thread)
        this.tapes.push({object: tape, side, y})
      }
    }
    this.box(this.modelContent, "Bottom stop", 0, -12, -0.2, 6, 0.7, 0.8, new vec4(0.8, 0.9, 1, 1))
    for(const side of [-1,1])this.box(this.modelContent,"Top stop",side*4.9,11.8,-0.2,1.2,0.7,0.8,new vec4(0.8,0.9,1,1))
    this.slider = this.node(this.modelContent, "Slider Y channel")
    this.housing(this.slider, "Back plate", -0.7, new vec4(0.24, 0.34, 0.43, 1))
    this.channelRoot = this.node(this.slider, "Y tunnel cutaway")
    // Fixed center diamond spreads the chain into two branches above the slider.
    const diamond = this.box(this.channelRoot, "Diamond separator", 0, 0.8, 0, 1.2, 1.2, 1, new vec4(0.95, 0.98, 1, 1))
    diamond.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, Math.PI / 4))
    for (const side of [-1, 1]) {
      const rail = this.box(this.channelRoot, "Outer channel rail", side * 4.4, 0, 0, 0.3, 5.2, 1, new vec4(0.8, 0.9, 1, 1))
      rail.getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, -side * 0.39))
    }
    this.shell = this.housing(this.slider, "Teaching shell", 0.8, finishes.steel)
    this.box(this.shell, "Wide mouth marker", 0, 1.65, 0.3, 4.8, 0.3, 0.3, new vec4(0.3, 1, 0.6, 1))
    this.pull = this.node(this.slider, "Zipper Pull")
    this.pull.getTransform().setLocalPosition(new vec3(0, -0.8, 1.7))
    this.pullVisual=this.node(this.pull,"Pull highlight")
    this.box(this.pullVisual,"Pull grip marker",0,-1.95,.33,1.55,.17,.08,finishes.water)
    this.box(this.pullVisual, "Pull top", 0, 0.5, 0, 2.7, 0.5, 0.5, new vec4(0.95, 0.98, 1, 1))
    this.box(this.pullVisual, "Pull bottom", 0, -2, 0, 2.7, 0.5, 0.5, new vec4(0.95, 0.98, 1, 1))
    for (const x of [-1.1, 1.1]) this.box(this.pullVisual, "Pull side", x, -0.75, 0, 0.5, 2.8, 0.5, new vec4(0.95, 0.98, 1, 1))
    this.callouts = [
      this.label(this.pull, "Pull tab", 3.8, .1),
      this.label(this.slider, "Slider", -3.5, 1.1),
      this.label(this.channelRoot, "Guide channels", 4.65, 2.6),
      this.label(this.teeth[2].object, "Interlocking teeth", 4.1, .5)
    ]
    for (const callout of this.callouts) callout.enabled = false
    const collider = this.pull.createComponent("Physics.ColliderComponent") as ColliderComponent
    collider.fitVisual=false
    const shape = Shape.createBoxShape()
    shape.size = new vec3(4.4, 5.5, 0.5)
    collider.shape = shape
    this.interaction = this.pull.createComponent(Interactable.getTypeName()) as Interactable
    this.interaction.enableInstantDrag=true
    this.interaction.targetingMode=TargetingMode.All
    this.interaction.onTriggerStart.add(() => { this.grabbing = this.acceptingPull })
    this.interaction.onDragUpdate.add(event => {
      if (this.grabbing && this.acceptingPull) {
        const local = this.sceneObject.getTransform().getInvertedWorldTransform().multiplyDirection(event.dragVector)
        this.onPull.invoke(local.y / 22)
      }
    })
    const release = () => { this.grabbing = false }
    this.interaction.onTriggerEnd.add(release)
    this.interaction.onTriggerCanceled.add(release)
    this.interaction.onHoverEnter.add(() => this.pullVisual.getTransform().setLocalScale(new vec3(1.1, 1.1, 1.1)))
    this.interaction.onHoverExit.add(() => this.pullVisual.getTransform().setLocalScale(vec3.one()))
    this.buildReward(left, right)
    this.rewardRoot.enabled = false
    print("Zipper visuals: "+this.geometry.meshCount+" shared meshes, "+this.surfaces.count+" shared surfaces")
    if (this.mechanism) this.render(this.mechanism, this.cutaway, this.inspectionStep)
  }

  public setInputEnabled(enabled: boolean): void {
    this.acceptingPull = enabled
    if (!enabled) this.grabbing = false
  }

  public render(mechanism: ZipperMechanism, cutaway: boolean, inspectionStep: number): void {
    this.mechanism = mechanism
    this.cutaway = cutaway
    this.inspectionStep = inspectionStep
    if (!this.slider) return
    if(mechanism.assembled&&!cutaway&&mechanism.progress===0)this.motion.reset()
    this.slider.getTransform().setLocalPosition(new vec3(0, mechanism.sliderY, 0.6))
    for (const part of this.teeth) part.object.getTransform().setLocalPosition(new vec3(part.side * mechanism.rowOffset(part.y), part.y, 0))
    for (const part of this.tapes) part.object.getTransform().setLocalPosition(new vec3(part.side * (mechanism.rowOffset(part.y) + 2.7), part.y, -0.5))
    for(const ribbon of this.ribbons)ribbon.update(y=>ribbon.side*(mechanism.rowOffset(y)+2.7))
    this.renderShell()
    this.channelRoot.enabled = true
    this.pull.enabled = mechanism.assembled
    const assembled=mechanism.assembled
    this.callouts[0].enabled=assembled&&!cutaway
    this.callouts[1].enabled=assembled&&!cutaway
    this.callouts[2].enabled=assembled&&inspectionStep===1
    this.callouts[3].enabled=assembled&&inspectionStep===2
  }

  public showInspectionFocus(show:boolean):void {
    if(!this.slider)return
    if(show&&!this.focus&&this.inspectionMaterial)
      this.focus=inspectionOutline(this.slider,this.inspectionMaterial,zipperAccent,0,0,2.4,10.1,4.9)
    if(this.focus)this.focus.enabled=show
  }

  private renderShell():void {
    if(!this.mechanism)return
    this.shell.enabled=!this.cutaway||!this.mechanism.assembled
    this.shell.getTransform().setLocalPosition(this.motion.position)
    this.shell.getTransform().setLocalRotation(this.motion.rotation)
  }

  public showReward(show: boolean,focusReward=show): void {
    this.rewardRoot.enabled = show&&focusReward
    if(this.modelContent)this.modelContent.enabled=!focusReward
    if(!show&&this.rewardPull){this.rewardProgress=0;this.renderReward()}
  }

  private buildReward(left: vec4, right: vec4): void {
    for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
      const y = -2.4 + i * 0.65 + (side === 1 ? 0.325 : 0)
      const object = this.box(this.rewardRoot, "Mini tooth", 0, y, 0, 0.9, 0.25, 0.3, side === -1 ? left : right)
      this.rewardParts.push({object, side, y})
    }
    this.rewardPull = this.node(this.rewardRoot, "Miniature Pull")
    const miniShell=this.housing(this.rewardPull,"Mini slider",0.4,new vec4(0.8,0.95,1,1))
    miniShell.getTransform().setLocalScale(new vec3(0.23,0.32,0.6))
    const silver=new vec4(0.95,0.98,1,1)
    this.box(this.rewardPull,"Mini pull top",0,-0.3,0.8,0.9,0.18,0.18,silver)
    this.box(this.rewardPull,"Mini pull bottom",0,-1.2,0.8,0.9,0.18,0.18,silver)
    for(const side of [-1,1])this.box(this.rewardPull,"Mini pull side",side*0.36,-0.75,0.8,0.18,1.08,0.18,silver)
    const collider = this.rewardPull.createComponent("Physics.ColliderComponent") as ColliderComponent
    collider.fitVisual=false
    const shape = Shape.createBoxShape(); shape.size = new vec3(4, 4, 0.5); collider.shape = shape
    const interaction = this.rewardPull.createComponent(Interactable.getTypeName()) as Interactable
    interaction.enableInstantDrag=true
    interaction.targetingMode=TargetingMode.All
    interaction.onDragUpdate.add(event => {
      if (!this.acceptingPull) return
      const local = this.rewardRoot.getTransform().getInvertedWorldTransform().multiplyDirection(event.dragVector)
      this.rewardProgress = Math.max(0, Math.min(1, this.rewardProgress + local.y / 5))
      this.renderReward()
    })
    this.renderReward()
  }

  private renderReward(): void {
    const sliderY = -2.5 + this.rewardProgress * 5
    this.rewardPull.getTransform().setLocalPosition(new vec3(0, sliderY, 0))
    for (const part of this.rewardParts) {
      const spread = Math.max(0, Math.min(1, (part.y - sliderY + 0.5)))
      part.object.getTransform().setLocalPosition(new vec3(part.side * (0.4 + spread * 1.2), part.y, 0))
    }
  }

  private label(parent:SceneObject,value:string,x:number,y:number):SceneObject {
    const label=this.node(parent,value+" callout")
    label.getTransform().setLocalPosition(new vec3(x,y,2.5))
    const text=label.createComponent("Component.Text") as Text
    text.text=value
    styleText(text,"part",zipperAccent)
    const line=this.box(label,"Leader",-x/2,-y/2,-.4,Math.sqrt(x*x+y*y),.035,.035,new vec4(.7,.96,1,1))
    line.getTransform().setLocalRotation(quat.fromEulerAngles(0,0,Math.atan2(y,x)))
    return label
  }

  private node(parent: SceneObject, name: string): SceneObject {
    const node = global.scene.createSceneObject(name); node.setParent(parent); return node
  }

  private housing(parent:SceneObject,name:string,z:number,color:vec4):SceneObject {
    return this.geometry.housing(parent,name,z,color)
  }

  private box(parent:SceneObject,name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:vec4):SceneObject {
    return this.geometry.box(parent,name,x,y,z,w,h,d,color)
  }
}
