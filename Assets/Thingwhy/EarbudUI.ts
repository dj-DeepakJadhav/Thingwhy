import {ReplayControl} from "./ReplayControl"
import {TextRole,styleText,earbudAccent,utility} from "./ThingwhyStyle"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign,FlexDirection,FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"

export type EarbudAction="a"|"b"|"anc"|"noise"|"cutaway"|"hint"|"pause"|"recenter"|"reset"|"zipper"|"earbuds"|"pen"|"spray"|"replay"|"tools"
export interface EarbudPresentation {
  stage:string;message:string;actionA:string;actionB:string;milestones:string
  anc:boolean;source:string;tip:string;residual:number;paused:boolean;revealStep:number;reward:boolean;replayActive?:boolean
}

/** Passive UIKit panels and model annotations. The selector uses pickerMode. */
@component
export class EarbudUI extends BaseScriptComponent {
  @input pickerMode:boolean=false
  @input @allowUndefined modelRoot:SceneObject|null=null
  public onAction=new Event<EarbudAction>()
  private labels:{[key:string]:Text}={}
  private buttons:{[key:string]:Button}={}
  private value:EarbudPresentation|null=null
  replayMaterial:Material|null=null
  private replayControl:ReplayControl|null=null
  private utilityRows:SceneObject[]=[]
  private toolsOpen=false

  onAwake():void {this.createEvent("OnStartEvent").bind(()=>this.build())}

  private build():void {
    if(this.pickerMode)return
    this.sceneObject.createComponent("Component.Canvas")
    if(!this.modelRoot)throw new Error("EarbudUI needs a modelRoot outside picker mode")
    const host=this.object(this.sceneObject,"Earbud panel content",new vec3(0,0,.6))
    const column=this.flex(host,FlexDirection.Column,15,23,.35)
    this.item(column,15,1.7,c=>{this.labels.title=this.text(c,"Earbud stage","EARBUDS · Use",14,1.7,"title")})
    this.item(column,15,3.4,c=>{this.labels.message=this.text(c,"Earbud instruction","How can adding sound make it quieter?",14,3.4,"body")})
    this.item(column,15,1.8,c=>{this.labels.status=this.text(c,"Earbud model status","",14,1.8,"caption")})
    this.row(column,[{key:"a",label:"Toggle ANC"},{key:"b",label:"Continue"}],true)
    this.row(column,[{key:"anc",label:"ANC off"},{key:"noise",label:"Try changing"}])
    this.row(column,[{key:"cutaway",label:"Cutaway"},{key:"hint",label:utility.hint},{key:"replay",label:"▷ Replay"}])
    this.row(column,[{key:"tools",label:"Tools"}])
    this.utilityRows=[
      this.row(column,[{key:"pause",label:"Pause"},{key:"recenter",label:utility.recenter}]),
      this.row(column,[{key:"reset",label:utility.reset}])
    ]
    this.showTools(false)
    this.item(column,15,1.8,c=>{this.labels.milestones=this.text(c,"Earbud milestones","",14,1.8,"caption")})
    const ear=this.object(this.modelRoot,"Ear observation label",new vec3(4.9,4.85,3.1))
    this.text(ear,"Ear point label","VIRTUAL\nEAR",3,1.3,"caption")
    const captions=["INCOMING · after the seal","OPPOSING · from the speaker","RESIDUAL · at the virtual ear"]
    for(let i=0;i<3;i++){
      const object=this.object(this.modelRoot,"Pressure caption "+i,new vec3(0,-3.35-i*2.3,2.1))
      this.text(object,"Pressure label "+i,captions[i],13,1,"caption")
    }
    const footer=this.object(this.modelRoot,"Model note",new vec3(0,-10.7,2))
    this.text(footer,"Pressure time scale","Illustrative pressure · slowed down",13,1,"caption")
    if(this.value)this.present(this.value)
  }

  public present(value:EarbudPresentation):void {
    this.value=value
    if(!this.labels.title)return
    this.labels.title.text="Earbuds / "+value.stage
    this.labels.message.text=value.paused?"Paused. Your progress is kept.\nPinch Resume when ready.":value.message
    this.labels.status.text=(value.anc?"ANC ON":"ANC OFF")+" · "+value.tip+" tip\nModel residual "+Math.round(value.residual*100)+"% · "+value.source
    this.labels.a.text=value.actionA;this.labels.b.text=value.actionB
    const single=value.stage==="Use"||value.stage==="Investigate"
    this.buttons.a.sceneObject.enabled=!single
    const aItem=this.buttons.a.sceneObject.getComponent(FlexItem.getTypeName()) as FlexItem
    const bItem=this.buttons.b.sceneObject.getComponent(FlexItem.getTypeName()) as FlexItem
    aItem.overrideWidth=single?0:7.2;bItem.overrideWidth=single?14.4:7.2
    const width=single?14.4:7.2
    this.buttons.b.size=new vec3(width,2.4,.5);this.buttons.b.colliderSize=new vec3(width,2.4,.5)
    this.labels.b.layoutRect=Rect.create(-(width-.5)/2,(width-.5)/2,-1.05,1.05)
    this.labels.anc.text=value.anc?"ANC on":"ANC off"
    this.labels.noise.text=value.source==="hum"?"Try changing":"Try hum"
    this.labels.cutaway.text=["Cutaway","Next: housing","Next: internals","Close cutaway"][value.revealStep]
    this.buttons.replay.sceneObject.enabled=value.stage==="Investigate"
    if(!this.replayControl&&this.replayMaterial)this.replayControl=new ReplayControl(this.labels.replay,this.replayMaterial)
    if(this.replayControl)this.replayControl.present(!!value.replayActive)
    else this.labels.replay.text=value.replayActive?"■ Live":"▷ Replay"
    this.labels.pause.text=value.paused?utility.resume:utility.pause
    this.labels.milestones.text=value.milestones
  }

