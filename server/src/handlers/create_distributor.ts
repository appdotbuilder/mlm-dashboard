import { db } from '../db';
import { distributorsTable } from '../db/schema';
import { type CreateDistributorInput, type Distributor } from '../schema';
import { eq } from 'drizzle-orm';

export const createDistributor = async (input: CreateDistributorInput): Promise<Distributor> => {
  try {
    // Validate that referrer exists if referrerId is provided
    if (input.referrerId !== null) {
      const referrer = await db.select()
        .from(distributorsTable)
        .where(eq(distributorsTable.id, input.referrerId))
        .execute();
      
      if (referrer.length === 0) {
        throw new Error(`Referrer with ID ${input.referrerId} not found`);
      }
    }

    // Insert distributor record
    const result = await db.insert(distributorsTable)
      .values({
        name: input.name,
        referrerId: input.referrerId
      })
      .returning()
      .execute();

    // Return the created distributor
    const distributor = result[0];
    return {
      ...distributor,
      created_at: distributor.created_at
    };
  } catch (error) {
    console.error('Distributor creation failed:', error);
    throw error;
  }
};