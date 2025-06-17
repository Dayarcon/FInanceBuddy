import * as SQLite from 'expo-sqlite';
import { Transaction, PaymentMethod, TransactionType } from '../types/transaction';
import { extractSenderOrRecipient } from './types';

let dbInstance: SQLite.WebSQLDatabase | null = null;

export const getDBConnection = (): SQLite.WebSQLDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabase('finance.db');
  }
  return dbInstance;
};

export const resetDatabase = async () => {
  try {
    const db = getDBConnection();
    
    // Drop all tables
    await new Promise<void>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('DROP TABLE IF EXISTS transactions;', [], () => {
          tx.executeSql('DROP TABLE IF EXISTS messages;', [], () => {
            tx.executeSql('DROP TABLE IF EXISTS credit_card_bills;', [], () => {
              tx.executeSql('DROP TABLE IF EXISTS credit_card_payments;', [], () => {
                resolve();
              }, (_, error) => {
                reject(error);
                return false;
              });
            }, (_, error) => {
              reject(error);
              return false;
            });
          }, (_, error) => {
            reject(error);
            return false;
          });
        }, (_, error) => {
          reject(error);
          return false;
        });
      });
    });

    // Recreate tables
    await createTables();
    
    console.log('Database reset successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
};

// Helper function to execute a query and return results
export const executeQuery = (db: SQLite.WebSQLDatabase, query: string, params: SQLite.SQLStatementArg[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    try {
      db.transaction(tx => {
        tx.executeSql(
          query,
          params.map(param => {
            // Ensure all parameters are serializable
            if (param === null || param === undefined) return null;
            if (typeof param === 'object') return JSON.stringify(param);
            return param;
          }),
          (_, result) => resolve(result.rows._array),
          (_, error) => {
            console.error('Error executing query:', error);
            reject(error);
            return false;
          }
        );
      });
    } catch (error) {
      console.error('Error in executeQuery:', error);
      reject(error);
    }
  });
};

// Helper function to insert a record
export const insertRecord = (db: SQLite.WebSQLDatabase, table: string, data: Record<string, SQLite.SQLStatementArg>): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data).map(value => {
        // Ensure all values are serializable
        if (value === null || value === undefined) return null;
        if (typeof value === 'object') return JSON.stringify(value);
        return value;
      });
      const placeholders = columns.map(() => '?').join(',');
      
      const query = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
      
      db.transaction(tx => {
        tx.executeSql(
          query,
          values,
          (_, result) => resolve(result.insertId || 0),
          (_, error) => {
            console.error('Error inserting record:', error);
            reject(error);
            return false;
          }
        );
      });
    } catch (error) {
      console.error('Error in insertRecord:', error);
      reject(error);
    }
  });
};

// Helper function to update a record
export const updateRecord = (db: SQLite.WebSQLDatabase, table: string, id: number, data: Record<string, SQLite.SQLStatementArg>): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const updates = Object.entries(data)
        .map(([key]) => `${key} = ?`)
        .join(',');
      const values = [...Object.values(data).map(value => {
        // Ensure all values are serializable
        if (value === null || value === undefined) return null;
        if (typeof value === 'object') return JSON.stringify(value);
        return value;
      }), id];
      
      const query = `UPDATE ${table} SET ${updates} WHERE id = ?`;
      
      db.transaction(tx => {
        tx.executeSql(
          query,
          values,
          () => resolve(),
          (_, error) => {
            console.error('Error updating record:', error);
            reject(error);
            return false;
          }
        );
      });
    } catch (error) {
      console.error('Error in updateRecord:', error);
      reject(error);
    }
  });
};

// Helper function to check for duplicates
export const checkDuplicate = async (table: string, conditions: Record<string, SQLite.SQLStatementArg>): Promise<boolean> => {
  try {
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');
    const values = Object.values(conditions);
    
    const query = `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`;
    
    const result = await executeQuery(getDBConnection(), query, values);
    return result[0].count > 0;
  } catch (error) {
    console.error('Error checking duplicate:', error);
    throw error;
  }
};

