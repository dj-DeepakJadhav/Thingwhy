import {EarbudGeometry} from "./EarbudGeometry"
import {ZipperGeometry} from "./ZipperGeometry"
import {ZipperSurfaces} from "./ZipperSurfaces"
import {styleText,zipperAccent,earbudAccent,penAccent,sprayAccent} from "./ThingwhyStyle"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"

export type WorkbenchObject="zipper"|"earbuds"|"pen"|"spray"

const objects=[
  {id:"zipper",name:"Zipper",accent:zipperAccent,discovery:"Two guide channels feed the teeth into one chain."},
  {id:"earbuds",name:"Earbuds",accent:earbudAccent,discovery:"The driver adds an opposing signal at the ear."},
  {id:"pen",name:"Pen",accent:penAccent,discovery:"The cam alternates between a shallow stop and a deep groove."},
  {id:"spray",name:"Spray",accent:sprayAccent,discovery:"The pump refills when the trigger is released."}
] as const

export class Workbench {
  private readonly geometry:EarbudGeometry
  private readonly solids:ZipperGeometry
  private readonly shelf:SceneObject
  private readonly notebook:SceneObject
  private readonly notes:Text[]=[]
  private readonly discoveryMarks:SceneObject[]=[]
  private readonly discovered=new Set<WorkbenchObject>()
  private readonly notebookTitle:Text
  private readonly notebookToggle:Text
  private readonly trayToggle:Text
  private readonly trayCue:SceneObject
  private pending:(()=>void)|null=null
  private pendingTime=0

  constructor(root:SceneObject,material:Material,unlit:Material,
    select:(id:WorkbenchObject)=>void,private readonly showOverlay:(show:boolean)=>void){
    root.createComponent("Component.Canvas")
    this.geometry=new EarbudGeometry(material,unlit)
    this.solids=new ZipperGeometry(new ZipperSurfaces(material))
    this.shelf=this.geometry.node(root,"Workbench objects",new vec3(0,-1.8,0))
    this.trayCue=this.label(this.shelf,"Choose an object",0,2.85,undefined,true).getSceneObject()
    for(const [i,entry] of objects.entries()){
      const item=this.geometry.node(this.shelf,"Episode "+entry.id,new vec3((i-1.5)*6.4,0,0))
      const model=this.geometry.node(item,entry.name+" miniature",new vec3(0,.15,0))
      this.miniature(model,entry.id,entry.accent)
      this.box(item,"Object pedestal",0,-1.65,0,4.8,.18,2.25,entry.accent)
      this.label(item,entry.name,0,-2.15,entry.accent)
      this.target(item,4.8,4.2,()=>{
        this.setTray(false)
        select(entry.id)
      },model)
    }
    const tray=this.geometry.node(root,"Workbench tray",new vec3(-3.9,0,0))
    this.trayToggle=this.label(tray,"▤ Tray",0,0)
    this.target(tray,5.6,1.85,()=>{
      if(this.notebook.enabled){this.setNotebook(false)}
      this.setTray(!this.shelf.enabled)
    })
    const book=this.geometry.node(root,"Workbench notebook",new vec3(3.9,0,0))
    this.notebookToggle=this.label(book,"Notebook",0,0)
    this.target(book,5.8,1.85,()=>{
      const show=!this.notebook.enabled
      this.setTray(false);this.setNotebook(show)
    })
    this.notebook=this.geometry.node(root,"Field notebook",new vec3(0,-8.4,0))
    this.notebookTitle=this.label(this.notebook,"Field notebook",0,4.8,undefined,true)
    this.box(this.notebook,"Notebook rule",0,3.65,.1,24,.045,.07,penAccent)
    for(const [i,entry] of objects.entries()){
      const y=2.35-i*2.36
      const miniature=this.geometry.node(this.notebook,entry.name+" notebook sketch",new vec3(-10.5,y,.2))
      miniature.getTransform().setLocalScale(new vec3(.53,.53,.53))
      this.miniature(miniature,entry.id,entry.accent)
      const heading=this.label(this.notebook,entry.name,-8.1,y+.32,entry.accent)
      this.alignEntry(heading)
      const note=this.label(this.notebook,"Discovery",-8.1,y-.47)
      this.alignEntry(note)
      styleText(note,"caption")
      this.notes.push(note)
      this.discoveryMarks.push(this.box(this.notebook,"Discovery mark",-12.1,y,.6,.13,1.23,.13,entry.accent))
    }
    this.setNotebook(false)
    this.setTray(true)
  }

  get trayOpen():boolean{return this.shelf.enabled}
  get overlayOpen():boolean{return this.shelf.enabled||this.notebook.enabled}

  update(dt:number):void {
    if(!this.pending)return
    this.pendingTime-=dt
    if(this.pendingTime>0)return
    const action=this.pending
    this.pending=null
    action()
  }

