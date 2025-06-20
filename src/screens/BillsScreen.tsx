import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { BillsStackParamList } from '../types/navigation';
// @ts-ignore
import { LinearGradient } from 'expo-linear-gradient';

type BillsScreenNavigationProp = NativeStackNavigationProp<BillsStackParamList>;

const BillsScreen = () => {
  const navigation = useNavigation<BillsScreenNavigationProp>();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'paid' | 'credit' | 'regular'>('all');

  useEffect(() => {
    loadFilteredBills();
  }, [filter]);

  const loadFilteredBills = async () => {
    try {
      setLoading(true);
      let filteredBills: Bill[] = [];

      switch (filter) {
        case 'all':
          filteredBills = await billService.getBills();
          break;
        case 'upcoming':
          filteredBills = await billService.getUpcomingBills();
          break;
        case 'paid':
          filteredBills = await billService.getPaidBills();
          break;
        case 'credit':
          filteredBills = await billService.getCreditCardBills();
          break;
        case 'regular':
          filteredBills = await billService.getRegularBills();
          break;
      }

      setBills(filteredBills);
      setError(null);
    } catch (err) {
      setError('Failed to load bills');
      console.error('Error loading bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (bill: Bill) => {
    try {
      await billService.markBillAsPaid(bill.id);
      loadFilteredBills();
      Alert.alert('Success', 'Bill marked as paid');
    } catch (err) {
      Alert.alert('Error', 'Failed to mark bill as paid');
    }
  };

  const handleDeleteBill = async (bill: Bill) => {
    try {
      await billService.deleteBill(bill.id);
      loadFilteredBills();
      Alert.alert('Success', 'Bill deleted successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to delete bill');
    }
  };

  const renderBillItem = ({ item }: { item: Bill }) => (
    <View style={styles.billItem}>
      <View style={styles.billHeader}>
        <View>
          {item.isCreditCard ? (
            <Text style={styles.bankName}>{item.bankName}</Text>
          ) : (
            <Text style={styles.billName}>{item.name}</Text>
          )}
          <Text style={styles.dueDate}>
            Due: {format(new Date(item.dueDate), 'MMM dd, yyyy')}
          </Text>
        </View>
        <Text style={styles.amount}>₹{item.amount.toFixed(2)}</Text>
      </View>

      {item.isCreditCard && (
        <View style={styles.creditCardDetails}>
          {item.totalBalance && (
            <Text style={styles.creditCardDetail}>
              Total Balance: ₹{item.totalBalance.toFixed(2)}
            </Text>
          )}
          {item.minimumPayment && (
            <Text style={styles.creditCardDetail}>
              Minimum Payment: ₹{item.minimumPayment.toFixed(2)}
            </Text>
          )}
        </View>
      )}

      <View style={styles.actions}>
        {!item.isPaid && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => handleMarkAsPaid(item)}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.payButtonText}>Mark as Paid</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteBill(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={["#e0e7ff", "#fff"]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={["#e0e7ff", "#fff"]} style={styles.gradient}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFilteredBills}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#e0e7ff", "#fff"]} style={styles.gradient}>
      <View style={styles.header}>
        <Text style={styles.title}>Bills</Text>
        <TouchableOpacity
          style={styles.overdueButton}
          onPress={() => navigation.navigate('OverdueBills')}
        >
          <Ionicons name="warning" size={20} color="#FFFFFF" />
          <Text style={styles.overdueButtonText}>Overdue Bills</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'upcoming' && styles.activeFilter]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.activeFilterText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'paid' && styles.activeFilter]}
          onPress={() => setFilter('paid')}
        >
          <Text style={[styles.filterText, filter === 'paid' && styles.activeFilterText]}>
            Paid
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'credit' && styles.activeFilter]}
          onPress={() => setFilter('credit')}
        >
          <Text style={[styles.filterText, filter === 'credit' && styles.activeFilterText]}>
            Credit Cards
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'regular' && styles.activeFilter]}
          onPress={() => setFilter('regular')}
        >
          <Text style={[styles.filterText, filter === 'regular' && styles.activeFilterText]}>
            Regular Bills
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={bills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>No bills found</Text>
            <Text style={styles.emptySubtext}>
              Add a new bill to get started
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddBill')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  overdueButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overdueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#e0e7ff',
    elevation: 1,
  },
  activeFilter: {
    backgroundColor: '#007AFF',
    elevation: 2,
  },
  filterText: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  dueDate: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  creditCardDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginBottom: 12,
  },
  creditCardDetail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flex: 1,
    marginRight: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
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

export default BillsScreen; 