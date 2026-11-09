import {ZipperSurfaces} from "./ZipperSurfaces"

type Point=[number,number]

/** Lens-native solid extrusion. Outline-normal bevel inset adapted from Anatomy
 * kit/iso-kit.mjs (MIT, Copyright 2026 Ryan). See REFERENCE-NOTICES.md.
 * No SVG projection or browser rendering code is used.
 */
export class ZipperGeometry {
  private meshes=new Map<string,RenderMesh>()

  constructor(private surfaces:ZipperSurfaces){}

  public box(parent:SceneObject,name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:vec4):SceneObject {
    const isTooth=name==="Neck"||name==="Head"||name==="Mini tooth"
    const bevel=isTooth?Math.min(0.09,h*0.18):name.indexOf("Tape")>=0?0:Math.min(0.07,w*0.15,h*0.15,d*0.25)
    const X=w/2,Y=h/2
    const radius=isTooth?Math.min(X,Y)*(name==="Head"?0.85:0.45):bevel*1.5
    const ring:Point[]=radius>0?this.roundedProfile(w,h,radius):[[-X,-Y],[X,-Y],[X,Y],[-X,Y]]
    return this.part(parent,name,new vec3(x,y,z),this.extrude(ring,d,bevel),color)
  }

  public housing(parent:SceneObject,name:string,z:number,color:vec4):SceneObject {
    const ring:Point[]=[[-3.3,-2.4],[3.3,-2.4],[3.8,-2],[6.1,1.8],[5.7,2.4],[-5.7,2.4],[-6.1,1.8],[-3.8,-2]]
    return this.part(parent,name,new vec3(0,0,z),this.extrude(ring,0.45,0.16),color)
  }

  public get meshCount():number{return this.meshes.size}

  /** Adapted from Anatomy's roundedPlan: model-space arcs, not SVG paths. */
  private roundedProfile(w:number,h:number,r:number):Point[] {
    const corners=[
      [w/2-r,-h/2+r,-90],[w/2-r,h/2-r,0],
      [-w/2+r,h/2-r,90],[-w/2+r,-h/2+r,180]
    ]
    const result:Point[]=[]
    for(const [x,y,start] of corners)for(let step=0;step<=3;step++){
      const angle=(start+90*step/3)*Math.PI/180
      result.push([x+r*Math.cos(angle),y+r*Math.sin(angle)])
    }
    return result
  }

  /** One continuous rigid teaching ribbon, sampled from the same tooth-row path.
   * Updating its linked builder avoids stacked tiles and gaps during travel.
   */
  public tape(parent:SceneObject,name:string,color:vec4):((path:(y:number)=>number)=>void) {
    const builder=new MeshBuilder([{name:"position",components:3},{name:"normal",components:3,normalized:true}])
    builder.topology=MeshTopology.Triangles;builder.indexType=MeshIndexType.UInt16
    const rows=65,vertices:number[]=[],indices:number[]=[]
    for(let row=0;row<rows;row++)for(let vertex=0;vertex<8;vertex++)vertices.push(0,0,0,0,0,1)
    for(let row=0;row<rows-1;row++){
      const a=row*8,b=a+8
      indices.push(a,a+1,b+1,a,b+1,b)
      indices.push(a+2,b+3,a+3,a+2,b+2,b+3)
      indices.push(a+4,b+5,a+5,a+4,b+4,b+5)
      indices.push(a+6,a+7,b+7,a+6,b+7,b+6)
    }
    builder.appendVerticesInterleaved(vertices);builder.appendIndices(indices)
    const data=[
      [0,0,-0.42,0,0,1],[0,0,-0.42,0,0,1],
      [0,0,-0.58,0,0,-1],[0,0,-0.58,0,0,-1],
      [0,0,-0.42,-1,0,0],[0,0,-0.58,-1,0,0],
      [0,0,-0.42,1,0,0],[0,0,-0.58,1,0,0]
    ]
    const update=(path:(y:number)=>number)=>{
      for(let row=0;row<rows;row++){
        const y=-11.2+row*22.4/(rows-1),center=path(y),L=center-1.6,R=center+1.6
        for(let vertex=0;vertex<8;vertex++){
          data[vertex][0]=vertex===0||vertex===2||vertex===4||vertex===5?L:R
          data[vertex][1]=y
          builder.setVertexInterleaved(row*8+vertex,data[vertex])
        }
      }
      builder.updateMesh()
    }
    update(()=>0)
    this.part(parent,name,vec3.zero(),builder.getMesh(),color)
    return update
  }

  private part(parent:SceneObject,name:string,position:vec3,mesh:RenderMesh,color:vec4):SceneObject {
    const object=global.scene.createSceneObject(name);object.setParent(parent)
    object.getTransform().setLocalPosition(position)
    const visual=object.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    visual.mesh=mesh;visual.mainMaterial=this.surfaces.forPart(name,color)
    return object
  }

  /** Convex CCW outlines only: capped back, side walls, inset bevel, front cap. */
  private extrude(ring:Point[],depth:number,bevel:number):RenderMesh {
    const key=JSON.stringify([ring,depth,bevel])
    const existing=this.meshes.get(key)
    if(existing)return existing
    const normals=ring.map(([ax,ay],i)=>{
      const [bx,by]=ring[(i+1)%ring.length],dx=bx-ax,dy=by-ay
      const length=Math.hypot(dx,dy)
      return [dy/length,-dx/length]
    })
    // Ported from Anatomy's adjacent outline-normal inset, in model coordinates.
    const inset=ring.map(([x,y],i)=>{
      const a=normals[(i+ring.length-1)%ring.length],b=normals[i]
      const mx=a[0]+b[0],my=a[1]+b[1],length=Math.hypot(mx,my)
      return [x-mx/length*bevel,y-my/length*bevel]
    })
    const vertices:number[]=[],indices:number[]=[]
    const triangle=(a:number[],b:number[],c:number[])=>{
      const normal=new vec3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).cross(new vec3(c[0]-a[0],c[1]-a[1],c[2]-a[2])).normalize()
      const start=vertices.length/6
      for(const point of [a,b,c])vertices.push(...point,normal.x,normal.y,normal.z)
      indices.push(start,start+1,start+2)
    }
    const Z=depth/2
    for(let i=0;i<ring.length;i++){
      const next=(i+1)%ring.length,a=ring[i],b=ring[next]
      const backA=[...a,-Z],backB=[...b,-Z],edgeA=[...a,Z-bevel],edgeB=[...b,Z-bevel]
      const frontA=[...inset[i],Z],frontB=[...inset[next],Z]
      triangle([0,0,-Z],backB,backA)
      triangle(backA,backB,edgeB);triangle(backA,edgeB,edgeA)
      if(bevel>0){triangle(edgeA,edgeB,frontB);triangle(edgeA,frontB,frontA)}
      triangle([0,0,Z],frontA,frontB)
    }
    const builder=new MeshBuilder([{name:"position",components:3},{name:"normal",components:3,normalized:true}])
    builder.topology=MeshTopology.Triangles;builder.indexType=MeshIndexType.UInt16
    builder.appendVerticesInterleaved(vertices);builder.appendIndices(indices);builder.updateMesh()
    const mesh=builder.getMesh();this.meshes.set(key,mesh)
    return mesh
  }
}