  mark(id:WorkbenchObject):void {
    if(this.discovered.has(id))return
    this.discovered.add(id)
    this.refreshNotebook()
  }

  private setTray(show:boolean):void {
    this.shelf.enabled=show
    this.trayCue.enabled=show
    this.trayToggle.text=show?"▤ Hide tray":"▤ Tray"
    // The tray actions sit above the objects when the shelf is open.
    this.trayToggle.getSceneObject().getParent().getTransform().setLocalPosition(new vec3(-3.9,show?2.5:0,0))
    this.notebookToggle.getSceneObject().getParent().getTransform().setLocalPosition(new vec3(3.9,show?2.5:0,0))
    this.showOverlay(this.overlayOpen)
  }

  private setNotebook(show:boolean):void {
    this.notebook.enabled=show
    this.notebookToggle.text=show?"Close notebook":"Notebook"
    this.refreshNotebook()
    this.showOverlay(this.overlayOpen)
  }

  private refreshNotebook():void {
    this.notebookTitle.text="Field notebook   "+this.discovered.size+"/4"
    for(const [i,entry] of objects.entries()){
      const found=this.discovered.has(entry.id)
      this.notes[i].text=found?entry.discovery:"Unopened"
      this.discoveryMarks[i].enabled=found
    }
  }

  private alignEntry(text:Text):void {
    text.horizontalAlignment=HorizontalAlignment.Left
    text.verticalAlignment=VerticalAlignment.Center
    text.layoutRect=Rect.create(0,20,-.55,.55)
    text.horizontalOverflow=HorizontalOverflow.Wrap
  }

  private target(object:SceneObject,width:number,height:number,action:()=>void,model?:SceneObject):void {
    const button=object.createComponent(Button.getTypeName()) as Button
    button.size=new vec3(width,height,.4)
    button.colliderFitElement=false
    button.colliderSize=new vec3(width,height,2.5)
    button.setVariant({theme:"SnapOS2",shape:"Rectangle",style:"Ghost"})
    button.onInitialized.add(()=>{
      const target=button.interactable
      target.targetingMode=TargetingMode.Direct|TargetingMode.Indirect
      if(model){
        target.onHoverEnter.add(()=>model.getTransform().setLocalScale(new vec3(1.15,1.15,1.15)))
        target.onHoverExit.add(()=>model.getTransform().setLocalScale(vec3.one()))
      }
    })
    // Keep the pinch target alive through release before swapping out its scene.
    button.onTriggerDown.add(()=>{
      this.pending=action
      this.pendingTime=.16
    })
  }

  private label(parent:SceneObject,value:string,x:number,y:number,accent?:vec4,title=false):Text {
    const label=this.geometry.node(parent,value+" label",new vec3(x,y,1.45))
    const text=label.createComponent("Component.Text") as Text
    text.text=value
    styleText(text,title?"title":"button",accent)
    return text
  }

  private miniature(root:SceneObject,id:WorkbenchObject,color:vec4):void {
    const steel=new vec4(.77,.84,.92,1)
    if(id==="zipper"){
      this.box(root,"Tape",0,0,0,1.3,2.6,.2,color)
      for(let i=0;i<7;i++)this.box(root,"Tooth",i%2===0?-.23:.23,-1+i*.32,.18,.49,.16,.19,steel)
      this.box(root,"Slider",0,-.43,.43,.95,.55,.3,color)
    }else if(id==="earbuds"){
      this.geometry.housing(root,"Earbud shell",new vec3(0,.48,0),color).getTransform().setLocalScale(new vec3(.45,.46,.46))
      this.geometry.stem(root,"Earbud stem",new vec3(-.43,-.42,0),.25,1.68,color)
      this.geometry.oval(root,"Silicone tip",new vec3(.82,.55,.1),new vec3(.42,.37,.42),steel)
    }else if(id==="pen"){
      this.geometry.stem(root,"Pen barrel",vec3.zero(),.33,3.4,color).getTransform().setLocalRotation(quat.fromEulerAngles(0,0,-.67))
      this.geometry.stem(root,"Click cap",new vec3(1.13,1.42,0),.24,.74,steel).getTransform().setLocalRotation(quat.fromEulerAngles(0,0,-.67))
    }else{
      this.geometry.housing(root,"Bottle body",new vec3(.15,-.39,0),color).getTransform().setLocalScale(new vec3(.35,.49,.4))
      this.box(root,"Spray head",0,.83,0,1.58,.58,.56,steel)
      this.geometry.stem(root,"Bottle trigger",new vec3(-.6,.36,.22),.12,.75,color).getTransform().setLocalRotation(quat.fromEulerAngles(0,0,-.38))
    }
  }

  private box(parent:SceneObject,name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:vec4):SceneObject {
    return this.solids.box(parent,name,x,y,z,w,h,d,color)
  }
}
