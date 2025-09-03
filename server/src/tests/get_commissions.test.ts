import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { distributorsTable, salesTable } from '../db/schema';
import { getCommissions } from '../handlers/get_commissions';

describe('getCommissions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no distributors exist', async () => {
    const result = await getCommissions();

    expect(result).toEqual([]);
  });

  it('should calculate commissions for distributor with no sales', async () => {
    // Create a distributor with no sales
    await db.insert(distributorsTable)
      .values({
        name: 'Test Distributor',
        referrerId: null
      })
      .execute();

    const result = await getCommissions();

    expect(result).toHaveLength(1);
    expect(result[0].distributorName).toEqual('Test Distributor');
    expect(result[0].ownSales).toEqual(0);
    expect(result[0].ownCommission).toEqual(0);
    expect(result[0].downlineCommission).toEqual(0);
    expect(result[0].totalCommission).toEqual(0);
  });

  it('should calculate own commission correctly', async () => {
    // Create distributor
    const distributorResult = await db.insert(distributorsTable)
      .values({
        name: 'Sales Distributor',
        referrerId: null
      })
      .returning()
      .execute();

    const distributorId = distributorResult[0].id;

    // Create sales for the distributor
    await db.insert(salesTable)
      .values([
        {
          distributorId,
          productName: 'Product A',
          quantity: 2,
          amount: '100.00',
          date: new Date()
        },
        {
          distributorId,
          productName: 'Product B',
          quantity: 1,
          amount: '50.00',
          date: new Date()
        }
      ])
      .execute();

    const result = await getCommissions();

    expect(result).toHaveLength(1);
    expect(result[0].distributorName).toEqual('Sales Distributor');
    expect(result[0].ownSales).toEqual(150); // 100 + 50
    expect(result[0].ownCommission).toEqual(15); // 10% of 150
    expect(result[0].downlineCommission).toEqual(0);
    expect(result[0].totalCommission).toEqual(15);
  });

  it('should calculate downline commission correctly', async () => {
    // Create parent distributor
    const parentResult = await db.insert(distributorsTable)
      .values({
        name: 'Parent Distributor',
        referrerId: null
      })
      .returning()
      .execute();

    const parentId = parentResult[0].id;

    // Create child distributor
    const childResult = await db.insert(distributorsTable)
      .values({
        name: 'Child Distributor',
        referrerId: parentId
      })
      .returning()
      .execute();

    const childId = childResult[0].id;

    // Create sales for child distributor
    await db.insert(salesTable)
      .values({
        distributorId: childId,
        productName: 'Product C',
        quantity: 1,
        amount: '200.00',
        date: new Date()
      })
      .execute();

    const result = await getCommissions();

    // Sort by distributor name for predictable testing
    result.sort((a, b) => a.distributorName.localeCompare(b.distributorName));

    expect(result).toHaveLength(2);

    // Child distributor should have own commission only
    const childCommission = result.find(r => r.distributorName === 'Child Distributor');
    expect(childCommission).toBeDefined();
    expect(childCommission!.ownSales).toEqual(200);
    expect(childCommission!.ownCommission).toEqual(20); // 10% of 200
    expect(childCommission!.downlineCommission).toEqual(0);
    expect(childCommission!.totalCommission).toEqual(20);

    // Parent distributor should have downline commission
    const parentCommission = result.find(r => r.distributorName === 'Parent Distributor');
    expect(parentCommission).toBeDefined();
    expect(parentCommission!.ownSales).toEqual(0);
    expect(parentCommission!.ownCommission).toEqual(0);
    expect(parentCommission!.downlineCommission).toEqual(4); // 2% of 200
    expect(parentCommission!.totalCommission).toEqual(4);
  });

  it('should calculate multi-level downline commissions', async () => {
    // Create 3-level hierarchy
    const level1Result = await db.insert(distributorsTable)
      .values({
        name: 'Level 1',
        referrerId: null
      })
      .returning()
      .execute();

    const level1Id = level1Result[0].id;

    const level2Result = await db.insert(distributorsTable)
      .values({
        name: 'Level 2',
        referrerId: level1Id
      })
      .returning()
      .execute();

    const level2Id = level2Result[0].id;

    const level3Result = await db.insert(distributorsTable)
      .values({
        name: 'Level 3',
        referrerId: level2Id
      })
      .returning()
      .execute();

    const level3Id = level3Result[0].id;

    // Create sales at each level
    await db.insert(salesTable)
      .values([
        {
          distributorId: level1Id,
          productName: 'Product L1',
          quantity: 1,
          amount: '100.00',
          date: new Date()
        },
        {
          distributorId: level2Id,
          productName: 'Product L2',
          quantity: 1,
          amount: '200.00',
          date: new Date()
        },
        {
          distributorId: level3Id,
          productName: 'Product L3',
          quantity: 1,
          amount: '300.00',
          date: new Date()
        }
      ])
      .execute();

    const result = await getCommissions();

    // Sort by distributor name for predictable testing
    result.sort((a, b) => a.distributorName.localeCompare(b.distributorName));

    expect(result).toHaveLength(3);

    const level1Commission = result.find(r => r.distributorName === 'Level 1');
    const level2Commission = result.find(r => r.distributorName === 'Level 2');
    const level3Commission = result.find(r => r.distributorName === 'Level 3');

    // Level 3 (leaf node) - only own commission
    expect(level3Commission!.ownSales).toEqual(300);
    expect(level3Commission!.ownCommission).toEqual(30); // 10% of 300
    expect(level3Commission!.downlineCommission).toEqual(0);
    expect(level3Commission!.totalCommission).toEqual(30);

    // Level 2 - own commission + commission from level 3
    expect(level2Commission!.ownSales).toEqual(200);
    expect(level2Commission!.ownCommission).toEqual(20); // 10% of 200
    expect(level2Commission!.downlineCommission).toEqual(6); // 2% of 300
    expect(level2Commission!.totalCommission).toEqual(26);

    // Level 1 - own commission + commission from level 2 and 3
    expect(level1Commission!.ownSales).toEqual(100);
    expect(level1Commission!.ownCommission).toEqual(10); // 10% of 100
    expect(level1Commission!.downlineCommission).toEqual(10); // 2% of (200 + 300)
    expect(level1Commission!.totalCommission).toEqual(20);
  });

  it('should handle multiple children at same level', async () => {
    // Create parent with multiple children
    const parentResult = await db.insert(distributorsTable)
      .values({
        name: 'Parent',
        referrerId: null
      })
      .returning()
      .execute();

    const parentId = parentResult[0].id;

    // Create two children
    const child1Result = await db.insert(distributorsTable)
      .values({
        name: 'Child 1',
        referrerId: parentId
      })
      .returning()
      .execute();

    const child2Result = await db.insert(distributorsTable)
      .values({
        name: 'Child 2',
        referrerId: parentId
      })
      .returning()
      .execute();

    const child1Id = child1Result[0].id;
    const child2Id = child2Result[0].id;

    // Create sales for both children
    await db.insert(salesTable)
      .values([
        {
          distributorId: child1Id,
          productName: 'Product C1',
          quantity: 1,
          amount: '150.00',
          date: new Date()
        },
        {
          distributorId: child2Id,
          productName: 'Product C2',
          quantity: 1,
          amount: '250.00',
          date: new Date()
        }
      ])
      .execute();

    const result = await getCommissions();

    const parentCommission = result.find(r => r.distributorName === 'Parent');

    expect(parentCommission).toBeDefined();
    expect(parentCommission!.ownSales).toEqual(0);
    expect(parentCommission!.ownCommission).toEqual(0);
    expect(parentCommission!.downlineCommission).toEqual(8); // 2% of (150 + 250)
    expect(parentCommission!.totalCommission).toEqual(8);
  });
});