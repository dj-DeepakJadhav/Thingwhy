import {styleText} from "./ThingwhyStyle"

type Point=[number,number]

/** Flattened Lucide play and square outlines, in their original 24-unit view box. */
const play:Point[]=[[5,5],[5.27,4],[6,3.27],[7,3],[8,3.27],[20,10.27],[20.73,11],[21,12],[20.73,13],[20,13.73],[8,20.73],[7,21],[6,20.73],[5.27,20],[5,19]]
const square:Point[]=[[5,3],[19,3],[20.4,3.6],[21,5],[21,19],[20.4,20.4],[19,21],[5,21],[3.6,20.4],[3,19],[3,5],[3.6,3.6]]

export class ReplayControl {
  private readonly playIcon:SceneObject
  private readonly stopIcon:SceneObject

  constructor(private readonly label:Text,material:Material){
    const transform=label.getSceneObject().getTransform()
    const position=transform.getLocalPosition()
    transform.setLocalPosition(new vec3(position.x+.38,position.y,position.z))
    styleText(label,"button")
    const parent=label.getSceneObject().getParent()
    this.playIcon=this.icon(parent,"Lucide play",play,material,position.z+.06)
    this.stopIcon=this.icon(parent,"Lucide square",square,material,position.z+.06)
  }

  present(active:boolean):void {
    this.playIcon.enabled=!active
    this.stopIcon.enabled=active
    this.label.text=active?"Live":"Replay"
  }

  private icon(parent:SceneObject,name:string,path:Point[],material:Material,z:number):SceneObject {
    const object=global.scene.createSceneObject(name)
    object.setParent(parent)
    object.getTransform().setLocalPosition(new vec3(-1.03,0,z))
    const builder=new MeshBuilder([{name:"position",components:3},{name:"normal",components:3,normalized:true}])
    builder.topology=MeshTopology.Triangles
    builder.indexType=MeshIndexType.UInt16
    const vertices:number[]=[],indices:number[]=[]
    for(let i=0;i<path.length;i++){
      const [ax,ay]=path[i],[bx,by]=path[(i+1)%path.length]
      const dx=bx-ax,dy=by-ay,length=Math.sqrt(dx*dx+dy*dy)
      const nx=-dy/length,ny=dx/length
      for(const [x,y] of [[ax+nx,ay+ny],[ax-nx,ay-ny],[bx+nx,by+ny],[bx-nx,by-ny]]){
        vertices.push((x-12)*.039,(12-y)*.039,0,0,0,1)
      }
      const a=i*4
      indices.push(a,a+1,a+2,a+2,a+1,a+3)
    }
    builder.appendVerticesInterleaved(vertices)
    builder.appendIndices(indices)
    builder.updateMesh()
    const surface=material.clone()
    surface.mainPass.baseColor=new vec4(.96,.98,1,1)
    surface.mainPass.twoSided=true
    const visual=object.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh=builder.getMesh();visual.mainMaterial=surface
    return object
  }
}
