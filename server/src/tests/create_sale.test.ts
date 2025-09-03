import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { distributorsTable, salesTable } from '../db/schema';
import { type CreateSaleInput } from '../schema';
import { createSale } from '../handlers/create_sale';
import { eq } from 'drizzle-orm';

// Test data
const testDistributor = {
  name: 'Test Distributor',
  referrerId: null
};

const testSaleInput: CreateSaleInput = {
  distributorId: 1, // Will be set dynamically in tests
  productName: 'Test Product',
  quantity: 5,
  amount: 99.99,
  date: new Date('2024-01-15T10:30:00Z')
};

describe('createSale', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a sale successfully', async () => {
    // First create a distributor
    const distributorResult = await db.insert(distributorsTable)
      .values(testDistributor)
      .returning()
      .execute();

    const distributorId = distributorResult[0].id;

    // Create sale with the distributor ID
    const saleInput = { ...testSaleInput, distributorId };
    const result = await createSale(saleInput);

    // Verify the returned data
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.distributorId).toEqual(distributorId);
    expect(result.productName).toEqual('Test Product');
    expect(result.quantity).toEqual(5);
    expect(result.amount).toEqual(99.99);
    expect(typeof result.amount).toBe('number'); // Verify numeric conversion
    expect(result.date).toEqual(new Date('2024-01-15T10:30:00Z'));
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save sale to database correctly', async () => {
    // Create distributor first
    const distributorResult = await db.insert(distributorsTable)
      .values(testDistributor)
      .returning()
      .execute();

    const distributorId = distributorResult[0].id;

    // Create sale
    const saleInput = { ...testSaleInput, distributorId };
    const result = await createSale(saleInput);

    // Query the database to verify the sale was saved
    const savedSales = await db.select()
      .from(salesTable)
      .where(eq(salesTable.id, result.id))
      .execute();

    expect(savedSales).toHaveLength(1);
    const savedSale = savedSales[0];

    expect(savedSale.distributorId).toEqual(distributorId);
    expect(savedSale.productName).toEqual('Test Product');
    expect(savedSale.quantity).toEqual(5);
    expect(parseFloat(savedSale.amount)).toEqual(99.99); // Amount stored as string, convert to compare
    expect(savedSale.date).toEqual(new Date('2024-01-15T10:30:00Z'));
    expect(savedSale.created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent distributor', async () => {
    const saleInput = { ...testSaleInput, distributorId: 999 }; // Non-existent ID

    await expect(createSale(saleInput)).rejects.toThrow(/distributor with id 999 does not exist/i);
  });

  it('should handle decimal amounts correctly', async () => {
    // Create distributor first
    const distributorResult = await db.insert(distributorsTable)
      .values(testDistributor)
      .returning()
      .execute();

    const distributorId = distributorResult[0].id;

    // Create sale with precise decimal amount
    const saleInput = {
      ...testSaleInput,
      distributorId,
      amount: 123.45
    };

    const result = await createSale(saleInput);

    // Verify decimal precision is maintained
    expect(result.amount).toEqual(123.45);
    expect(typeof result.amount).toBe('number');

    // Verify in database
    const savedSales = await db.select()
      .from(salesTable)
      .where(eq(salesTable.id, result.id))
      .execute();

    expect(parseFloat(savedSales[0].amount)).toEqual(123.45);
  });

  it('should create multiple sales for same distributor', async () => {
    // Create distributor first
    const distributorResult = await db.insert(distributorsTable)
      .values(testDistributor)
      .returning()
      .execute();

    const distributorId = distributorResult[0].id;

    // Create first sale
    const sale1Input = { ...testSaleInput, distributorId, productName: 'Product 1' };
    const sale1 = await createSale(sale1Input);

    // Create second sale
    const sale2Input = { ...testSaleInput, distributorId, productName: 'Product 2', amount: 49.99 };
    const sale2 = await createSale(sale2Input);

    // Verify both sales were created with different IDs
    expect(sale1.id).not.toEqual(sale2.id);
    expect(sale1.productName).toEqual('Product 1');
    expect(sale2.productName).toEqual('Product 2');
    expect(sale1.amount).toEqual(99.99);
    expect(sale2.amount).toEqual(49.99);

    // Verify both exist in database
    const allSales = await db.select()
      .from(salesTable)
      .where(eq(salesTable.distributorId, distributorId))
      .execute();

    expect(allSales).toHaveLength(2);
  });

  it('should handle different product names and quantities', async () => {
    // Create distributor first
    const distributorResult = await db.insert(distributorsTable)
      .values(testDistributor)
      .returning()
      .execute();

    const distributorId = distributorResult[0].id;

    // Create sale with different data
    const saleInput = {
      ...testSaleInput,
      distributorId,
      productName: 'Special Product XYZ',
      quantity: 10,
      amount: 1599.99
    };

    const result = await createSale(saleInput);

    expect(result.productName).toEqual('Special Product XYZ');
    expect(result.quantity).toEqual(10);
    expect(result.amount).toEqual(1599.99);
  });
});