import { db } from '../db';
import { salesTable } from '../db/schema';
import { type Sale } from '../schema';
import { desc } from 'drizzle-orm';

export async function getSales(): Promise<Sale[]> {
  try {
    // Query all sales from the database ordered by date (most recent first)
    const results = await db.select()
      .from(salesTable)
      .orderBy(desc(salesTable.date))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(sale => ({
      ...sale,
      amount: parseFloat(sale.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    throw error;
  }
}