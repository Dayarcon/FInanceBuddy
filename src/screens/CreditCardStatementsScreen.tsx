import { Ionicons } from '@expo/vector-icons';
import { addDays, format, isAfter, isBefore, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAllTransactions, getDBConnection } from '../services/database';
import { messageParserService } from '../services/MessageParserService';

type Message = {
  id: number;
  message: string;
  date: string;
};

type Transaction = {
  id: number;
  amount: number;
  date: string;
  category: string;
  type: 'credit' | 'debit';
  account?: string;
};

type CreditCardStatement = {
  id: string;
  cardName: string;
  cardNumber: string;
  statementDate: string;
  dueDate: string;
  totalAmount: number;
  minimumDue: number;
  isPaid: boolean;
  paymentDate?: string;
  messageId: string;
};

const CreditCardStatementsScreen = () => {
  const [statements, setStatements] = useState<CreditCardStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const db = await getDBConnection();
      if (!db) {
        throw new Error('Failed to connect to database');
      }

      // Get all messages from the database
      const messages = await new Promise<Message[]>((resolve, reject) => {
        if (!db) {
          reject(new Error('Database not connected'));
          return;
        }
        (db as any).readTransaction((tx: { executeSql: (sql: string, params: any[], success: any, error: any) => void }) => {
          tx.executeSql(
            'SELECT * FROM messages WHERE message LIKE ? OR message LIKE ? OR message LIKE ?',
            ['%credit card%', '%statement%', '%bill%'],
            (_: any, { rows }: { rows: { length: number; item: (index: number) => Message } }) => {
              const items: Message[] = [];
              for (let i = 0; i < rows.length; i++) {
                items.push(rows.item(i));
              }
              resolve(items);
            },
            (_: any, error: any) => {
              reject(error);
              return false;
            }
          );
        });
      });

      // Parse messages to extract credit card statements
      const parsedStatements = messages
        .map((msg: Message) => {
          const parsedBill = messageParserService.parseCreditCardMessage(msg.message);
          if (parsedBill) {
            return {
              id: msg.id.toString(),
              cardName: parsedBill.bankName,
              cardNumber: extractCardNumber(msg.message),
              statementDate: msg.date,
              dueDate: parsedBill.dueDate,
              totalAmount: parsedBill.amount,
              minimumDue: calculateMinimumDue(parsedBill.amount),
              isPaid: false,
              messageId: msg.id.toString()
            };
          }
          return null;
        })
        .filter((statement: CreditCardStatement | null): statement is CreditCardStatement => statement !== null);

      // Get credit card payments from transactions
      const transactions = await getAllTransactions(db) as Transaction[];
      const creditCardPayments = transactions.filter((txn: Transaction) => 
        txn.category === 'Credit Card Bill' && txn.type === 'credit'
      );

      // Match payments with statements
      creditCardPayments.forEach((payment: Transaction) => {
        const matchingStatement = parsedStatements.find((statement: CreditCardStatement) => 
          statement.cardName.toLowerCase() === payment.account?.toLowerCase() &&
          Math.abs(statement.totalAmount - payment.amount) < 100
        );

        if (matchingStatement) {
          matchingStatement.isPaid = true;
          matchingStatement.paymentDate = payment.date;
        }
      });

      setStatements(parsedStatements);
    } catch (error) {
      console.error('Error loading statements:', error);
      setError(error instanceof Error ? error.message : 'Failed to load credit card statements');
      Alert.alert('Error', 'Failed to load credit card statements');
    } finally {
      setLoading(false);
    }
  };

  const extractCardNumber = (message: string): string => {
    // Try to extract last 4 digits of card number
    const cardMatch = message.match(/\d{4}(?=\s|$)/);
    return cardMatch ? `****${cardMatch[0]}` : '****';
  };

  const calculateMinimumDue = (totalAmount: number): number => {
    // Typically minimum due is 5% of total amount
    return Math.round(totalAmount * 0.05);
  };

  const getStatementStatus = (statement: CreditCardStatement) => {
    const today = new Date();
    const dueDate = parseISO(statement.dueDate);
    
    if (statement.isPaid) {
      return {
        status: 'Paid',
        color: '#4CAF50',
        icon: 'checkmark-circle' as const,
      };
    }
    
    if (isAfter(today, dueDate)) {
      return {
        status: 'Overdue',
        color: '#F44336',
        icon: 'alert-circle' as const,
      };
    }
    
    if (isBefore(today, addDays(dueDate, -7))) {
      return {
        status: 'Upcoming',
        color: '#2196F3',
        icon: 'calendar' as const,
      };
    }
    
    return {
      status: 'Due Soon',
      color: '#FF9800',
      icon: 'warning' as const,
    };
  };

  const renderStatement = ({ item }: { item: CreditCardStatement }) => {
    const status = getStatementStatus(item);
    
    return (
      <TouchableOpacity
        style={styles.statementCard}
        onPress={() => {
          Alert.alert(
            'Statement Details',
            `Card: ${item.cardName} (${item.cardNumber})\n` +
            `Statement Date: ${format(parseISO(item.statementDate), 'MMM dd, yyyy')}\n` +
            `Due Date: ${format(parseISO(item.dueDate), 'MMM dd, yyyy')}\n` +
            `Total Amount: ₹${item.totalAmount.toLocaleString()}\n` +
            `Minimum Due: ₹${item.minimumDue.toLocaleString()}\n`
          );
        }}
      >
        <View style={styles.statusContainer}>
          <Ionicons name={status.icon} size={24} color={status.color} />
          <Text style={styles.statusText}>{status.status}</Text>
        </View>
        <Text style={styles.cardName}>{item.cardName}</Text>
        <Text style={styles.cardNumber}>{item.cardNumber}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={statements}
          renderItem={renderStatement}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContainer: {
    padding: 10,
  },
  statementCard: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardNumber: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default CreditCardStatementsScreen;