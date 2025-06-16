import { createTables, getAllTransactions, insertTransaction, Transaction } from './database';

export const addTransaction = async (transaction: Transaction): Promise<number> => {
  await createTables();
  return await insertTransaction(transaction);
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  await createTables();
  return await getAllTransactions();
};
