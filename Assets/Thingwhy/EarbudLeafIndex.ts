import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {EarbudLeafScenario} from "./EarbudLeafScenario"
import {PenLeafScenario} from "./PenLeafScenario"
import {SprayLeafScenario} from "./SprayLeafScenario"
@component
export class EarbudLeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex:ScenarioMetadata[]=[
    {id:"spray-full-flow",typename:SprayLeafScenario.getTypeName(),parameters:{mode:"flow"}},
    {id:"spray-hand-ray-flow",typename:SprayLeafScenario.getTypeName(),parameters:{mode:"hand-ray","__leaf__timeout_secs":"240","__leaf__diagnostic_policy":"fail-fast"}},
    {id:"pen-full-flow",typename:PenLeafScenario.getTypeName(),parameters:{mode:"flow"}},
    {id:"pen-hand-ray-flow",typename:PenLeafScenario.getTypeName(),parameters:{mode:"hand-ray","__leaf__timeout_secs":"240","__leaf__diagnostic_policy":"fail-fast"}},
    {id:"earbuds-signal-model",typename:EarbudLeafScenario.getTypeName(),parameters:{mode:"model"}},
    {id:"earbuds-full-flow",typename:EarbudLeafScenario.getTypeName(),parameters:{mode:"flow"}},
    {id:"earbuds-lifecycle",typename:EarbudLeafScenario.getTypeName(),parameters:{mode:"lifecycle"}},
    {id:"earbuds-seated-reach",typename:EarbudLeafScenario.getTypeName(),parameters:{mode:"reach"}},
    {id:"earbuds-hand-ray-flow",typename:EarbudLeafScenario.getTypeName(),parameters:{mode:"hand-ray","__leaf__timeout_secs":"240","__leaf__diagnostic_policy":"fail-fast"}}
  ]
}
