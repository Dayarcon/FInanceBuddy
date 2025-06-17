import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { getAllCreditCardBills } from '../services/creditCardService';
import { CreditCardBill } from '../services/types';

export default function CreditCardBillsScreen() {
  const [creditCardBills, setCreditCardBills] = useState<CreditCardBill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCreditCardBills();
  }, []);

  const loadCreditCardBills = async () => {
    try {
      setLoading(true);
      const bills = await getAllCreditCardBills();
      setCreditCardBills(bills);
    } catch (error) {
      console.error('Error loading credit card bills:', error);
      Alert.alert('Error', 'Failed to load credit card bills');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (bill: CreditCardBill) => {
    if (bill.status === 'fully_paid') return '#4CAF50';
    const daysUntilDue = getDaysUntilDue(bill.dueDate);
    if (daysUntilDue < 0) return '#F44336'; // Overdue
    if (daysUntilDue <= 7) return '#FF9800'; // Due soon
    return '#2196F3'; // Normal
  };

  const getStatusText = (bill: CreditCardBill) => {
    if (bill.status === 'fully_paid') return 'Paid';
    const daysUntilDue = getDaysUntilDue(bill.dueDate);
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    return `Due in ${daysUntilDue} days`;
  };

  const renderBillItem = ({ item }: { item: CreditCardBill }) => (
    <View style={[styles.billCard, { borderLeftColor: getStatusColor(item) }]}>
      <View style={styles.billHeader}>
        <View style={styles.cardInfo}>
          <Ionicons name="card" size={24} color={getStatusColor(item)} />
          <Text style={styles.cardName}>{item.bankName} - {item.cardNumber}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>{formatCurrency(item.totalAmount)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
            {getStatusText(item)}
          </Text>
        </View>
      </View>
      
      <View style={styles.billDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Bill Period:</Text>
          <Text style={styles.detailValue}>{item.billPeriod}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Due Date:</Text>
          <Text style={styles.detailValue}>{formatDate(item.dueDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Minimum Due:</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.minimumDue)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Paid Amount:</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.paidAmount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Remaining:</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.remainingAmount)}</Text>
        </View>
      </View>
    </View>
  );

  const getTotalOutstanding = () => {
    return creditCardBills
      .filter(bill => bill.status !== 'fully_paid')
      .reduce((total, bill) => total + bill.remainingAmount, 0);
  };

  const getTotalPaid = () => {
    return creditCardBills
      .filter(bill => bill.status === 'fully_paid')
      .reduce((total, bill) => total + bill.paidAmount, 0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Credit Card Bills</Text>
        <Text style={styles.subtitle}>Track your credit card expenses and payments</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={[styles.summaryValue, { color: '#F44336' }]}>
            {formatCurrency(getTotalOutstanding())}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
            {formatCurrency(getTotalPaid())}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Bills</Text>
          <Text style={styles.summaryValue}>{creditCardBills.length}</Text>
        </View>
      </View>

      {/* Bills List */}
      <FlatList
        data={creditCardBills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item.id?.toString() || ''}
        style={styles.billsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {loading ? 'Loading credit card bills...' : 'No credit card bills found'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  billsList: {
    flex: 1,
  },
  billCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  billDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
}); 