// Insert transaction with proper error handling
export const insertTransaction = async (transaction: Transaction): Promise<number> => {
  try {
    return await insertRecord(getDBConnection(), 'transactions', {
      ...transaction,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error inserting transaction:', error);
    throw error;
  }
};

// Get all transactions
export const getAllTransactions = async (db: SQLite.WebSQLDatabase): Promise<Transaction[]> => {
  try {
    const results = await executeQuery(db, 'SELECT * FROM transactions ORDER BY date DESC');
    return results.map(item => ({
      id: Number(item.id),
      date: String(item.date),
      amount: Number(item.amount),
      type: String(item.type) as TransactionType,
      paymentMethod: String(item.paymentMethod) as PaymentMethod,
      account: item.account ? String(item.account) : undefined,
      category: item.category ? String(item.category) : undefined,
      notes: item.notes ? String(item.notes) : undefined,
      source_sms: item.source_sms ? String(item.source_sms) : undefined,
      recipient: item.recipient ? String(item.recipient) : undefined,
      createdAt: item.created_at ? String(item.created_at) : undefined,
      updatedAt: item.updated_at ? String(item.updated_at) : undefined
    }));
  } catch (error) {
    console.error('Error in getAllTransactions:', error);
    throw error;
  }
};

// Create all necessary tables
export const createTables = async () => {
  const db = getDBConnection();

  // Create messages table
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message TEXT NOT NULL,
          date TEXT NOT NULL,
          type TEXT,
          sender TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `, [], () => resolve(), (_, error) => {
        reject(error);
        return false;
      });
    });
  });

  // Create transactions table
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          category TEXT,
          type TEXT,
          paymentMethod TEXT,
          account TEXT,
          notes TEXT,
          source_sms TEXT,
          recipient TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `, [], () => resolve(), (_, error) => {
        reject(error);
        return false;
      });
    });
  });

  // Create credit card tables
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS credit_card_bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cardNumber TEXT NOT NULL,
          bankName TEXT NOT NULL,
          billPeriod TEXT NOT NULL,
          totalAmount REAL NOT NULL,
          minimumDue REAL NOT NULL,
          dueDate TEXT NOT NULL,
          statementDate TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'unpaid',
          paidAmount REAL NOT NULL DEFAULT 0,
          remainingAmount REAL NOT NULL,
          sourceSms TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          UNIQUE(cardNumber, billPeriod)
        );
      `, [], () => resolve(), (_, error) => {
        reject(error);
        return false;
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS credit_card_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cardNumber TEXT NOT NULL,
          bankName TEXT NOT NULL,
          paymentAmount REAL NOT NULL,
          paymentDate TEXT NOT NULL,
          paymentMethod TEXT NOT NULL,
          transactionId TEXT,
          sourceSms TEXT NOT NULL,
          matchedBillId INTEGER,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (matchedBillId) REFERENCES credit_card_bills (id)
        );
      `, [], () => resolve(), (_, error) => {
        reject(error);
        return false;
      });
    });
  });
};

