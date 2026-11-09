/** Rounded Lens-native parts and linked pressure ribbons; no browser renderer. */
export class EarbudGeometry {
  private sphere!:RenderMesh
  private rings=new Map<string,RenderMesh>()
  private surfaces=new Map<string,Material>()
  constructor(private material:Material,private traceMaterial:Material){
    if(!material?.mainPass||!traceMaterial?.mainPass)throw new Error("Earbud geometry requires live surface and trace passes")
    this.sphere=this.sphereMesh()
  }

  public node(parent:SceneObject,name:string,position=vec3.zero()):SceneObject {
    const object=global.scene.createSceneObject(name);object.setParent(parent)
    object.getTransform().setLocalPosition(position);return object
  }

  public oval(parent:SceneObject,name:string,position:vec3,scale:vec3,color:vec4,unlit=false):SceneObject {
    const object=this.part(parent,name,position,this.sphere,color,unlit)
    object.getTransform().setLocalScale(scale);return object
  }

  /** Soft rectangular product housing with an asymmetric shoulder, not a sphere. */
  public housing(parent:SceneObject,name:string,position:vec3,color:vec4):SceneObject {
    const vertices:number[]=[],indices:number[]=[],rows=28,columns=48,power=.82
    const signed=(v:number,p:number)=>Math.sign(v)*Math.pow(Math.abs(v),p)
    for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
      const theta=row*Math.PI/rows,phi=col*2*Math.PI/columns
      const sy=signed(Math.cos(theta),power),radial=Math.pow(Math.sin(theta),power)
      const sx=radial*signed(Math.cos(phi),power),sz=radial*signed(Math.sin(phi),power)
      const nx=signed(sx,2/power-1)/2.1,ny=signed(sy,2/power-1)/1.65,nz=signed(sz,2/power-1)/1.05
      const length=Math.sqrt(nx*nx+ny*ny+nz*nz)||1
      vertices.push(2.1*sx+.22*sy,1.65*sy,1.05*sz,nx/length,(ny-.22/1.65*nx)/length,nz/length)
    }
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const a=row*(columns+1)+col,b=a+columns+1
      indices.push(a,a+1,b+1,a,b+1,b)
    }
    return this.part(parent,name,position,this.mesh(vertices,indices),color)
  }

  public ring(parent:SceneObject,name:string,position:vec3,radius:number,tube:number,color:vec4):SceneObject {
    const key=radius+":"+tube
    let mesh=this.rings.get(key)
    if(!mesh){mesh=this.ringMesh(radius,tube);this.rings.set(key,mesh)}
    return this.part(parent,name,position,mesh,color)
  }

  /** Rounded constant-section stem, with short hemispherical end caps. */
  public stem(parent:SceneObject,name:string,position:vec3,radius:number,length:number,color:vec4):SceneObject {
    const vertices:number[]=[],indices:number[]=[],rows=24,columns=32
    const straight=length/2-radius
    for(let row=0;row<=rows;row++){
      const theta=row*Math.PI/rows,c=Math.cos(theta),s=Math.sin(theta)
      const y=radius*c+(c>=0?straight:-straight)
      for(let col=0;col<=columns;col++){
        const phi=col*2*Math.PI/columns,x=s*Math.cos(phi),z=s*Math.sin(phi)
        vertices.push(radius*x,y,radius*z,x,c,z)
      }
    }
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const a=row*(columns+1)+col,b=a+columns+1
      indices.push(a,a+1,b+1,a,b+1,b)
    }
    return this.part(parent,name,position,this.mesh(vertices,indices),color)
  }

  public trace(parent:SceneObject,name:string,y:number,color:vec4):((sample:(x:number)=>number)=>void) {
    const builder=new MeshBuilder([{name:"position",components:3},{name:"normal",components:3,normalized:true}])
    builder.topology=MeshTopology.Triangles;builder.indexType=MeshIndexType.UInt16
    const vertices:number[]=[],indices:number[]=[],count=96
    for(let i=0;i<count;i++){
      const x=-6+12*i/(count-1)
      vertices.push(x,y-.025,2,0,0,1,x,y+.025,2,0,0,1)
      if(i<count-1){const a=i*2,b=a+2;indices.push(a,b,b+1,a,b+1,a+1)}
    }
    builder.appendVerticesInterleaved(vertices);builder.appendIndices(indices);builder.updateMesh()
    this.part(parent,name,vec3.zero(),builder.getMesh(),color,true)
    const vertex=[0,0,2,0,0,1]
    return sample=>{
      for(let i=0;i<count;i++){
        const value=sample(i/(count-1))*0.8
        vertex[0]=-6+12*i/(count-1);vertex[1]=y+value-.025;builder.setVertexInterleaved(i*2,vertex)
        vertex[1]=y+value+.025;builder.setVertexInterleaved(i*2+1,vertex)
      }
      builder.updateMesh()
    }
  }

  private part(parent:SceneObject,name:string,position:vec3,mesh:RenderMesh,color:vec4,unlit=false):SceneObject {
    const object=this.node(parent,name,position)
    const visual=object.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    const key=[unlit,color.x,color.y,color.z,color.w].join(",")
    let surface=this.surfaces.get(key)
    if(!surface){
      surface=(unlit?this.traceMaterial:this.material).clone();surface.mainPass.baseColor=color
      if(!unlit){
        const metal=color.x>.5&&color.y>.4
        const silicone=color.x===.06&&color.y===.21
        surface.mainPass.roughness=metal ? .31 : silicone ? .88 : .53
        surface.mainPass.metallic=metal ? .52 : 0
      }
      this.surfaces.set(key,surface)
    }
    visual.mesh=mesh;visual.mainMaterial=surface;return object
  }

  private sphereMesh():RenderMesh {
    const vertices:number[]=[],indices:number[]=[],rows=16,columns=28
    for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
      const theta=row*Math.PI/rows,phi=col*2*Math.PI/columns
      const x=Math.sin(theta)*Math.cos(phi),y=Math.cos(theta),z=Math.sin(theta)*Math.sin(phi)
      vertices.push(x,y,z,x,y,z)
    }
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const a=row*(columns+1)+col,b=a+columns+1
      indices.push(a,a+1,b+1,a,b+1,b)
    }
    return this.mesh(vertices,indices)
  }

  private ringMesh(radius:number,tube:number):RenderMesh {
    const vertices:number[]=[],indices:number[]=[],around=32,section=10
    for(let i=0;i<=around;i++)for(let j=0;j<=section;j++){
      const u=i*2*Math.PI/around,v=j*2*Math.PI/section,c=Math.cos(v),s=Math.sin(v)
      vertices.push((radius+tube*c)*Math.cos(u),(radius+tube*c)*Math.sin(u),tube*s,c*Math.cos(u),c*Math.sin(u),s)
    }
    for(let i=0;i<around;i++)for(let j=0;j<section;j++){
      const a=i*(section+1)+j,b=a+section+1
      indices.push(a,b,b+1,a,b+1,a+1)
    }
    return this.mesh(vertices,indices)
  }

  private mesh(vertices:number[],indices:number[]):RenderMesh {
    const builder=new MeshBuilder([{name:"position",components:3},{name:"normal",components:3,normalized:true}])
    builder.topology=MeshTopology.Triangles;builder.indexType=MeshIndexType.UInt16
    builder.appendVerticesInterleaved(vertices);builder.appendIndices(indices);builder.updateMesh();return builder.getMesh()
  }
}
