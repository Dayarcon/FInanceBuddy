import SmsAndroid from 'react-native-get-sms-android';
import {
    insertCreditCardBill,
    insertCreditCardPayment,
    matchPaymentsToBills,
    parseCreditCardBill,
    parseCreditCardPayment
} from './creditCardService';
import { getDBConnection } from './database';

type SMS = {
  body: string;
  date: number;
  address: string;
};

export type SyncResult = {
  billsFound: number;
  paymentsFound: number;
  billsInserted: number;
  paymentsInserted: number;
  matchesCreated: number;
  success: boolean;
  error?: string;
};

export const syncCreditCardData = async (): Promise<SyncResult> => {
  return new Promise((resolve, reject) => {
    const filter = {
      box: 'inbox',
      maxCount: 1000
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: any) => {
        console.error('SMS list failed:', fail);
        resolve({ 
          billsFound: 0, 
          paymentsFound: 0, 
          billsInserted: 0, 
          paymentsInserted: 0, 
          matchesCreated: 0, 
          success: false, 
          error: 'Failed to read SMS' 
        });
      },
      async (count: number, smsList: string) => {
        try {
          const db = await getDBConnection();
          const messages: SMS[] = JSON.parse(smsList);
          
          let billsFound = 0;
          let paymentsFound = 0;
          let billsInserted = 0;
          let paymentsInserted = 0;
          
          console.log(`Processing ${messages.length} SMS messages for credit card data`);
          
          for (const sms of messages) {
            try {
              // Check if it's a bank SMS
              if (!sms.address.match(/(HDFC|ICICI|SBI|AXIS|KOTAK|YES|BANK|CARD)/i)) {
                continue;
              }

              // Try to parse as credit card bill
              const bill = parseCreditCardBill(sms.body);
              if (bill) {
                billsFound++;
                console.log(`Found credit card bill: ${bill.bankName} ${bill.cardNumber} - ₹${bill.totalAmount}`);
                
                // Check for duplicate bill
                const existingBills = await new Promise<any[]>((resolve, reject) => {
                  db.transaction(tx => {
                    tx.executeSql(
                      `SELECT * FROM credit_card_bills 
                       WHERE cardNumber = ? AND billPeriod = ?
                       LIMIT 1`,
                      [bill.cardNumber, bill.billPeriod],
                      (_, { rows }) => {
                        const items = [];
                        for (let i = 0; i < rows.length; i++) {
                          items.push(rows.item(i));
                        }
                        resolve(items);
                      },
                      (_, error) => {
                        reject(error);
                        return false;
                      }
                    );
                  });
                });
                
                if (existingBills.length === 0) {
                  await insertCreditCardBill(bill);
                  billsInserted++;
                  console.log(`Inserted credit card bill: ${bill.bankName} ${bill.cardNumber}`);
                } else {
                  console.log(`Skipping duplicate bill: ${bill.bankName} ${bill.cardNumber} ${bill.billPeriod}`);
                }
                continue;
              }

              // Try to parse as credit card payment
              const payment = parseCreditCardPayment(sms.body);
              if (payment) {
                paymentsFound++;
                console.log(`Found credit card payment: ${payment.bankName} ${payment.cardNumber} - ₹${payment.paymentAmount}`);
                
                // Check for duplicate payment
                const existingPayments = await new Promise<any[]>((resolve, reject) => {
                  db.transaction(tx => {
                    tx.executeSql(
                      `SELECT * FROM credit_card_payments 
                       WHERE cardNumber = ? AND paymentAmount = ? AND paymentDate = ?
                       LIMIT 1`,
                      [payment.cardNumber, payment.paymentAmount, payment.paymentDate],
                      (_, { rows }) => {
                        const items = [];
                        for (let i = 0; i < rows.length; i++) {
                          items.push(rows.item(i));
                        }
                        resolve(items);
                      },
                      (_, error) => {
                        reject(error);
                        return false;
                      }
                    );
                  });
                });
                
                if (existingPayments.length === 0) {
                  await insertCreditCardPayment(payment);
                  paymentsInserted++;
                  console.log(`Inserted credit card payment: ${payment.bankName} ${payment.cardNumber}`);
                } else {
                  console.log(`Skipping duplicate payment: ${payment.bankName} ${payment.cardNumber}`);
                }
              }
            } catch (error) {
              console.error('Error processing SMS:', error);
            }
          }
          
          // Match payments to bills
          console.log('Matching payments to bills...');
          await matchPaymentsToBills(null);
          
          // Get count after matching
          const afterCount = await new Promise<any[]>((resolve, reject) => {
            db.transaction(tx => {
              tx.executeSql(
                `SELECT COUNT(*) as count FROM credit_card_payments 
                 WHERE matchedBillId IS NOT NULL`,
                [],
                (_, { rows }) => {
                  const items = [];
                  for (let i = 0; i < rows.length; i++) {
                    items.push(rows.item(i));
                  }
                  resolve(items);
                },
                (_, error) => {
                  reject(error);
                  return false;
                }
              );
            });
          });
          const matchesCreated = afterCount[0]?.count || 0;
          
          console.log(`Credit card sync completed: ${billsInserted} bills, ${paymentsInserted} payments, ${matchesCreated} matches`);
          
          resolve({
            billsFound,
            paymentsFound,
            billsInserted,
            paymentsInserted,
            matchesCreated,
            success: true
          });
        } catch (error) {
          console.error('Credit card sync error:', error);
          resolve({
            billsFound: 0,
            paymentsFound: 0,
            billsInserted: 0,
            paymentsInserted: 0,
            matchesCreated: 0,
            success: false,
            error: 'Database error'
          });
        }
      }
    );
  });
};

