import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { distributorsTable } from '../db/schema';
import { type CreateDistributorInput, type Distributor } from '../schema';
import { getDownlineHierarchy } from '../handlers/get_downline_hierarchy';

// Helper function to create distributors for testing
async function createDistributor(input: CreateDistributorInput): Promise<Distributor> {
  const result = await db.insert(distributorsTable)
    .values({
      name: input.name,
      referrerId: input.referrerId
    })
    .returning()
    .execute();

  return result[0];
}

describe('getDownlineHierarchy', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent distributor', async () => {
    const result = await getDownlineHierarchy(999);
    expect(result).toBeNull();
  });

  it('should return hierarchy with no children for distributor with no referrals', async () => {
    // Create a single distributor with no referrals
    const distributor = await createDistributor({
      name: 'Solo Distributor',
      referrerId: null
    });

    const result = await getDownlineHierarchy(distributor.id);

    expect(result).not.toBeNull();
    expect(result!.distributor.id).toEqual(distributor.id);
    expect(result!.distributor.name).toEqual('Solo Distributor');
    expect(result!.children).toEqual([]);
  });

  it('should return hierarchy with direct children only', async () => {
    // Create parent distributor
    const parent = await createDistributor({
      name: 'Parent',
      referrerId: null
    });

    // Create two direct children
    const child1 = await createDistributor({
      name: 'Child 1',
      referrerId: parent.id
    });

    const child2 = await createDistributor({
      name: 'Child 2',
      referrerId: parent.id
    });

    const result = await getDownlineHierarchy(parent.id);

    expect(result).not.toBeNull();
    expect(result!.distributor.id).toEqual(parent.id);
    expect(result!.distributor.name).toEqual('Parent');
    expect(result!.children).toHaveLength(2);

    // Check first child
    const resultChild1 = result!.children!.find(c => c.distributor.name === 'Child 1');
    expect(resultChild1).toBeDefined();
    expect(resultChild1!.distributor.id).toEqual(child1.id);
    expect(resultChild1!.children).toEqual([]);

    // Check second child
    const resultChild2 = result!.children!.find(c => c.distributor.name === 'Child 2');
    expect(resultChild2).toBeDefined();
    expect(resultChild2!.distributor.id).toEqual(child2.id);
    expect(resultChild2!.children).toEqual([]);
  });

  it('should return complete multi-level hierarchy', async () => {
    // Create a 3-level hierarchy:
    // Grandparent
    // ├── Parent 1
    // │   ├── Child 1.1
    // │   └── Child 1.2
    // └── Parent 2
    //     └── Child 2.1

    const grandparent = await createDistributor({
      name: 'Grandparent',
      referrerId: null
    });

    const parent1 = await createDistributor({
      name: 'Parent 1',
      referrerId: grandparent.id
    });

    const parent2 = await createDistributor({
      name: 'Parent 2',
      referrerId: grandparent.id
    });

    const child11 = await createDistributor({
      name: 'Child 1.1',
      referrerId: parent1.id
    });

    const child12 = await createDistributor({
      name: 'Child 1.2',
      referrerId: parent1.id
    });

    const child21 = await createDistributor({
      name: 'Child 2.1',
      referrerId: parent2.id
    });

    const result = await getDownlineHierarchy(grandparent.id);

    // Verify root level
    expect(result).not.toBeNull();
    expect(result!.distributor.name).toEqual('Grandparent');
    expect(result!.children).toHaveLength(2);

    // Verify Parent 1 branch
    const resultParent1 = result!.children!.find(c => c.distributor.name === 'Parent 1');
    expect(resultParent1).toBeDefined();
    expect(resultParent1!.children).toHaveLength(2);

    const resultChild11 = resultParent1!.children!.find(c => c.distributor.name === 'Child 1.1');
    const resultChild12 = resultParent1!.children!.find(c => c.distributor.name === 'Child 1.2');
    expect(resultChild11).toBeDefined();
    expect(resultChild12).toBeDefined();
    expect(resultChild11!.children).toEqual([]);
    expect(resultChild12!.children).toEqual([]);

    // Verify Parent 2 branch
    const resultParent2 = result!.children!.find(c => c.distributor.name === 'Parent 2');
    expect(resultParent2).toBeDefined();
    expect(resultParent2!.children).toHaveLength(1);

    const resultChild21 = resultParent2!.children!.find(c => c.distributor.name === 'Child 2.1');
    expect(resultChild21).toBeDefined();
    expect(resultChild21!.children).toEqual([]);
  });

  it('should work when querying from a middle-level distributor', async () => {
    // Create hierarchy and query from a middle level
    const grandparent = await createDistributor({
      name: 'Grandparent',
      referrerId: null
    });

    const parent = await createDistributor({
      name: 'Parent',
      referrerId: grandparent.id
    });

    const child1 = await createDistributor({
      name: 'Child 1',
      referrerId: parent.id
    });

    const child2 = await createDistributor({
      name: 'Child 2',
      referrerId: parent.id
    });

    // Query hierarchy starting from the parent level (not grandparent)
    const result = await getDownlineHierarchy(parent.id);

    expect(result).not.toBeNull();
    expect(result!.distributor.name).toEqual('Parent');
    expect(result!.children).toHaveLength(2);

    const resultChild1 = result!.children!.find(c => c.distributor.name === 'Child 1');
    const resultChild2 = result!.children!.find(c => c.distributor.name === 'Child 2');
    expect(resultChild1).toBeDefined();
    expect(resultChild2).toBeDefined();
    expect(resultChild1!.children).toEqual([]);
    expect(resultChild2!.children).toEqual([]);
  });

  it('should handle deep hierarchies correctly', async () => {
    // Create a deep 5-level chain
    const level1 = await createDistributor({
      name: 'Level 1',
      referrerId: null
    });

    const level2 = await createDistributor({
      name: 'Level 2',
      referrerId: level1.id
    });

    const level3 = await createDistributor({
      name: 'Level 3',
      referrerId: level2.id
    });

    const level4 = await createDistributor({
      name: 'Level 4',
      referrerId: level3.id
    });

    const level5 = await createDistributor({
      name: 'Level 5',
      referrerId: level4.id
    });

    const result = await getDownlineHierarchy(level1.id);

    expect(result).not.toBeNull();
    expect(result!.distributor.name).toEqual('Level 1');
    expect(result!.children).toHaveLength(1);

    // Navigate down the chain
    let current = result!.children![0];
    expect(current.distributor.name).toEqual('Level 2');
    expect(current.children).toHaveLength(1);

    current = current.children![0];
    expect(current.distributor.name).toEqual('Level 3');
    expect(current.children).toHaveLength(1);

    current = current.children![0];
    expect(current.distributor.name).toEqual('Level 4');
    expect(current.children).toHaveLength(1);

    current = current.children![0];
    expect(current.distributor.name).toEqual('Level 5');
    expect(current.children).toEqual([]);
  });
});