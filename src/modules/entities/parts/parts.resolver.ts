import {
  Args,
  Int,
  Mutation,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Injectable } from '@nestjs/common';
import { PartsService } from './parts.service';
import {
  Component,
  Part,
  PartInput,
} from '../../common/dto/entities/parts.dto';
import { PartInventoryService } from '../../common/services/entities/part-inventory.service';
import { PartAssignmentsService } from '../../common/services/entities/part-assignments.service';
import { PartAssignmentInput } from '../../common/dto/entities/part-assignment.dto';
import {
  CraftInput,
  FarmInput,
} from '../../common/dto/entities/part-inventory.dto';

@Resolver(() => Part)
@Injectable()
export class PartsResolver {
  constructor(
    private partsService: PartsService,
    private partInventoryService: PartInventoryService,
    private partAssignmentService: PartAssignmentsService,
  ) {}

  @Query(() => [Part])
  async getParts() {
    return this.partsService.getParts();
  }

  @Mutation(() => Part)
  async createPart(@Args('partInput') input: PartInput) {
    return this.partsService.createPart(input);
  }

  @Mutation(() => Part)
  async updatePart(
    @Args('partId') partId: number,
    @Args('partInput') input: PartInput,
  ) {
    return this.partsService.updatePart(partId, input);
  }

  @Mutation(() => Boolean)
  async craft(@Args('CraftInput') craftInput: CraftInput) {
    await this.partInventoryService.craft(craftInput);
    return true;
  }

  @Mutation(() => Boolean)
  async farm(@Args('FarmInput') farmInput: FarmInput) {
    await this.partInventoryService.add(farmInput);
    return true;
  }

  @Mutation(() => Component)
  async assignComponent(
    @Args('PartAssignmentInput') input: PartAssignmentInput,
  ): Promise<Component> {
    return this.partAssignmentService.assignComponent(input);
  }

  @ResolveField(() => [Component])
  async components(part: Part) {
    return this.partsService.getComponents(part);
  }

  @ResolveField(() => Int)
  async current_quantity(part: Part) {
    return this.partInventoryService.getCurrentQuantity(part.part_id);
  }
}
