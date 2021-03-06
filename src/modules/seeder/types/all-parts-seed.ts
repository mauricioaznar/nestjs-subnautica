import { RawMaterialsSeed } from './raw-materials-seed';
import { BasicMaterialsSeed } from './basic-materials-seed';
import { ElectronicSeed } from './electronic-seed';
import { AdvancedMaterialsSeed } from './advanced-materials-seed';
import { DeployablesSeed } from './deployables-seed';
import { EquipmentsSeed } from './equipments-seed';
import { ToolsSeed } from './tools-seed';

export interface AllPartsSeed {
  rawMaterials: RawMaterialsSeed;
  basicMaterials: BasicMaterialsSeed;
  electronics: ElectronicSeed;
  advancedMaterials: AdvancedMaterialsSeed;
  deployables: DeployablesSeed;
  equipments: EquipmentsSeed;
  tools: ToolsSeed;
}