export const saveMessage = async (message: string, date: string, type?: string, sender?: string) => {
  try {
    const db = getDBConnection();
    await new Promise<void>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO messages (message, date, type, sender) VALUES (?, ?, ?, ?)',
          [
            String(message),
            String(date),
            type ? String(type) : null,
            sender ? String(sender) : null
          ],
          () => resolve(),
          (_, error) => {
            console.error('Error saving message:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in saveMessage:', error);
    throw error;
  }
};

export const getAllMessages = async () => {
  try {
    const db = getDBConnection();
    return await new Promise<any[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM messages ORDER BY date DESC',
          [],
          (_, { rows }) => {
            const items = [];
            for (let i = 0; i < rows.length; i++) {
              const item = rows.item(i);
              // Ensure all values are serializable
              const serializedItem = {
                id: Number(item.id),
                message: String(item.message),
                date: String(item.date),
                type: item.type ? String(item.type) : null,
                sender: item.sender ? String(item.sender) : null
              };
              items.push(serializedItem);
            }
            resolve(items);
          },
          (_, error) => {
            console.error('Error getting messages:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in getAllMessages:', error);
    throw error;
  }
};

export const saveTransaction = async (txn: Transaction) => {
  try {
    const db = getDBConnection();
    await new Promise<void>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO transactions 
            (date, amount, type, paymentMethod, account, category, notes, source_sms, recipient) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(txn.date),
            Number(txn.amount),
            String(txn.type),
            String(txn.paymentMethod),
            txn.account ? String(txn.account) : null,
            txn.category ? String(txn.category) : null,
            txn.notes ? String(txn.notes) : null,
            txn.source_sms ? String(txn.source_sms) : null,
            txn.recipient ? String(txn.recipient) : null
          ],
          () => resolve(),
          (_, error) => {
            console.error('Error saving transaction:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  } catch (error) {
    console.error('Error in saveTransaction:', error);
    throw error;
  }
};

export const fixIncorrectTransactionTypes = async () => {
  try {
    const db = getDBConnection();
    const transactions = await getAllTransactions(db);
    let fixedCount = 0;

    for (const txn of transactions) {
      if (!txn.source_sms || !txn.id) continue;

      const smsText = txn.source_sms.toLowerCase();
      let correctType = txn.type;

      const creditIndicators = ['credited', 'received', 'deposited', 'salary', 'refund', 'cashback', 'reward', 'bonus', 'interest', 'dividend'];
      const debitIndicators = ['debited', 'spent', 'withdrawn', 'paid', 'purchase', 'sent', 'transferred'];

      const hasCredit = creditIndicators.some(word => smsText.includes(word));
      const hasDebit = debitIndicators.some(word => smsText.includes(word));

      if (hasCredit && !hasDebit) correctType = 'credit';
      else if (hasDebit && !hasCredit) correctType = 'debit';
      else if (hasCredit && hasDebit) {
        if (smsText.indexOf('credited') < smsText.indexOf('debited')) correctType = 'credit';
        else correctType = 'debit';
      }

      if (correctType !== txn.type && txn.id) {
        await new Promise<void>((resolve, reject) => {
          db.transaction(tx => {
            tx.executeSql(
              `UPDATE transactions SET type = ? WHERE id = ?`,
              [String(correctType), Number(txn.id)],
              () => {
                fixedCount++;
                resolve();
              },
              (_, error) => {
                console.error('Error updating transaction type:', error);
                reject(error);
                return false;
              }
            );
          });
        });
      }
    }

    console.log(`Fixed ${fixedCount} incorrectly classified transactions`);
    return fixedCount;
  } catch (error) {
    console.error('Error in fixIncorrectTransactionTypes:', error);
    throw error;
  }
};

export const fixRecipientInformation = async () => {
  try {
    const db = getDBConnection();
    const transactions = await getAllTransactions(db);
    let fixedCount = 0;

    for (const txn of transactions) {
      if (!txn.source_sms || !txn.id) continue;

      const recipient = extractSenderOrRecipient(txn.source_sms, txn.type as 'credit' | 'debit');

      if (recipient && recipient !== txn.recipient) {
        await new Promise<void>((resolve, reject) => {
          db.transaction(tx => {
            tx.executeSql(
              `UPDATE transactions SET recipient = ? WHERE id = ?`,
              [String(recipient), Number(txn.id)],
              () => {
                fixedCount++;
                resolve();
              },
              (_, error) => {
                console.error('Error updating recipient:', error);
                reject(error);
                return false;
              }
            );
          });
        });
      }
    }

    console.log(`Fixed ${fixedCount} recipient information entries`);
    return fixedCount;
  } catch (error) {
    console.error('Error in fixRecipientInformation:', error);
    throw error;
  }
};
