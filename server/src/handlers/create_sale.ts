import { db } from '../db';
import { salesTable, distributorsTable } from '../db/schema';
import { type CreateSaleInput, type Sale } from '../schema';
import { eq } from 'drizzle-orm';

export async function createSale(input: CreateSaleInput): Promise<Sale> {
  try {
    // First validate that the distributor exists
    const existingDistributor = await db.select()
      .from(distributorsTable)
      .where(eq(distributorsTable.id, input.distributorId))
      .limit(1)
      .execute();

    if (existingDistributor.length === 0) {
      throw new Error(`Distributor with ID ${input.distributorId} does not exist`);
    }

    // Insert the sale record
    const result = await db.insert(salesTable)
      .values({
        distributorId: input.distributorId,
        productName: input.productName,
        quantity: input.quantity,
        amount: input.amount.toString(), // Convert number to string for numeric column
        date: input.date
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const sale = result[0];
    return {
      ...sale,
      amount: parseFloat(sale.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Sale creation failed:', error);
    throw error;
  }
}