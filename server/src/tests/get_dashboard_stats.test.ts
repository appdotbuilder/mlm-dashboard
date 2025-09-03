import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { distributorsTable, salesTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const stats = await getDashboardStats();

    expect(stats.totalSales).toEqual(0);
    expect(stats.totalCommissionsPaid).toEqual(0);
    expect(stats.totalDistributors).toEqual(0);
    expect(stats.totalSalesAmount).toEqual(0);
  });

  it('should calculate basic stats correctly with distributors and sales', async () => {
    // Create test distributors
    const distributorResult = await db.insert(distributorsTable)
      .values([
        { name: 'John Doe', referrerId: null },
        { name: 'Jane Smith', referrerId: null }
      ])
      .returning()
      .execute();

    const [distributor1, distributor2] = distributorResult;

    // Create test sales
    await db.insert(salesTable)
      .values([
        {
          distributorId: distributor1.id,
          productName: 'Product A',
          quantity: 1,
          amount: '100.00',
          date: new Date()
        },
        {
          distributorId: distributor1.id,
          productName: 'Product B',
          quantity: 2,
          amount: '200.00',
          date: new Date()
        },
        {
          distributorId: distributor2.id,
          productName: 'Product C',
          quantity: 1,
          amount: '150.00',
          date: new Date()
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.totalSales).toEqual(3);
    expect(stats.totalDistributors).toEqual(2);
    expect(stats.totalSalesAmount).toEqual(450.00);
    expect(typeof stats.totalCommissionsPaid).toBe('number');
    
    // Basic commission check - distributors should earn 10% of their own sales
    // Distributor 1: (100 + 200) * 0.10 = 30
    // Distributor 2: 150 * 0.10 = 15
    // Total expected: 45
    expect(stats.totalCommissionsPaid).toEqual(45.00);
  });

  it('should calculate MLM commissions correctly with referral hierarchy', async () => {
    // Create a referral hierarchy
    const topDistributor = await db.insert(distributorsTable)
      .values({ name: 'Top Distributor', referrerId: null })
      .returning()
      .execute();

    const referredDistributor = await db.insert(distributorsTable)
      .values({ 
        name: 'Referred Distributor', 
        referrerId: topDistributor[0].id 
      })
      .returning()
      .execute();

    // Create sales for both distributors
    await db.insert(salesTable)
      .values([
        {
          distributorId: topDistributor[0].id,
          productName: 'Product A',
          quantity: 1,
          amount: '1000.00', // Top distributor's own sale
          date: new Date()
        },
        {
          distributorId: referredDistributor[0].id,
          productName: 'Product B',
          quantity: 1,
          amount: '500.00', // Referred distributor's sale
          date: new Date()
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.totalSales).toEqual(2);
    expect(stats.totalDistributors).toEqual(2);
    expect(stats.totalSalesAmount).toEqual(1500.00);

    // Commission calculation:
    // Top distributor: 10% of own sales (1000 * 0.10 = 100) + 5% of downline sales (500 * 0.05 = 25) = 125
    // Referred distributor: 10% of own sales (500 * 0.10 = 50) + 0 downline = 50
    // Total expected: 175
    expect(stats.totalCommissionsPaid).toEqual(175.00);
  });

  it('should handle decimal amounts correctly', async () => {
    // Create distributor
    const distributor = await db.insert(distributorsTable)
      .values({ name: 'Test Distributor', referrerId: null })
      .returning()
      .execute();

    // Create sales with decimal amounts
    await db.insert(salesTable)
      .values([
        {
          distributorId: distributor[0].id,
          productName: 'Product A',
          quantity: 1,
          amount: '99.99',
          date: new Date()
        },
        {
          distributorId: distributor[0].id,
          productName: 'Product B',
          quantity: 1,
          amount: '149.50',
          date: new Date()
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.totalSales).toEqual(2);
    expect(stats.totalDistributors).toEqual(1);
    expect(stats.totalSalesAmount).toEqual(249.49);
    
    // Commission: (99.99 + 149.50) * 0.10 = 24.949, which should be 24.949
    expect(stats.totalCommissionsPaid).toBeCloseTo(24.949, 2);
  });

  it('should handle multiple levels of referral hierarchy', async () => {
    // Create multi-level hierarchy: A -> B -> C
    const levelA = await db.insert(distributorsTable)
      .values({ name: 'Level A', referrerId: null })
      .returning()
      .execute();

    const levelB = await db.insert(distributorsTable)
      .values({ name: 'Level B', referrerId: levelA[0].id })
      .returning()
      .execute();

    const levelC = await db.insert(distributorsTable)
      .values({ name: 'Level C', referrerId: levelB[0].id })
      .returning()
      .execute();

    // Create sales for each level
    await db.insert(salesTable)
      .values([
        {
          distributorId: levelA[0].id,
          productName: 'Product A',
          quantity: 1,
          amount: '100.00',
          date: new Date()
        },
        {
          distributorId: levelB[0].id,
          productName: 'Product B',
          quantity: 1,
          amount: '200.00',
          date: new Date()
        },
        {
          distributorId: levelC[0].id,
          productName: 'Product C',
          quantity: 1,
          amount: '300.00',
          date: new Date()
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.totalSales).toEqual(3);
    expect(stats.totalDistributors).toEqual(3);
    expect(stats.totalSalesAmount).toEqual(600.00);

    // Commission calculation (only direct downline gets 5%):
    // Level A: 10% own (100 * 0.10 = 10) + 5% direct downline B (200 * 0.05 = 10) = 20
    // Level B: 10% own (200 * 0.10 = 20) + 5% direct downline C (300 * 0.05 = 15) = 35
    // Level C: 10% own (300 * 0.10 = 30) + 0 downline = 30
    // Total expected: 85
    expect(stats.totalCommissionsPaid).toEqual(85.00);
  });
});