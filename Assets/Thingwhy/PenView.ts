import {inspectionOutline} from "./InspectionOutline"
import {styleText,penAccent,finishes} from "./ThingwhyStyle"
import {EarbudGeometry} from "./EarbudGeometry"
import {ZipperGeometry} from "./ZipperGeometry"
import {ZipperSurfaces} from "./ZipperSurfaces"

export type PenPose={camIndex:number;pressed:boolean;assembled:boolean;camAligned:boolean;refillTravel:number}

type Part = { root: SceneObject; label: SceneObject }
const satin = finishes.cobalt
const silver = finishes.steel
const gold = finishes.amber
const ink = finishes.water

/** Enlarged teaching assembly with front barrel half that slides away in cutaway. */
export class PenView {
  private readonly shapes: EarbudGeometry
  private readonly solids: ZipperGeometry
  private readonly surfaces: ZipperSurfaces
  private readonly shell: SceneObject
  private readonly button: Part
  private readonly cam: Part
  private readonly refill: Part
  private readonly spring: Part
  private readonly barrelLabel: SceneObject
  private readonly camFocus:SceneObject
  private spread = 0
  private indexAngle = 0

  constructor(readonly root: SceneObject, material: Material, traceMaterial: Material) {
    this.shapes = new EarbudGeometry(material,traceMaterial)
    this.surfaces = new ZipperSurfaces(material)
    this.solids = new ZipperGeometry(this.surfaces)
    const barrel=this.shapes.node(root,"Pen barrel")
    this.halfBarrel(barrel,"Rear barrel",Math.PI)
    this.shell=this.shapes.node(barrel,"Removable barrel half")
    this.halfBarrel(this.shell,"Front barrel",0)
    this.barrelLabel=this.label(this.shell,"Barrel",0,1.65)
    this.button=this.part("Push button",-8.4,2.6)
    this.capsule(this.button.root,"Push cap",2.8,.72,gold)
    this.shapes.oval(this.button.root,"Cap grip mark",new vec3(-.44,0,.7),new vec3(.46,.11,.026),penAccent,true)
    this.cam=this.part("Rotary cam",-4,2.6)
    this.camFocus=inspectionOutline(root,traceMaterial,penAccent,-4,0,1.25,3.1,1.85)
    this.capsule(this.cam.root,"Cam hub",2.15,.48,gold)
    for(let i=0;i<4;i++){
      const tooth=this.shapes.node(this.cam.root,"Cam lug")
      tooth.getTransform().setLocalRotation(quat.fromEulerAngles(i*Math.PI/2,0,0))
      this.solids.box(tooth,"Cam lug",.35,.54,0,.86,.35,.36,gold)
    }
    this.refill=this.part("Ink refill",2.3,2.6)
    this.capsule(this.refill.root,"Refill tube",10,.32,ink)
    this.capsule(this.refill.root,"Ballpoint",1.1,.15,silver,5)
    this.spring=this.part("Return spring",5.5,-2.5)
    this.makeSpring(this.spring.root)
    this.halfBarrel(root,"Front nose",0,6.7,8.8,1.03,.22)
    this.halfBarrel(root,"Rear nose",Math.PI,6.7,8.8,1.03,.22)
    this.solids.box(this.shell,"Pocket clip",-5.45,1.13,.24,3.4,.17,.38,silver)
    const stops=this.shapes.node(root,"Alternating barrel stops")
    this.solids.box(stops,"Deep groove rail",-4.35,-.74,-.35,3.1,.22,.37,silver)
    this.solids.box(stops,"Shallow stop rail",-3.65,.74,-.35,1.7,.22,.37,silver)
  }