  public showReplayFrame(before:boolean,holding:boolean,anc:boolean,ratio:number):void {
    if(this.labels.status)this.labels.status.text=(holding?"Held":before?"Before":"After")+" · ANC "+(anc?"ON":"OFF")+"\nModel residual "+Math.round(ratio*100)+"%"
  }

  private showTools(show:boolean):void {
    this.toolsOpen=show
    this.labels.tools.text=show?"Close tools":"Tools"
    for(const row of this.utilityRows){
      row.enabled=show
      const item=row.getComponent(FlexItem.getTypeName()) as FlexItem
      item.overrideHeight=show?2.4:0
    }
  }

  private row(parent:SceneObject,entries:{key:EarbudAction;label:string}[],primary=false,width=15):SceneObject {
    return this.item(parent,width,2.4,child=>{
      const row=this.flex(child,FlexDirection.Row,width,2.4,.6),buttonWidth=entries.length===1?width-.5:(width-.6*(entries.length-1))/entries.length
      for(const entry of entries)this.item(row,buttonWidth,2.4,object=>{
        object.name=(this.pickerMode?"Episode ":"Earbud ")+entry.key
        const button=object.createComponent(Button.getTypeName()) as Button
        this.buttons[entry.key]=button
        button.size=new vec3(buttonWidth,2.4,.5);button.colliderFitElement=false;button.colliderSize=new vec3(buttonWidth,2.4,.5)
        button.setVariant({theme:"SnapOS2",shape:"Rectangle",style:primary?"Primary":"Secondary"})
        button.onInitialized.add(()=>{button.interactable.targetingMode=TargetingMode.Direct|TargetingMode.Indirect})
        button.onTriggerDown.add(()=>{if(entry.key==="tools")this.showTools(!this.toolsOpen);else this.onAction.invoke(entry.key)})
        this.labels[entry.key]=this.text(object,"Earbud label "+entry.key,entry.label,buttonWidth-.5,2.1,"button",.18)
      })
    })
  }

  private object(parent:SceneObject,name:string,position=vec3.zero()):SceneObject {
    const object=global.scene.createSceneObject(name);object.setParent(parent);object.getTransform().setLocalPosition(position);return object
  }

  private text(parent:SceneObject,name:string,value:string,width:number,height:number,role:TextRole,z=.12):Text {
    const object=this.object(parent,name,new vec3(0,0,z)),text=object.createComponent("Component.Text") as Text
    text.text=value;styleText(text,role,role==="title"?earbudAccent:undefined)
    text.horizontalAlignment=HorizontalAlignment.Center;text.verticalAlignment=VerticalAlignment.Center
    text.layoutRect=Rect.create(-width/2,width/2,-height/2,height/2)
    text.horizontalOverflow=HorizontalOverflow.Wrap;text.verticalOverflow=VerticalOverflow.Overflow;return text
  }

  private flex(parent:SceneObject,direction:FlexDirection,width:number,height:number,gap:number):SceneObject {
    const object=this.object(parent,"Earbud Flex",new vec3(0,0,.02))
    const layout=object.createComponent(FlexLayout.getTypeName()) as FlexLayout
    layout.autoDiscoverItemsOnStart=false
    const item=object.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth=width;item.overrideHeight=height
    layout.onInitialized.add(()=>{
      layout.width=width;layout.height=height;layout.direction=direction
      layout.justifyContent=FlexJustify.Center;layout.alignItems=FlexAlign.Center
      layout.rowGap=direction===FlexDirection.Column?gap:0;layout.columnGap=direction===FlexDirection.Row?gap:0
    });return object
  }

  private item(parent:SceneObject,width:number,height:number,build:(object:SceneObject)=>void):SceneObject {
    const object=this.object(parent,"Earbud layout item",new vec3(0,0,.02))
    const item=object.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth=width;item.overrideHeight=height;item.flexGrow=0;item.flexShrink=0
    build(object)
    const layout=parent.getComponent(FlexLayout.getTypeName()) as FlexLayout
    layout.addItems([item])
    return object
  }
}