// Function to manually match payments to bills
export const manualMatchPaymentsToBills = async (): Promise<{ success: boolean; matchesCreated: number; error?: string }> => {
  try {
    const db = await getDBConnection();
    
    // Get count before matching
    const beforeCount = await new Promise<any[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT COUNT(*) as count FROM credit_card_payments 
           WHERE matchedBillId IS NOT NULL`,
          [],
          (_, { rows }) => {
            const items = [];
            for (let i = 0; i < rows.length; i++) {
              items.push(rows.item(i));
            }
            resolve(items);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
    const beforeMatches = beforeCount[0]?.count || 0;
    
    // Perform matching
    await matchPaymentsToBills(null);
    
    // Get count after matching
    const afterCount = await new Promise<any[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT COUNT(*) as count FROM credit_card_payments 
           WHERE matchedBillId IS NOT NULL`,
          [],
          (_, { rows }) => {
            const items = [];
            for (let i = 0; i < rows.length; i++) {
              items.push(rows.item(i));
            }
            resolve(items);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
    const afterMatches = afterCount[0]?.count || 0;
    
    const newMatches = afterMatches - beforeMatches;
    
    return {
      success: true,
      matchesCreated: newMatches
    };
  } catch (error) {
    console.error('Error in manual matching:', error);
    return {
      success: false,
      matchesCreated: 0,
      error: 'Failed to match payments'
    };
  }
};

// Function to get credit card summary
export const getCreditCardSummary = async () => {
  try {
    const db = await getDBConnection();
    
    // Get total outstanding amount
    const outstandingResult = await new Promise<any[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT SUM(remainingAmount) as total FROM credit_card_bills 
           WHERE status != 'fully_paid'`,
          [],
          (_, { rows }) => {
            const items = [];
            for (let i = 0; i < rows.length; i++) {
              items.push(rows.item(i));
            }
            resolve(items);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
    const totalOutstanding = outstandingResult[0]?.total || 0;
    
    // Get total minimum due
    const minDueResult = await new Promise<any[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT SUM(minimumDue) as total FROM credit_card_bills 
           WHERE status != 'fully_paid'`,
          [],
          (_, { rows }) => {
            const items = [];
            for (let i = 0; i < rows.length; i++) {
              items.push(rows.item(i));
            }
            resolve(items);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
    const totalMinDue = minDueResult[0]?.total || 0;
    
    // Get overdue bills count
    const overdueResult = await new Promise<any[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT COUNT(*) as count FROM credit_card_bills 
           WHERE status != 'fully_paid' AND dueDate < ?`,
          [new Date().toISOString()],
          (_, { rows }) => {
            const items = [];
            for (let i = 0; i < rows.length; i++) {
              items.push(rows.item(i));
            }
            resolve(items);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
    const overdueCount = overdueResult[0]?.count || 0;
    
    // Get total bills count
    const totalBillsResult = await new Promise<any[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT COUNT(*) as count FROM credit_card_bills`,
          [],
          (_, { rows }) => {
            const items = [];
            for (let i = 0; i < rows.length; i++) {
              items.push(rows.item(i));
            }
            resolve(items);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
    const totalBills = totalBillsResult[0]?.count || 0;
    
    // Get total payments count
    const totalPaymentsResult = await new Promise<any[]>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT COUNT(*) as count FROM credit_card_payments`,
          [],
          (_, { rows }) => {
            const items = [];
            for (let i = 0; i < rows.length; i++) {
              items.push(rows.item(i));
            }
            resolve(items);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
    const totalPayments = totalPaymentsResult[0]?.count || 0;
    
    return {
      totalOutstanding,
      totalMinDue,
      overdueCount,
      totalBills,
      totalPayments
    };
  } catch (error) {
    console.error('Error getting credit card summary:', error);
    return {
      totalOutstanding: 0,
      totalMinDue: 0,
      overdueCount: 0,
      totalBills: 0,
      totalPayments: 0
    };
  }
}; 