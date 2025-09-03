import { db } from '../db';
import { distributorsTable } from '../db/schema';
import { type Distributor } from '../schema';
import { desc } from 'drizzle-orm';

export const getDistributors = async (): Promise<Distributor[]> => {
  try {
    // Fetch all distributors, ordered by creation date (newest first)
    const results = await db.select()
      .from(distributorsTable)
      .orderBy(desc(distributorsTable.created_at))
      .execute();

    // Convert results to match the schema type
    return results.map(distributor => ({
      id: distributor.id,
      name: distributor.name,
      referrerId: distributor.referrerId,
      created_at: distributor.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch distributors:', error);
    throw error;
  }
};