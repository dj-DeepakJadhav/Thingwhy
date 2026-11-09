import {ReplayControl} from "./ReplayControl"
import {TextRole,styleText,zipperAccent,utility} from "./ThingwhyStyle"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign,FlexDirection,FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"

export type ZipperAction = "a" | "b" | "close" | "open" | "hint" | "slow" | "pause" | "reset" | "recenter" | "replay" | "tools"
export interface ZipperPresentation {
  stage: string; message: string; milestone: string; actionA: string; actionB: string
  paused: boolean; slow: boolean; progress: number; replayActive?: boolean
}

/** Passive UIKit view. Domain state and all success decisions live in ZipperEpisode. */
@component
export class ZipperUI extends BaseScriptComponent {
  public onAction=new Event<ZipperAction>()
  private labels:{[key:string]:Text}={}
  private presentation:ZipperPresentation|null=null
  private travelRow!:SceneObject
  private replayButton!:SceneObject
  private utilityRows:SceneObject[]=[]
  private toolsOpen=false
  replayMaterial:Material|null=null
  private replayControl:ReplayControl|null=null

  onAwake():void { this.createEvent("OnStartEvent").bind(()=>this.build()) }

  private build():void {
    this.sceneObject.createComponent("Component.Canvas")
    const host=this.obj(this.sceneObject,"Episode controls",new vec3(0,0,0.6))
    const column=this.makeFlex(host,FlexDirection.Column,15,23,0.5)
    this.flexChild(column,15,2,child=>{this.labels.title=this.text(child,"Episode stage","THINGWHY • ZIPPER",14,2,"Title")})
    this.flexChild(column,15,4,child=>{this.labels.message=this.text(child,"Task instruction","Pull up to close the zipper.",14,4,"Body")})
    this.flexChild(column,15,1.6,child=>{this.labels.progress=this.text(child,"Progress readout","Open",14,1.6,"Caption")})
    this.row(column,[{key:"a",label:"Close"},{key:"b",label:"Open"}],true)
    this.travelRow=this.row(column,[{key:"close",label:"Close ↑"},{key:"open",label:"Open ↓"}])
    this.row(column,[{key:"hint",label:utility.hint},{key:"slow",label:"Slow"},{key:"replay",label:"▷ Replay"}])
    this.row(column,[{key:"tools",label:"Tools"}])
    this.utilityRows=[
      this.row(column,[{key:"pause",label:"Pause"},{key:"recenter",label:utility.recenter}]),
      this.row(column,[{key:"reset",label:utility.reset}])
    ]
    this.showTools(false)
    this.flexChild(column,15,2.1,child=>{this.labels.milestone=this.text(child,"Milestones","Discovered ○  Repaired ○\nUnderstood ○",14,2.1,"Caption")})
    if(this.presentation)this.present(this.presentation)
  }

  public present(value:ZipperPresentation):void {
    this.presentation=value
    if(!this.labels.title)return
    this.labels.title.text="Zipper / "+value.stage
    this.labels.message.text=value.paused?"Paused. Your progress is kept.\nPinch Resume when ready.":value.message
    this.labels.progress.text=value.stage==="Complete"?"Miniature unlocked · pinch to explore":Math.round(value.progress*100)+"% closed · "+(value.slow?"slow motion":"normal speed")
    this.labels.milestone.text=value.milestone
    this.labels.a.text=value.actionA;this.labels.b.text=value.actionB
    this.labels.pause.text=value.paused?utility.resume:utility.pause
    this.labels.slow.text=value.slow?"Normal":"Slow"
    this.replayButton.enabled=value.stage==="Investigate"
    if(!this.replayControl&&this.replayMaterial)this.replayControl=new ReplayControl(this.labels.replay,this.replayMaterial)
    if(this.replayControl)this.replayControl.present(!!value.replayActive)
    else this.labels.replay.text=value.replayActive?"■ Live":"▷ Replay"
    const showTravel=value.stage==="Predict"||value.stage==="Investigate"||value.actionA==="View reward"
    if(this.travelRow.enabled!==showTravel){
      this.travelRow.enabled=showTravel
      const item=this.travelRow.getComponent(FlexItem.getTypeName()) as FlexItem
      item.overrideHeight=showTravel?2.5:0
    }
  }