  present(model: PenPose, reveal: number, dt: number, replaying=false): void {
    const target=reveal>0?1:0
    this.spread+=Math.sign(target-this.spread)*Math.min(Math.abs(target-this.spread),dt*3)
    const turn=model.camIndex*Math.PI/4+(model.pressed?Math.PI/8:0)
    let delta=turn-this.indexAngle
    if(delta>Math.PI)delta-=2*Math.PI
    if(delta< -Math.PI)delta+=2*Math.PI
    this.indexAngle=(this.indexAngle+Math.sign(delta)*Math.min(Math.abs(delta),dt*7)+2*Math.PI)%(2*Math.PI)
    const travel=model.refillTravel*1.45
    const spread=this.spread
    this.shell.getTransform().setLocalPosition(new vec3(0,3.05*spread,1.2*spread))
    this.button.root.getTransform().setLocalPosition(new vec3(-8.4+(model.pressed?1.05:0),0,0))
    this.cam.root.getTransform().setLocalPosition(new vec3(-4+travel,model.assembled?0:2.0,0))
    this.cam.root.getTransform().setLocalRotation(quat.fromEulerAngles(model.assembled?this.indexAngle:model.camAligned?0:Math.PI/4,0,0))
    this.refill.root.getTransform().setLocalPosition(new vec3(2.3+travel,0,0))
    this.spring.root.getTransform().setLocalPosition(new vec3(5.5+travel*.4,0,0))
    this.spring.root.getTransform().setLocalScale(new vec3(1-travel*.2,1,1))
    this.cam.label.getTransform().setLocalPosition(new vec3(-4+travel,model.assembled?2.6:3.65,1.8))
    this.refill.label.getTransform().setLocalPosition(new vec3(2.3+travel,2.6,1.8))
    this.button.label.enabled=reveal<=1
    this.barrelLabel.enabled=reveal===1
    this.cam.label.enabled=reveal===2
    this.camFocus.enabled=reveal===2||replaying
    this.camFocus.getTransform().setLocalPosition(new vec3(-4+travel,model.assembled?0:2,1.25))
    this.refill.label.enabled=reveal===3
    this.spring.label.enabled=reveal===3
  }

  private part(name:string,x:number,labelY:number):Part {
    const root=this.shapes.node(this.root,name,new vec3(x,0,0))
    // Keep labels facing the viewer while the cam spins.
    const label=this.label(this.root,name,x,labelY)
    return {root,label}
  }

  private label(parent:SceneObject,name:string,x:number,y:number):SceneObject {
    const object=this.shapes.node(parent,name+" label",new vec3(x,y,1.8))
    const text=object.createComponent("Component.Text") as Text
    text.text=name
    styleText(text,"part",penAccent)
    const height=Math.abs(y)*.68
    this.solids.box(object,"Leader",0,-Math.sign(y)*height*.65,-.2,.045,height,.045,silver)
    return object
  }

  private capsule(parent:SceneObject,name:string,length:number,radius:number,color:vec4,x=0):void {
    const object=this.shapes.stem(parent,name,new vec3(x,0,0),radius,length,color)
    object.getTransform().setLocalRotation(quat.fromEulerAngles(0,0,Math.PI/2))
  }

  private halfBarrel(parent:SceneObject,name:string,start:number,left=-7.3,right=6.7,leftRadius=1.03,rightRadius=1.03):void {
    const builder=new MeshBuilder([{name:"position",components:3},{name:"normal",components:3,normalized:true}])
    builder.topology=MeshTopology.Triangles
    builder.indexType=MeshIndexType.UInt16
    const vertices:number[]=[], indices:number[]=[]
    for(let i=0;i<=20;i++){
      const angle=start+i*Math.PI/20,y=Math.cos(angle),z=Math.sin(angle)
      vertices.push(left,y*leftRadius,z*leftRadius,0,y,z,right,y*rightRadius,z*rightRadius,0,y,z)
      if(i<20){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}
    }
    builder.appendVerticesInterleaved(vertices)
    builder.appendIndices(indices)
    builder.updateMesh()
    const object=this.shapes.node(parent,name)
    const visual=object.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh=builder.getMesh()
    visual.mainMaterial=this.surfaces.forPart(name,satin)
  }

  private makeSpring(parent:SceneObject):void {
    const points=40, turns=5
    for(let i=0;i<points;i++){
      const a=i/points,b=(i+1)/points
      const point=(t:number)=>new vec3((t-.5)*2.7,.52*Math.cos(t*turns*2*Math.PI),.52*Math.sin(t*turns*2*Math.PI))
      const from=point(a),to=point(b),mid=from.add(to).uniformScale(.5)
      const wire=this.solids.box(parent,"Spring wire",mid.x,mid.y,mid.z,.08,.08,from.distance(to)*1.15,silver)
      wire.getTransform().setLocalRotation(quat.lookAt(to.sub(from).normalize(),vec3.up()))
    }
  }
}
