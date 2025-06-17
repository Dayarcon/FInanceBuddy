import { getDBConnection, createTables } from './database';
import { Message } from './types';

export const getAllMessages = async (): Promise<Message[]> => {
  try {
    const db = getDBConnection();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    // Ensure tables are created
    await createTables();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM messages ORDER BY date DESC',
          [],
          (_, { rows }) => {
            const messages: Message[] = [];
            for (let i = 0; i < rows.length; i++) {
              messages.push(rows.item(i));
            }
            resolve(messages);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  } catch (error) {
    console.error('Error getting all messages:', error);
    throw error;
  }
}; 