  private showTools(show:boolean):void {
    this.toolsOpen=show
    this.labels.tools.text=show?"Close tools":"Tools"
    for(const row of this.utilityRows){
      row.enabled=show
      const item=row.getComponent(FlexItem.getTypeName()) as FlexItem
      item.overrideHeight=show?2.5:0
    }
  }

  public showReplayFrame(progress:number,holding:boolean):void {
    if(this.labels.progress)this.labels.progress.text=(holding?"Held":"Replay")+" · "+Math.round(progress*100)+"% closed"
  }

  private row(parent:SceneObject,entries:{key:ZipperAction;label:string}[],primary=false):SceneObject {
    return this.flexChild(parent,15,2.5,child=>{
      const row=this.makeFlex(child,FlexDirection.Row,15,2.5,0.6)
      const width=entries.length===1?14.5:(15-.6*(entries.length-1))/entries.length
      for(const entry of entries)this.flexChild(row,width,2.5,buttonObject=>{
        buttonObject.name="Zipper "+entry.key
        if(entry.key==="replay")this.replayButton=buttonObject
        const button=buttonObject.createComponent(Button.getTypeName()) as Button
        button.size=new vec3(width,2.5,0.5)
        // UIKit triples auto-fit colliders during a drag. Keep neighboring buttons
        // outside that expanded volume while a tracked hand approaches a pinch.
        button.colliderFitElement=false
        button.colliderSize=new vec3(width,2.5,0.5)
        button.setVariant({theme:"SnapOS2",shape:"Rectangle",style:primary?"Primary":"Secondary"})
        button.onInitialized.add(()=>{button.interactable.targetingMode=TargetingMode.Direct|TargetingMode.Indirect})
        // Select on the real pinch edge, before natural hand retreat loses hover.
        button.onTriggerDown.add(()=>{if(entry.key==="tools")this.showTools(!this.toolsOpen);else this.onAction.invoke(entry.key)})
        this.labels[entry.key]=this.text(buttonObject,"Label "+entry.key,entry.label,width-0.5,2.2,"Button",0.18)
      })
    })
  }

  private text(parent:SceneObject,name:string,value:string,width:number,height:number,role:Capitalize<TextRole>,z=0.12):Text {
    const object=this.obj(parent,name,new vec3(0,0,z))
    const text=object.createComponent("Component.Text") as Text
    text.text=value;styleText(text,role.toLowerCase() as TextRole,role==="Title"?zipperAccent:undefined)
    text.horizontalAlignment=HorizontalAlignment.Center;text.verticalAlignment=VerticalAlignment.Center
    text.layoutRect=Rect.create(-width/2,width/2,-height/2,height/2)
    text.horizontalOverflow=HorizontalOverflow.Wrap;text.verticalOverflow=VerticalOverflow.Overflow
    return text
  }

  private obj(parent:SceneObject,name:string,position?:vec3):SceneObject {
    const object=global.scene.createSceneObject(name);object.setParent(parent)
    if(position)object.getTransform().setLocalPosition(position)
    return object
  }

  // CLAD specs-build-ui composition helpers: layout owns child positions.
  private makeFlex(parent:SceneObject,direction:FlexDirection,width:number,height:number,gap:number):SceneObject {
    const object=this.obj(parent,"Flex",new vec3(0,0,0.02))
    const layout=object.createComponent(FlexLayout.getTypeName()) as FlexLayout
    layout.autoDiscoverItemsOnStart=false
    const item=object.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth=width;item.overrideHeight=height
    layout.onInitialized.add(()=>{
      layout.width=width;layout.height=height;layout.direction=direction
      layout.justifyContent=FlexJustify.Center;layout.alignItems=FlexAlign.Center
      layout.rowGap=direction===FlexDirection.Column?gap:0
      layout.columnGap=direction===FlexDirection.Row?gap:0
    })
    return object
  }

  private flexChild(parent:SceneObject,width:number,height:number,build:(child:SceneObject)=>void):SceneObject {
    const child=this.obj(parent,"Item",new vec3(0,0,0.02))
    const item=child.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth=width;item.overrideHeight=height;item.flexGrow=0;item.flexShrink=0
    build(child)
    const layout=parent.getComponent(FlexLayout.getTypeName()) as FlexLayout
    if(layout)layout.addItems([item])
    return child
  }
}
