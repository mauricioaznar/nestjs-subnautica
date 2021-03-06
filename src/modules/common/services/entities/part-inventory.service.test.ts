import { INestApplication } from '@nestjs/common';
import { PartCategoriesService } from '../../../entities/part-categories/part-categories.service';
import { PartsService } from '../../../entities/parts/parts.service';
import { PartAssignmentsService } from './part-assignments.service';
import { setupApp } from '../../__tests__/helpers/setup-app';
import { PartInventoryService } from './part-inventory.service';
import { Part } from '../../dto/entities/parts.dto';

describe('part inventory', () => {
  let app: INestApplication;
  let partCategoriesService: PartCategoriesService;
  let partsService: PartsService;
  let partAssignmentsService: PartAssignmentsService;
  let partInventoryService: PartInventoryService;
  let partCategory;

  beforeAll(async () => {
    app = await setupApp();
    partCategoriesService = app.get(PartCategoriesService);
    partsService = app.get(PartsService);
    partAssignmentsService = app.get(PartAssignmentsService);
    partCategory = await partCategoriesService.addCategory({
      name: 'part category created in part inventory test',
    });
    partInventoryService = app.get(PartInventoryService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createsPartWithoutComponents({
    uniqueName,
  }: {
    uniqueName: string;
  }): Promise<{ part: Part }> {
    const part = await partsService.createPart({
      name: `part in ${uniqueName}`,
      imageUrl: null,
      partCategoryId: partCategory.partCategoryId,
    });
    return {
      part: part,
    };
  }

  async function createsParentWithOneComponent({
    uniqueName,
    requiredComponentQuantity,
    defaultGeneratedQuantity = 1,
  }: {
    uniqueName: string;
    requiredComponentQuantity: number;
    defaultGeneratedQuantity?: number;
  }): Promise<{ parent: Part; component: Part }> {
    const partParent = await partsService.createPart({
      name: `part parent in ${uniqueName}`,
      imageUrl: null,
      partCategoryId: partCategory.partCategoryId,
      defaultGeneratedQuantity: defaultGeneratedQuantity,
    });

    const partComponent = await partsService.createPart({
      name: `part component ${uniqueName}`,
      imageUrl: null,
      partCategoryId: partCategory.partCategoryId,
    });

    await partAssignmentsService.assignComponent({
      requiredQuantity: requiredComponentQuantity,
      parentId: partParent.partId,
      componentId: partComponent.partId,
    });

    const components = await partsService.getComponentAssignments(partParent);

    expect(components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          component: expect.objectContaining({
            name: expect.stringMatching(partComponent.name),
          }),
          requiredQuantity: requiredComponentQuantity,
        }),
      ]),
    );

    return {
      parent: partParent,
      component: partComponent,
    };
  }

  async function createsParentWithTwoComponents({
    uniqueName,
    requiredComponentsQuantity,
    defaultGeneratedQuantity = 1,
  }: {
    uniqueName: string;
    requiredComponentsQuantity: number;
    defaultGeneratedQuantity?: number;
  }): Promise<{ parent: Part; component1: Part; component2: Part }> {
    const partParent = await partsService.createPart({
      name: `part parent in ${uniqueName}`,
      imageUrl: null,
      partCategoryId: partCategory.partCategoryId,
      defaultGeneratedQuantity: defaultGeneratedQuantity,
    });

    const partComponent1 = await partsService.createPart({
      name: `part component ${uniqueName} 1`,
      imageUrl: null,
      partCategoryId: partCategory.partCategoryId,
    });

    const partComponent2 = await partsService.createPart({
      name: `part component ${uniqueName} 2`,
      imageUrl: null,
      partCategoryId: partCategory.partCategoryId,
    });

    await partAssignmentsService.assignComponent({
      requiredQuantity: requiredComponentsQuantity,
      parentId: partParent.partId,
      componentId: partComponent1.partId,
    });

    await partAssignmentsService.assignComponent({
      requiredQuantity: requiredComponentsQuantity,
      parentId: partParent.partId,
      componentId: partComponent2.partId,
    });

    const components = await partsService.getComponentAssignments(partParent);

    expect(components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          component: expect.objectContaining({
            name: expect.stringMatching(partComponent1.name),
          }),
          requiredQuantity: requiredComponentsQuantity,
        }),
        expect.objectContaining({
          component: expect.objectContaining({
            name: expect.stringMatching(partComponent2.name),
          }),
          requiredQuantity: requiredComponentsQuantity,
        }),
      ]),
    );

    return {
      parent: partParent,
      component1: partComponent1,
      component2: partComponent2,
    };
  }

  it('initial current quantity must be 0', async () => {
    const { parent } = await createsParentWithOneComponent({
      uniqueName: 'parent inventory 1',
      requiredComponentQuantity: 1,
    });

    const currentParentQuantity = await partInventoryService.getCurrentQuantity(
      parent.partId,
    );

    expect(currentParentQuantity).toBe(0);
  });

  it('fails to add when a parent has a component', async () => {
    const { parent } = await createsParentWithOneComponent({
      uniqueName: 'parent inventory 1',
      requiredComponentQuantity: 1,
    });

    const currentParentQuantity = await partInventoryService.getCurrentQuantity(
      parent.partId,
    );

    expect(currentParentQuantity).toBe(0);

    await expect(async () => {
      await partInventoryService.add({
        partId: parent.partId,
        quantity: 1,
      });
    }).rejects.toThrow(/cannot be added, it must be crafted/i);
  });

  it('fails to add when part doesnt exist', async () => {
    const veryLargeNonexistentId = 1003003000;

    await expect(async () => {
      await partInventoryService.add({
        partId: veryLargeNonexistentId,
        quantity: 1,
      });
    }).rejects.toThrow(/part not found/i);
  });

  it('fails to add when quantity is 0 or less', async () => {
    const { component } = await createsParentWithOneComponent({
      uniqueName: 'fails when add quantity is 0 name',
      requiredComponentQuantity: 2,
    });

    await partInventoryService.add({
      partId: component.partId,
      quantity: 1,
    });

    await expect(async () => {
      await partInventoryService.add({
        partId: component.partId,
        quantity: 0,
      });
    }).rejects.toThrow(/quantity must be bigger than 0/i);

    await expect(async () => {
      await partInventoryService.add({
        partId: component.partId,
        quantity: -1,
      });
    }).rejects.toThrow(/quantity must be bigger than 0/i);

    const currentComponentQuantity =
      await partInventoryService.getCurrentQuantity(component.partId);

    expect(currentComponentQuantity).toBe(1);
  });

  it('adds when part doesnt have a component', async () => {
    const { part } = await createsPartWithoutComponents({
      uniqueName: 'part inventory 2',
    });

    const currentQuantity = await partInventoryService.getCurrentQuantity(
      part.partId,
    );

    expect(currentQuantity).toBe(0);

    await partInventoryService.add({
      partId: part.partId,
      quantity: 2,
    });

    const newCurrentQuantity = await partInventoryService.getCurrentQuantity(
      part.partId,
    );

    expect(newCurrentQuantity).toBe(2);
  });

  it('fails to craft when part is not found', async () => {
    const veryLargeNonexistentId = 1002303000;

    await expect(async () => {
      await partInventoryService.craft({
        partId: veryLargeNonexistentId,
        quantity: 1,
      });
    }).rejects.toThrow(/part not found/i);
  });

  it('fails to craft when a part is without component(s)', async () => {
    const { part } = await createsPartWithoutComponents({
      uniqueName: 'part inventory 2',
    });

    await expect(async () => {
      await partInventoryService.craft({
        partId: part.partId,
        quantity: 1,
      });
    }).rejects.toThrow(/cannot be crafted/i);
  });

  it('fails to craft when a parent doesnt have enough component current quantity', async () => {
    const { parent, component1, component2 } =
      await createsParentWithTwoComponents({
        uniqueName: 'part inventory 3',
        requiredComponentsQuantity: 2,
      });

    await expect(async () => {
      await partInventoryService.craft({
        partId: parent.partId,
        quantity: 1,
      });
    }).rejects.toThrow(/not enough/i);

    await partInventoryService.add({
      partId: component1.partId,
      quantity: 2,
    });

    let currentComponent1Quantity =
      await partInventoryService.getCurrentQuantity(component1.partId);

    expect(currentComponent1Quantity).toBe(2);

    let currentComponent2Quantity =
      await partInventoryService.getCurrentQuantity(component2.partId);

    expect(currentComponent2Quantity).toBe(0);

    await expect(async () => {
      await partInventoryService.craft({
        partId: parent.partId,
        quantity: 1,
      });
    }).rejects.toThrow(/not enough/i);

    // doesnt reduce any component quantity when parent doesnt have at least one component that doesnt meet the requirements
    currentComponent1Quantity = await partInventoryService.getCurrentQuantity(
      component1.partId,
    );

    expect(currentComponent1Quantity).toBe(2);

    currentComponent2Quantity = await partInventoryService.getCurrentQuantity(
      component2.partId,
    );

    expect(currentComponent2Quantity).toBe(0);
  });

  it('fails to craft when quantity is 0 or less', async () => {
    const { parent, component } = await createsParentWithOneComponent({
      uniqueName: 'fails when craft quantity is 0 name',
      requiredComponentQuantity: 2,
    });

    await partInventoryService.add({
      partId: component.partId,
      quantity: 2,
    });

    const currentComponentQuantity =
      await partInventoryService.getCurrentQuantity(component.partId);

    expect(currentComponentQuantity).toBe(2);

    await expect(async () => {
      await partInventoryService.craft({
        partId: parent.partId,
        quantity: 0,
      });
    }).rejects.toThrow(/quantity must be bigger than 0/i);

    await expect(async () => {
      await partInventoryService.craft({
        partId: parent.partId,
        quantity: -1,
      });
    }).rejects.toThrow(/quantity must be bigger than 0/i);

    const currentParentQuantity = await partInventoryService.getCurrentQuantity(
      parent.partId,
    );

    expect(currentParentQuantity).toBe(0);
  });

  it('crafts a part has enough components', async () => {
    const { parent, component1, component2 } =
      await createsParentWithTwoComponents({
        uniqueName: 'part inventory 4',
        requiredComponentsQuantity: 2,
      });

    await expect(async () => {
      await partInventoryService.craft({
        partId: parent.partId,
        quantity: 1,
      });
    }).rejects.toThrow(/not enough/i);

    await partInventoryService.add({
      partId: component1.partId,
      quantity: 4,
    });

    let currentComponent1Quantity =
      await partInventoryService.getCurrentQuantity(component1.partId);

    expect(currentComponent1Quantity).toBe(4);

    await partInventoryService.add({
      partId: component2.partId,
      quantity: 2,
    });

    let currentComponent2Quantity =
      await partInventoryService.getCurrentQuantity(component2.partId);

    expect(currentComponent2Quantity).toBe(2);

    await expect(
      partInventoryService.craft({
        partId: parent.partId,
        quantity: 1,
      }),
    ).resolves.not.toThrow();

    currentComponent1Quantity = await partInventoryService.getCurrentQuantity(
      component1.partId,
    );

    expect(currentComponent1Quantity).toBe(2);

    currentComponent2Quantity = await partInventoryService.getCurrentQuantity(
      component2.partId,
    );

    expect(currentComponent2Quantity).toBe(0);
  });

  it('crafts multiple part has enough components', async () => {
    const { parent, component1, component2 } =
      await createsParentWithTwoComponents({
        uniqueName: 'part inventory 5',
        requiredComponentsQuantity: 2,
      });

    await expect(async () => {
      await partInventoryService.craft({
        partId: parent.partId,
        quantity: 1,
      });
    }).rejects.toThrow(/not enough/i);

    await partInventoryService.add({
      partId: component1.partId,
      quantity: 6,
    });

    let currentComponent1Quantity =
      await partInventoryService.getCurrentQuantity(component1.partId);

    expect(currentComponent1Quantity).toBe(6);

    await partInventoryService.add({
      partId: component2.partId,
      quantity: 4,
    });

    let currentComponent2Quantity =
      await partInventoryService.getCurrentQuantity(component2.partId);

    expect(currentComponent2Quantity).toBe(4);

    await expect(
      partInventoryService.craft({
        partId: parent.partId,
        quantity: 2,
      }),
    ).resolves.not.toThrow();

    currentComponent1Quantity = await partInventoryService.getCurrentQuantity(
      component1.partId,
    );

    expect(currentComponent1Quantity).toBe(2);

    currentComponent2Quantity = await partInventoryService.getCurrentQuantity(
      component2.partId,
    );

    expect(currentComponent2Quantity).toBe(0);

    const currentParentQuantity = await partInventoryService.getCurrentQuantity(
      parent.partId,
    );
    expect(currentParentQuantity).toBe(2);
  });
});
