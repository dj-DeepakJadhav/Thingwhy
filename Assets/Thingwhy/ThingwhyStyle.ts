export type TextRole = "title" | "body" | "caption" | "button" | "part"

const size: Record<TextRole, number> = {title:38,body:29,caption:24,button:28,part:30}
const weight: Record<TextRole, number> = {title:700,body:550,caption:550,button:650,part:650}

/** Shared world-space typography for all three episodes. */
export function styleText(text:Text,role:TextRole,accent?:vec4):void {
  text.size=size[role]
  text.weight=weight[role]
  text.textFill.color=accent??new vec4(.96,.98,1,1)
  text.depthTest=true
}

export const zipperAccent=new vec4(.53,.88,1,1)
export const earbudAccent=new vec4(.49,1,.79,1)
export const penAccent=new vec4(1,.83,.5,1)
export const sprayAccent=new vec4(1,.55,.36,1)
export const finishes={
  ivory:new vec4(.92,.85,.70,1),
  steel:new vec4(.76,.83,.9,1),
  petrol:new vec4(.025,.53,.47,1),
  cobalt:new vec4(.085,.34,.78,1),
  mint:new vec4(.25,.98,.71,1),
  amber:new vec4(1,.64,.19,1),
  coral:new vec4(.95,.31,.19,1),
  water:new vec4(.14,.83,1,1)
}
export const utility={hint:"? Hint",pause:"Ⅱ Pause",resume:"▷ Resume",reset:"↺ Reset",recenter:"◎ Center"}
