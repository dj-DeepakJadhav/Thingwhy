import "./EarbudLeafIndex"
import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {ZipperLeafScenario} from "./ZipperLeafScenario"

@component
export class ZipperLeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex:ScenarioMetadata[]=[
    {id:"zipper-full-flow",typename:ZipperLeafScenario.getTypeName(),parameters:{mode:"flow"}},
    {id:"zipper-pause-reset",typename:ZipperLeafScenario.getTypeName(),parameters:{mode:"pause-reset"}},
    {id:"zipper-mechanism",typename:ZipperLeafScenario.getTypeName(),parameters:{mode:"mechanism"}},
    {id:"zipper-seated-reach",typename:ZipperLeafScenario.getTypeName(),parameters:{mode:"reach","__leaf__diagnostic_policy":"fail-fast"}},
    {id:"zipper-hand-ray-flow",typename:ZipperLeafScenario.getTypeName(),parameters:{mode:"ik-ray-flow","__leaf__diagnostic_policy":"fail-fast","__leaf__timeout_secs":"180"}},
    {id:"zipper-shell-pause",typename:ZipperLeafScenario.getTypeName(),parameters:{mode:"motion","__leaf__timeout_secs":"90"}}
  ]
}
