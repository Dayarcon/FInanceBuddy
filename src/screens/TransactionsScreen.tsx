import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    categorizeTransaction,
    CustomCategoryRule,
    defaultCustomRules,
    getCategoryDefinition
} from '../services/categoryService';
import { getAllTransactions, getDBConnection } from '../services/database';
import { Transaction } from '../types/transaction';

type FilterType = 'all' | 'credit' | 'debit';
type SortType = 'date' | 'amount' | 'bank';

export default function TransactionsScreen() {
  const params = useLocalSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [customRules, setCustomRules] = useState<CustomCategoryRule[]>([]);
  const router = useRouter();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Load custom rules (same as in Reports screen)
  const loadCustomRules = () => {
    setCustomRules(defaultCustomRules);
  };

  useEffect(() => {
    loadCustomRules();
  }, []);

  // Set initial filter from URL params
  useEffect(() => {
    if (params.filter === 'credit') {
      setFilter('credit');
    } else if (params.filter === 'debit') {
      setFilter('debit');
    }
  }, [params.filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const db = await getDBConnection();
      const txns = await getAllTransactions(db);
      setTransactions(txns);
      console.log(`Loaded ${txns.length} transactions`);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert(
        'Database Error', 
        'Failed to load transactions. Please restart the app.',
        [{ text: 'OK' }]
      );
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadTransactions();
    }, [])
  );

  useEffect(() => {
    let filtered = transactions;

    // Filter by month
    const currentYear = selectedMonth.getFullYear();
    const currentMonth = selectedMonth.getMonth();
    
    filtered = filtered.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate.getFullYear() === currentYear && txnDate.getMonth() === currentMonth;
    });

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(t => t.type === filter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.recipient?.toLowerCase().includes(query) ||
        t.account?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query) ||
        t.amount.toString().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'amount':
          return b.amount - a.amount;
        case 'bank':
          return (a.bank || '').localeCompare(b.bank || '');
        default:
          return 0;
      }
    });

    setFilteredTransactions(filtered);
  }, [transactions, filter, sortBy, searchQuery, selectedMonth]);

  const getTransactionSummary = () => {
    const total = filteredTransactions.length;
    const credit = filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const debit = filteredTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    return { total, credit, debit };
  };

  const getFilterTitle = () => {
    const monthYear = `${months[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;
    switch (filter) {
      case 'credit':
        return `Credit Transactions - ${monthYear}`;
      case 'debit':
        return `Debit Transactions - ${monthYear}`;
      default:
        return `${monthYear}`;
    }
  };

  const formatMonthYear = (date: Date) => {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedMonth(newDate);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const recipientOrSender = item.party 
      ? (item.type === 'debit' ? `To: ${item.party}` : `From: ${item.party}`)
      : 'Unknown';

    const isDebit = item.type === 'debit';
    const amountColor = isDebit ? '#F44336' : '#4CAF50';
    const bgColor = isDebit ? '#fef2f2' : '#f0f9f0';

    return (
      <TouchableOpacity 
        style={[
          styles.transactionItem,
          { 
            backgroundColor: bgColor,
            borderLeftColor: amountColor,
            borderLeftWidth: 4
          }
        ]}
        onPress={() => setSelectedTransaction(item)}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.amountContainer}>
            <Ionicons 
              name={isDebit ? 'arrow-down-circle' : 'arrow-up-circle'} 
              size={20} 
              color={amountColor}
            />
            <Text style={[styles.amountText, { color: amountColor }]}>
              {isDebit ? '-' : '+'}₹{item.amount.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.transactionDetails}>
          <View style={styles.bankContainer}>
            <Ionicons name="business" size={16} color="#666" />
            <Text style={styles.bankText}>{item.bank}</Text>
          </View>
          <View style={styles.recipientContainer}>
            <Ionicons 
              name={isDebit ? 'person' : 'person-add'} 
              size={16} 
              color="#666" 
            />
            <Text style={styles.recipientText}>{recipientOrSender}</Text>
          </View>
          <View style={styles.categoryContainer}>
            {(() => {
              const category = categorizeTransaction(item, customRules);
              const categoryDef = getCategoryDefinition(category);
              return (
                <>
                  <Ionicons name={categoryDef.icon as any} size={14} color={categoryDef.color} />
                  <Text style={[styles.categoryText, { color: categoryDef.color }]}>
                    {category}
                  </Text>
                </>
              );
            })()}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter & Sort</Text>
          
          {/* Only show type filter if not already filtered */}
          {!params.filter && (
            <>
              <Text style={styles.sectionTitle}>Filter by Type</Text>
              <View style={styles.filterButtons}>
                {(['all', 'credit', 'debit'] as FilterType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterButton,
                      filter === type && styles.filterButtonActive
                    ]}
                    onPress={() => setFilter(type)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      filter === type && styles.filterButtonTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Sort by</Text>
          <View style={styles.filterButtons}>
            {(['date', 'amount', 'bank'] as SortType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  sortBy === type && styles.filterButtonActive
                ]}
                onPress={() => setSortBy(type)}
              >
                <Text style={[
                  styles.filterButtonText,
                  sortBy === type && styles.filterButtonTextActive
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderTransactionDetailModal = () => (
    <Modal
      visible={!!selectedTransaction}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setSelectedTransaction(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {selectedTransaction && (
            <>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={[
                  styles.detailValue,
                  { color: selectedTransaction.type === 'credit' ? '#4CAF50' : '#F44336' }
                ]}>
                  {selectedTransaction.type === 'credit' ? '+' : '-'}₹{selectedTransaction.amount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>
                  {selectedTransaction.type.charAt(0).toUpperCase() + selectedTransaction.type.slice(1)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedTransaction.date).toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bank:</Text>
                <Text style={styles.detailValue}>{selectedTransaction.bank || 'Unknown'}</Text>
              </View>

              {selectedTransaction.recipient && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {selectedTransaction.type === 'debit' ? 'To:' : 'From:'}
                  </Text>
                  <Text style={[styles.detailValue, { fontWeight: '500', color: '#333' }]}>
                    {selectedTransaction.recipient}
                  </Text>
                </View>
              )}

              {selectedTransaction.notes && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Notes:</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.notes}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category:</Text>
                <View style={styles.categoryContainer}>
                  {(() => {
                    const category = categorizeTransaction(selectedTransaction, customRules);
                    const categoryDef = getCategoryDefinition(category);
                    return (
                      <>
                        <Ionicons name={categoryDef.icon as any} size={16} color={categoryDef.color} />
                        <Text style={[styles.detailValue, { color: categoryDef.color, fontWeight: '600' }]}>
                          {category}
                        </Text>
                      </>
                    );
                  })()}
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedTransaction(null)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const summary = getTransactionSummary();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{getFilterTitle()}</Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity 
          style={styles.monthButton}
          onPress={() => changeMonth('prev')}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.monthDisplay}
          onPress={() => setShowMonthPicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#666" />
          <Text style={styles.monthText}>{formatMonthYear(selectedMonth)}</Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.monthButton}
          onPress={() => changeMonth('next')}
        >
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search transactions..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Credit</Text>
          <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>₹{summary.credit.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Debit</Text>
          <Text style={[styles.summaryValue, { color: '#F44336' }]}>₹{summary.debit.toFixed(2)}</Text>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id?.toString() || ''}
        renderItem={renderTransaction}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <Text style={styles.emptyText}>Loading transactions...</Text>
            ) : (
              <Text style={styles.emptyText}>No transactions found for {formatMonthYear(selectedMonth)}</Text>
            )}
          </View>
        }
        style={styles.transactionList}
      />

      {renderFilterModal()}
      {renderTransactionDetailModal()}
      
      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Month</Text>
            
            <View style={styles.monthGrid}>
              {months.map((month, index) => {
                const monthDate = new Date(selectedMonth.getFullYear(), index);
                const isSelected = selectedMonth.getMonth() === index;
                
                return (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthOption,
                      isSelected && styles.monthOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedMonth(monthDate);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.monthOptionText,
                      isSelected && styles.monthOptionTextSelected
                    ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMonthPicker(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  filterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
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
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  transactionDetails: {
    gap: 8,
  },
  bankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  recipientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipientText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#1a1a1a',
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  filterOptionSelected: {
    backgroundColor: '#f0f8ff',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthOption: {
    width: '30%',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  monthOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  monthOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  monthOptionTextSelected: {
    color: '#fff',
  },
}); 