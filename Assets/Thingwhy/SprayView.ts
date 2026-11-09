import {EarbudGeometry} from "./EarbudGeometry"
import {inspectionOutline} from "./InspectionOutline"
import {styleText,sprayAccent,finishes} from "./ThingwhyStyle"
import {ZipperGeometry} from "./ZipperGeometry"
import {ZipperSurfaces} from "./ZipperSurfaces"

const shellColor=finishes.coral
const silver=finishes.steel
const liquid=finishes.water

export class SprayView {
  private readonly shapes:EarbudGeometry
  private readonly solids:ZipperGeometry
  private readonly surfaces:ZipperSurfaces
  private readonly cover:SceneObject
  private readonly trigger:SceneObject
  private readonly piston:SceneObject
  private readonly valve:SceneObject
  private readonly dipTube:SceneObject
  private readonly blockage:SceneObject
  private readonly chamber:SceneObject
  private readonly focus:SceneObject
  private readonly labels:SceneObject[]
  private readonly drops:SceneObject[]=[]

  constructor(readonly root:SceneObject,material:Material,unlit:Material){
    this.shapes=new EarbudGeometry(material,unlit)
    this.surfaces=new ZipperSurfaces(material)
    this.solids=new ZipperGeometry(this.surfaces)
    this.makeBottle(root)
    this.shapes.stem(root,"Threaded collar",new vec3(0,.65,0),1.05,1.3,shellColor)
    for(const y of [.33,.63,.93])this.shapes.ring(root,"Collar ridge",new vec3(0,y,0),1,.065,silver)
      .getTransform().setLocalRotation(quat.fromEulerAngles(Math.PI/2,0,0))
    this.shapes.housing(root,"Rounded pump housing",new vec3(-.1,2.68,0),shellColor)
      .getTransform().setLocalScale(new vec3(1.05,.61,.72))
    this.box(root,"Pump neck bridge",.08,1.62,0,1.6,.72,1.16,shellColor)
    this.shapes.stem(root,"Nozzle cap",new vec3(-2.29,2.8,0),.56,1.18,silver)
      .getTransform().setLocalRotation(quat.fromEulerAngles(0,0,Math.PI/2))
    this.shapes.ring(root,"Nozzle ring",new vec3(-2.88,2.8,0),.32,.07,shellColor)
      .getTransform().setLocalRotation(quat.fromEulerAngles(0,Math.PI/2,0))
    this.trigger=this.shapes.node(root,"Trigger pivot",new vec3(-1.58,2.1,.62))
    const lever=this.shapes.stem(this.trigger,"Trigger lever",new vec3(-.42,-1.1,0),.27,2.45,shellColor)
    lever.getTransform().setLocalRotation(quat.fromEulerAngles(0,0,-.33))
    this.shapes.oval(this.trigger,"Trigger grip mark",new vec3(-.48,-1.42,.26),new vec3(.11,.34,.035),sprayAccent,true)
    this.cover=this.shapes.node(root,"Lift-away pump cover",new vec3(0,0,0))
    this.shapes.housing(this.cover,"Rounded lift-away cover",new vec3(-.1,2.68,.68),new vec4(.97,.40,.26,1))
      .getTransform().setLocalScale(new vec3(1.03,.60,.25))
    this.chamber=this.box(root,"Liquid in pump chamber",-.73,2.7,.73,1.6,.5,.38,liquid)
    this.piston=this.box(root,"Piston",.7,2.7,.92,1.36,.42,.3,silver)
    this.dipTube=this.box(root,"Dip tube",.2,-1.4,1.02,.13,6.2,.14,liquid)
    this.valve=this.shapes.oval(root,"Inlet valve",new vec3(.2,1.35,1.05),new vec3(.29,.29,.16),silver)
    this.blockage=this.box(root,"Modeled inlet obstruction",.2,.95,1.2,.48,.27,.24,new vec4(1,.32,.23,1))
    this.focus=inspectionOutline(root,unlit,sprayAccent,0,2.7,1.2,4.2,1.35)
    this.labels=[
      this.label("Trigger",-2.5,-.7),this.label("Piston",1.6,3.45),
      this.label("Inlet valve",2.48,1.52),this.label("Dip tube",1.75,-2.45)
    ]
    for(let i=0;i<12;i++)this.drops.push(this.shapes.oval(root,"Flow marker",vec3.zero(),new vec3(.115,.115,.115),liquid,true))
  }

