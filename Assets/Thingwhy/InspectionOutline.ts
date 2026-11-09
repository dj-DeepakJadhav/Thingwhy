/** A sharp unlit edge plus a low-energy additive band around the active part. */
export function inspectionOutline(parent:SceneObject,material:Material,color:vec4,x:number,y:number,z:number,width:number,height:number):SceneObject {
  const object=global.scene.createSceneObject("Inspection focus")
  object.setParent(parent)
  object.getTransform().setLocalPosition(new vec3(x,y,z))

  const addBand=(offset:number,thickness:number,tint:vec4,additive:boolean)=>{
    const builder=new MeshBuilder([{name:"position",components:3},{name:"normal",components:3,normalized:true}])
    builder.topology=MeshTopology.Triangles
    builder.indexType=MeshIndexType.UInt16
    const vertices:number[]=[],indices:number[]=[]
    const count=32
    for(let i=0;i<=count;i++){
      const angle=2*Math.PI*i/count,cos=Math.cos(angle),sin=Math.sin(angle)
      for(const inset of [offset,offset+thickness])vertices.push(cos*(width/2-inset),sin*(height/2-inset),0,0,0,1)
      if(i<count){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}
    }
    builder.appendVerticesInterleaved(vertices)
    builder.appendIndices(indices)
    builder.updateMesh()
    const band=global.scene.createSceneObject(additive?"Additive edge":"Sharp edge")
    band.setParent(object)
    band.getTransform().setLocalPosition(new vec3(0,0,additive?-.012:0))
    const surface=material.clone()
    surface.mainPass.baseColor=tint
    if(additive){
      surface.mainPass.blendMode=BlendMode.Add
      surface.mainPass.depthWrite=false
    }
    const visual=band.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh=builder.getMesh()
    visual.mainMaterial=surface
  }

  addBand(-.11,.24,new vec4(color.x*.13,color.y*.13,color.z*.13,1),true)
  addBand(0,.065,color,false)
  object.enabled=false
  return object
}
