import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { distributorsTable, salesTable } from '../db/schema';
import { getDistributorsWithStats } from '../handlers/get_distributors_with_stats';

describe('getDistributorsWithStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no distributors exist', async () => {
    const result = await getDistributorsWithStats();
    expect(result).toEqual([]);
  });

  it('should return distributor with zero stats when no sales exist', async () => {
    // Create a distributor with no sales
    const [distributor] = await db.insert(distributorsTable)
      .values({
        name: 'Test Distributor',
        referrerId: null,
      })
      .returning()
      .execute();

    const result = await getDistributorsWithStats();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: distributor.id,
      name: 'Test Distributor',
      referrerId: null,
      directSales: 0,
      earnedCommission: 0,
      downlineCount: 0,
      created_at: distributor.created_at,
    });
  });

  it('should calculate direct sales and own commission correctly', async () => {
    // Create a distributor
    const [distributor] = await db.insert(distributorsTable)
      .values({
        name: 'Sales Distributor',
        referrerId: null,
      })
      .returning()
      .execute();

    // Create sales for the distributor
    await db.insert(salesTable)
      .values([
        {
          distributorId: distributor.id,
          productName: 'Product A',
          quantity: 2,
          amount: '100.00',
          date: new Date(),
        },
        {
          distributorId: distributor.id,
          productName: 'Product B',
          quantity: 1,
          amount: '50.00',
          date: new Date(),
        },
      ])
      .execute();

    const result = await getDistributorsWithStats();

    expect(result).toHaveLength(1);
    expect(result[0].directSales).toEqual(150.00);
    expect(result[0].earnedCommission).toEqual(15.00); // 10% of 150
    expect(result[0].downlineCount).toEqual(0);
  });

  it('should calculate downline count correctly', async () => {
    // Create parent distributor
    const [parent] = await db.insert(distributorsTable)
      .values({
        name: 'Parent Distributor',
        referrerId: null,
      })
      .returning()
      .execute();

    // Create child distributors
    const [child1] = await db.insert(distributorsTable)
      .values({
        name: 'Child 1',
        referrerId: parent.id,
      })
      .returning()
      .execute();

    const [child2] = await db.insert(distributorsTable)
      .values({
        name: 'Child 2',
        referrerId: parent.id,
      })
      .returning()
      .execute();

    // Create grandchild
    await db.insert(distributorsTable)
      .values({
        name: 'Grandchild 1',
        referrerId: child1.id,
      })
      .returning()
      .execute();

    const result = await getDistributorsWithStats();

    // Find parent distributor in results
    const parentResult = result.find(d => d.id === parent.id);
    expect(parentResult?.downlineCount).toEqual(3); // 2 children + 1 grandchild

    // Find child1 in results
    const child1Result = result.find(d => d.id === child1.id);
    expect(child1Result?.downlineCount).toEqual(1); // 1 grandchild

    // Find child2 in results
    const child2Result = result.find(d => d.id === child2.id);
    expect(child2Result?.downlineCount).toEqual(0); // no downline
  });

  it('should calculate downline commission correctly', async () => {
    // Create parent distributor
    const [parent] = await db.insert(distributorsTable)
      .values({
        name: 'Parent Distributor',
        referrerId: null,
      })
      .returning()
      .execute();

    // Create child distributor
    const [child] = await db.insert(distributorsTable)
      .values({
        name: 'Child Distributor',
        referrerId: parent.id,
      })
      .returning()
      .execute();

    // Create sales for parent (own sales)
    await db.insert(salesTable)
      .values({
        distributorId: parent.id,
        productName: 'Parent Product',
        quantity: 1,
        amount: '200.00',
        date: new Date(),
      })
      .execute();

    // Create sales for child (downline sales)
    await db.insert(salesTable)
      .values({
        distributorId: child.id,
        productName: 'Child Product',
        quantity: 1,
        amount: '100.00',
        date: new Date(),
      })
      .execute();

    const result = await getDistributorsWithStats();

    // Find parent in results
    const parentResult = result.find(d => d.id === parent.id);
    expect(parentResult?.directSales).toEqual(200.00);
    // Own commission (10% of 200) + downline commission (5% of 100) = 20 + 5 = 25
    expect(parentResult?.earnedCommission).toEqual(25.00);
    expect(parentResult?.downlineCount).toEqual(1);

    // Find child in results
    const childResult = result.find(d => d.id === child.id);
    expect(childResult?.directSales).toEqual(100.00);
    expect(childResult?.earnedCommission).toEqual(10.00); // 10% of 100
    expect(childResult?.downlineCount).toEqual(0);
  });

  it('should handle complex multi-level hierarchy correctly', async () => {
    // Create a complex hierarchy: A -> B -> C -> D
    const [distributorA] = await db.insert(distributorsTable)
      .values({
        name: 'Distributor A',
        referrerId: null,
      })
      .returning()
      .execute();

    const [distributorB] = await db.insert(distributorsTable)
      .values({
        name: 'Distributor B',
        referrerId: distributorA.id,
      })
      .returning()
      .execute();

    const [distributorC] = await db.insert(distributorsTable)
      .values({
        name: 'Distributor C',
        referrerId: distributorB.id,
      })
      .returning()
      .execute();

    const [distributorD] = await db.insert(distributorsTable)
      .values({
        name: 'Distributor D',
        referrerId: distributorC.id,
      })
      .returning()
      .execute();

    // Create sales at each level
    await db.insert(salesTable)
      .values([
        {
          distributorId: distributorA.id,
          productName: 'Product A',
          quantity: 1,
          amount: '100.00',
          date: new Date(),
        },
        {
          distributorId: distributorB.id,
          productName: 'Product B',
          quantity: 1,
          amount: '200.00',
          date: new Date(),
        },
        {
          distributorId: distributorC.id,
          productName: 'Product C',
          quantity: 1,
          amount: '300.00',
          date: new Date(),
        },
        {
          distributorId: distributorD.id,
          productName: 'Product D',
          quantity: 1,
          amount: '400.00',
          date: new Date(),
        },
      ])
      .execute();

    const result = await getDistributorsWithStats();

    // Distributor A should have 3 people in downline (B, C, D)
    // and commission from B+C+D sales = 5% of (200+300+400) = 45
    const distributorAResult = result.find(d => d.id === distributorA.id);
    expect(distributorAResult?.downlineCount).toEqual(3);
    expect(distributorAResult?.directSales).toEqual(100.00);
    expect(distributorAResult?.earnedCommission).toEqual(55.00); // 10% of 100 + 5% of 900

    // Distributor B should have 2 people in downline (C, D)
    // and commission from C+D sales = 5% of (300+400) = 35
    const distributorBResult = result.find(d => d.id === distributorB.id);
    expect(distributorBResult?.downlineCount).toEqual(2);
    expect(distributorBResult?.directSales).toEqual(200.00);
    expect(distributorBResult?.earnedCommission).toEqual(55.00); // 10% of 200 + 5% of 700

    // Distributor C should have 1 person in downline (D)
    const distributorCResult = result.find(d => d.id === distributorC.id);
    expect(distributorCResult?.downlineCount).toEqual(1);
    expect(distributorCResult?.directSales).toEqual(300.00);
    expect(distributorCResult?.earnedCommission).toEqual(50.00); // 10% of 300 + 5% of 400

    // Distributor D should have no downline
    const distributorDResult = result.find(d => d.id === distributorD.id);
    expect(distributorDResult?.downlineCount).toEqual(0);
    expect(distributorDResult?.directSales).toEqual(400.00);
    expect(distributorDResult?.earnedCommission).toEqual(40.00); // 10% of 400
  });

  it('should handle multiple independent hierarchies', async () => {
    // Create two independent hierarchies
    const [parentA] = await db.insert(distributorsTable)
      .values({
        name: 'Parent A',
        referrerId: null,
      })
      .returning()
      .execute();

    const [parentB] = await db.insert(distributorsTable)
      .values({
        name: 'Parent B',
        referrerId: null,
      })
      .returning()
      .execute();

    // Create children for each parent
    await db.insert(distributorsTable)
      .values([
        {
          name: 'Child A1',
          referrerId: parentA.id,
        },
        {
          name: 'Child A2',
          referrerId: parentA.id,
        },
        {
          name: 'Child B1',
          referrerId: parentB.id,
        },
      ])
      .execute();

    const result = await getDistributorsWithStats();

    // Parent A should have 2 children
    const parentAResult = result.find(d => d.id === parentA.id);
    expect(parentAResult?.downlineCount).toEqual(2);

    // Parent B should have 1 child
    const parentBResult = result.find(d => d.id === parentB.id);
    expect(parentBResult?.downlineCount).toEqual(1);

    // Total of 5 distributors
    expect(result).toHaveLength(5);
  });
});