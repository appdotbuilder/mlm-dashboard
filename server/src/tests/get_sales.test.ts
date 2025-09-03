import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { distributorsTable, salesTable } from '../db/schema';
import { getSales } from '../handlers/get_sales';

describe('getSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sales exist', async () => {
    const result = await getSales();
    expect(result).toEqual([]);
  });

  it('should fetch all sales with correct field types', async () => {
    // Create test distributor first
    const distributor = await db.insert(distributorsTable)
      .values({
        name: 'Test Distributor',
        referrerId: null
      })
      .returning()
      .execute();

    // Create test sale
    await db.insert(salesTable)
      .values({
        distributorId: distributor[0].id,
        productName: 'Test Product',
        quantity: 5,
        amount: '149.99', // Insert as string for numeric column
        date: new Date('2024-01-15')
      })
      .execute();

    const results = await getSales();

    expect(results).toHaveLength(1);
    
    const sale = results[0];
    expect(sale.id).toBeDefined();
    expect(sale.distributorId).toBe(distributor[0].id);
    expect(sale.productName).toBe('Test Product');
    expect(sale.quantity).toBe(5);
    expect(sale.amount).toBe(149.99);
    expect(typeof sale.amount).toBe('number'); // Verify numeric conversion
    expect(sale.date).toEqual(new Date('2024-01-15'));
    expect(sale.created_at).toBeInstanceOf(Date);
  });

  it('should fetch multiple sales ordered by date descending', async () => {
    // Create test distributor
    const distributor = await db.insert(distributorsTable)
      .values({
        name: 'Test Distributor',
        referrerId: null
      })
      .returning()
      .execute();

    // Create multiple sales with different dates
    await db.insert(salesTable)
      .values([
        {
          distributorId: distributor[0].id,
          productName: 'Product A',
          quantity: 1,
          amount: '10.00',
          date: new Date('2024-01-10') // Older date
        },
        {
          distributorId: distributor[0].id,
          productName: 'Product B',
          quantity: 2,
          amount: '25.50',
          date: new Date('2024-01-20') // Newer date
        },
        {
          distributorId: distributor[0].id,
          productName: 'Product C',
          quantity: 3,
          amount: '75.25',
          date: new Date('2024-01-15') // Middle date
        }
      ])
      .execute();

    const results = await getSales();

    expect(results).toHaveLength(3);
    
    // Verify ordering by date descending (most recent first)
    expect(results[0].productName).toBe('Product B'); // 2024-01-20
    expect(results[0].date).toEqual(new Date('2024-01-20'));
    expect(results[1].productName).toBe('Product C'); // 2024-01-15
    expect(results[1].date).toEqual(new Date('2024-01-15'));
    expect(results[2].productName).toBe('Product A'); // 2024-01-10
    expect(results[2].date).toEqual(new Date('2024-01-10'));

    // Verify all amounts are properly converted to numbers
    expect(typeof results[0].amount).toBe('number');
    expect(results[0].amount).toBe(25.50);
    expect(typeof results[1].amount).toBe('number');
    expect(results[1].amount).toBe(75.25);
    expect(typeof results[2].amount).toBe('number');
    expect(results[2].amount).toBe(10.00);
  });

  it('should fetch sales from multiple distributors', async () => {
    // Create multiple distributors
    const distributors = await db.insert(distributorsTable)
      .values([
        { name: 'Distributor A', referrerId: null },
        { name: 'Distributor B', referrerId: null }
      ])
      .returning()
      .execute();

    // Create sales for different distributors
    await db.insert(salesTable)
      .values([
        {
          distributorId: distributors[0].id,
          productName: 'Product X',
          quantity: 2,
          amount: '50.00',
          date: new Date('2024-01-15')
        },
        {
          distributorId: distributors[1].id,
          productName: 'Product Y',
          quantity: 1,
          amount: '25.00',
          date: new Date('2024-01-16')
        }
      ])
      .execute();

    const results = await getSales();

    expect(results).toHaveLength(2);
    
    // Find sales by product name to verify distributor assignment
    const saleX = results.find(s => s.productName === 'Product X');
    const saleY = results.find(s => s.productName === 'Product Y');
    
    expect(saleX).toBeDefined();
    expect(saleX!.distributorId).toBe(distributors[0].id);
    expect(saleX!.amount).toBe(50.00);
    
    expect(saleY).toBeDefined();
    expect(saleY!.distributorId).toBe(distributors[1].id);
    expect(saleY!.amount).toBe(25.00);
  });

  it('should handle decimal amounts correctly', async () => {
    // Create test distributor
    const distributor = await db.insert(distributorsTable)
      .values({
        name: 'Test Distributor',
        referrerId: null
      })
      .returning()
      .execute();

    // Create sale with precise decimal amount
    await db.insert(salesTable)
      .values({
        distributorId: distributor[0].id,
        productName: 'Decimal Product',
        quantity: 1,
        amount: '123.45', // Precise decimal
        date: new Date('2024-01-15')
      })
      .execute();

    const results = await getSales();

    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(123.45);
    expect(typeof results[0].amount).toBe('number');
    
    // Verify precision is maintained
    expect(results[0].amount.toFixed(2)).toBe('123.45');
  });
});