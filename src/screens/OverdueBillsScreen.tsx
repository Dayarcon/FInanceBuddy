import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
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
import { Bill, billService } from '../services/BillService';

const OverdueBillsScreen = () => {
  const [overdueBills, setOverdueBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOverdueBills();
  }, []);

  const loadOverdueBills = async () => {
    try {
      setLoading(true);
      const bills = await billService.getBills();
      const overdueBills = bills.filter(bill => 
        bill.isCreditCard && 
        new Date(bill.dueDate) < new Date() && 
        !bill.isPaid
      );
      setOverdueBills(overdueBills);
      setError(null);
    } catch (err) {
      setError('Failed to load overdue bills');
      console.error('Error loading overdue bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (bill: Bill) => {
    try {
      await billService.markBillAsPaid(bill.id);
      setOverdueBills(prevBills => 
        prevBills.filter(b => b.id !== bill.id)
      );
      Alert.alert('Success', 'Bill marked as paid');
    } catch (err) {
      Alert.alert('Error', 'Failed to mark bill as paid');
    }
  };

  const renderBillItem = ({ item }: { item: Bill }) => (
    <View style={styles.billItem}>
      <View style={styles.billHeader}>
        <View>
          <Text style={styles.bankName}>{item.bankName}</Text>
          <Text style={styles.billName}>{item.name}</Text>
        </View>
        <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
      </View>

      <View style={styles.billDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Due Date:</Text>
          <Text style={styles.detailValue}>
            {format(new Date(item.dueDate), 'MMM dd, yyyy')}
          </Text>
        </View>
        {item.totalBalance && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Balance:</Text>
            <Text style={styles.detailValue}>
              ${item.totalBalance.toFixed(2)}
            </Text>
          </View>
        )}
        {item.minimumPayment && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Minimum Payment:</Text>
            <Text style={styles.detailValue}>
              ${item.minimumPayment.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => handleMarkAsPaid(item)}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.payButtonText}>Mark as Paid</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOverdueBills}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Overdue Credit Card Bills</Text>
        <Text style={styles.subtitle}>
          {overdueBills.length} {overdueBills.length === 1 ? 'bill' : 'bills'} overdue
        </Text>
      </View>

      <FlatList
        data={overdueBills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.emptyText}>No overdue bills</Text>
            <Text style={styles.emptySubtext}>
              All your credit card bills are up to date
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  billItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bankName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  billName: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  billDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  actions: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  payButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default OverdueBillsScreen; 