  show(pressed:boolean,primed:boolean,blocked:boolean,reveal:number,flow:"spray"|"refill"|"none",phase:number,focus:boolean):void {
    this.trigger.getTransform().setLocalRotation(quat.fromEulerAngles(0,0,pressed?.36:0))
    this.piston.getTransform().setLocalPosition(new vec3(pressed?.22:.7,2.7,.92))
    this.cover.getTransform().setLocalPosition(new vec3(0,reveal>0?1.9:0,reveal>0?.18:0))
    this.chamber.enabled=reveal>0&&primed
    this.valve.enabled=reveal>0
    this.piston.enabled=reveal>0
    this.dipTube.enabled=reveal>0
    this.valve.getTransform().setLocalPosition(new vec3(.2,pressed?1.35:1.53,1.05))
    this.blockage.enabled=reveal>0&&blocked
    this.focus.enabled=focus&&reveal>0
    this.focus.getTransform().setLocalPosition(new vec3(0,pressed?2.7:1.38,1.24))
    this.focus.getTransform().setLocalScale(new vec3(pressed?1:.36,pressed?1:.66,1))
    this.labels[0].enabled=reveal===0
    this.labels[1].enabled=reveal===1
    this.labels[2].enabled=reveal===2
    this.labels[3].enabled=reveal===2
    for(let i=0;i<this.drops.length;i++){
      const dot=this.drops[i]
      dot.enabled=flow==="spray"||(flow==="refill"&&reveal>0)
      if(!dot.enabled)continue
      const t=(phase+i/this.drops.length)%1
      const position=flow==="spray"
        ?new vec3(-2.95-t*3.3,2.8+((i%5)-2)*t*.27,1.1+((i%3)-1)*t*.24)
        :new vec3(.2,-4.5+t*6.85,1.21)
      dot.getTransform().setLocalPosition(position)
    }
  }

  private makeBottle(parent:SceneObject):void {
    // Bottom to neck. The first ring closes the flat base.
    const profile=[[-6.05,0],[-6.05,1.56],[-5.92,1.84],[-5.64,1.99],
      [-4.85,2.06],[-3.5,2.08],[-2.15,1.98],[-1.28,1.78],
      [-.65,1.38],[-.25,.9],[.12,.72],[.54,.72]]
    const steps=40,vertices:number[]=[],indices:number[]=[]
    for(let row=0;row<profile.length;row++){
      const [y,radius]=profile[row]
      const before=profile[Math.max(0,row-1)],after=profile[Math.min(profile.length-1,row+1)]
      const dy=after[0]-before[0],dr=after[1]-before[1]
      for(let i=0;i<=steps;i++){
        const angle=2*Math.PI*i/steps
        const c=Math.cos(angle),s=Math.sin(angle)
        const x=Math.sign(c)*Math.pow(Math.abs(c),.83)
        const z=Math.sign(s)*Math.pow(Math.abs(s),.83)
        const nx=dy*c,nz=dy*s/.72,length=Math.sqrt(nx*nx+dr*dr+nz*nz)||1
        vertices.push(radius*x,y,radius*z*.72,nx/length,-dr/length,nz/length)
        if(row<profile.length-1&&i<steps){
          const a=row*(steps+1)+i,b=a+steps+1
          indices.push(a,b,a+1,a+1,b,b+1)
        }
      }
    }
    const builder=new MeshBuilder([{name:"position",components:3},{name:"normal",components:3,normalized:true}])
    builder.topology=MeshTopology.Triangles
    builder.indexType=MeshIndexType.UInt16
    builder.appendVerticesInterleaved(vertices)
    builder.appendIndices(indices)
    builder.updateMesh()
    const bottle=this.shapes.node(parent,"Shaped bottle reservoir")
    const visual=bottle.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    const material=this.surfaces.forPart("Bottle shell",finishes.ivory).clone()
    material.mainPass.metallic=0
    material.mainPass.roughness=.54
    visual.mesh=builder.getMesh();visual.mainMaterial=material
  }

  private label(value:string,x:number,y:number):SceneObject {
    const object=this.shapes.node(this.root,value+" label",new vec3(x,y,1.5))
    const text=object.createComponent("Component.Text") as Text
    text.text=value;styleText(text,"part",sprayAccent)
    return object
  }

  private box(parent:SceneObject,name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:vec4):SceneObject {
    return this.solids.box(parent,name,x,y,z,w,h,d,color)
  }
}
