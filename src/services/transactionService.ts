import { createTables, getAllTransactions, insertTransaction, getDBConnection } from './database';

export const addTransaction = async (transaction: Transaction): Promise<number> => {
  await createTables();
  return await insertTransaction(transaction);
};

export const fetchTransactions = async (): Promise<any[]> => {
  await createTables();
  const db = getDBConnection();
  return await getAllTransactions(db);
};
