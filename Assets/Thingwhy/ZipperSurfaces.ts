export type ZipperSurface="fabric"|"tooth"|"metal"|"accent"

/** Shared immutable surface variants; repeated teeth never clone a material each. */
export class ZipperSurfaces {
  private variants=new Map<string,Material>()

  constructor(private template:Material){
    if(!template||!template.mainPass)throw new Error("Zipper surface template requires a live shader pass")
  }

  public forPart(name:string,color:vec4):Material {
    const kind:ZipperSurface=name.indexOf("Tape")>=0?"fabric":
      name==="Neck"||name==="Head"||name==="Mini tooth"?"tooth":
      name.indexOf("marker")>=0?"accent":"metal"
    const key=kind+":"+[color.x,color.y,color.z,color.w].join(",")
    let material=this.variants.get(key)
    if(!material){
      material=this.template.clone()
      material.mainPass.baseColor=color
      material.mainPass.roughness=kind==="fabric"?0.92:kind==="tooth"?0.34:kind==="metal"?0.42:0.6
      material.mainPass.metallic=kind==="metal"?0.35:kind==="tooth"?0.08:0
      this.variants.set(key,material)
    }
    return material
  }

  public get count():number{return this.variants.size}
}
