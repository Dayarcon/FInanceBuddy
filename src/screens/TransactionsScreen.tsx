import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Clipboard
} from 'react-native';
import { getAllTransactions, getDBConnection } from '../services/database';
import { Transaction } from '../types/transaction';
import { transactionCategorizer, Category, categoryRules, getCategoryDefinition } from '../utils/transactionCategorizer';
// @ts-ignore
import { LinearGradient } from 'expo-linear-gradient';

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
  const [selectedTransactionForEdit, setSelectedTransactionForEdit] = useState<Transaction | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [transactionCategories, setTransactionCategories] = useState<Record<string, string>>({});
  const [categorySearch, setCategorySearch] = useState('');
  const router = useRouter();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
        return `Credit in - ${monthYear}`;
      case 'debit':
        return `Debit in - ${monthYear}`;
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

  const handleCategoryChange = async (transaction: Transaction, newCategory: Category) => {
    try {
      const db = await getDBConnection();
      if (!db) {
        throw new Error('Failed to connect to database');
      }

      // Update transaction in database
      await db.transaction(tx => {
        tx.executeSql(
          'UPDATE transactions SET category = ? WHERE id = ?',
          [newCategory, transaction.id]
        );
      });

      // Learn from the correction
      await transactionCategorizer.learnFromCorrection(transaction, newCategory);

      // Update local state
      setTransactions(prevTransactions =>
        prevTransactions.map(t =>
          t.id === transaction.id ? { ...t, category: newCategory } : t
        )
      );

      // Update categories state
      setTransactionCategories(prev => ({
        ...prev,
        [transaction.id]: newCategory
      }));

      Alert.alert('Success', 'Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Error', 'Failed to update category');
    }
  };

  // Add useEffect to handle categorization
  useEffect(() => {
    const categorizeTransactions = async () => {
      const categories: Record<string, string> = {};
      for (const transaction of transactions) {
        if (!transaction.category) {
          const result = await transactionCategorizer.categorizeTransaction(transaction);
          categories[transaction.id] = result.category;
        }
      }
      setTransactionCategories(categories);
    };

    categorizeTransactions();
  }, [transactions]);

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isDebit = item.type === 'debit';
    const recipientOrSender = isDebit ? item.recipient : item.recipient;
    const category = item.category || transactionCategories[item.id] || 'Other';
    const categoryDef = getCategoryDefinition(category);

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => setSelectedTransaction(item)}
        onLongPress={() => {
          setSelectedTransactionForEdit(item);
          setShowCategoryPicker(true);
        }}
        delayLongPress={500}
      >
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionDate}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
          <Text style={[styles.amount, isDebit ? styles.debit : styles.credit]}>
            {isDebit ? '-' : '+'}₹{item.amount.toLocaleString()}
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
            <Ionicons name={categoryDef.icon as any} size={14} color={categoryDef.color} />
            <Text style={[styles.categoryText, { color: categoryDef.color }]}>
              {category}
            </Text>
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
                      styles.filterText,
                      filter === type && styles.activeFilterText
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
                  styles.filterText,
                  sortBy === type && styles.activeFilterText
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
        <View style={styles.detailCard}>
          {selectedTransaction && (
            <>
              <View style={styles.detailIconRow}>
                <Ionicons
                  name={selectedTransaction.type === 'credit' ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={40}
                  color={selectedTransaction.type === 'credit' ? '#4CAF50' : '#F44336'}
                  style={{ marginBottom: 8 }}
                />
              </View>
              <Text style={styles.detailAmount}>
                {selectedTransaction.type === 'credit' ? '+' : '-'}₹{selectedTransaction.amount.toFixed(2)}
              </Text>
              <View style={styles.detailDivider} />
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
                  <Text style={[styles.detailValue, { fontWeight: '500', color: '#333' }]}> {selectedTransaction.recipient}</Text>
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
                    const category = selectedTransaction.category || 
                      transactionCategories[selectedTransaction.id] || 'Other';
                    const categoryDef = getCategoryDefinition(category);
                    return (
                      <>
                        <Ionicons name={categoryDef.icon as any} size={16} color={categoryDef.color} />
                        <Text style={[styles.detailValue, { color: categoryDef.color, fontWeight: '600', marginLeft: 4 }]}> {category}</Text>
                      </>
                    );
                  })()}
                </View>
              </View>
              {selectedTransaction.source_sms && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Source SMS:</Text>
                  <View style={styles.smsContent}>
                    <Ionicons name="chatbubble" size={16} color="#666" />
                    <Text style={[styles.detailValue, styles.smsText]} numberOfLines={3} ellipsizeMode="tail">{selectedTransaction.source_sms}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => Clipboard.setString(selectedTransaction.source_sms)}
                    >
                      <Ionicons name="copy" size={18} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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

  const renderCategoryPickerModal = () => (
    <Modal
      visible={showCategoryPicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCategoryPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Category</Text>
          <ScrollView style={styles.categoryList}>
            {Object.values(categoryRules).map((catDef) => {
              const isSelected = selectedTransactionForEdit &&
                (selectedTransactionForEdit.category || transactionCategories[selectedTransactionForEdit.id]) === catDef.name;
              return (
                <TouchableOpacity
                  key={catDef.name}
                  style={[
                    styles.categoryItem,
                    isSelected && { backgroundColor: catDef.color + '22' }
                  ]}
                  onPress={async () => {
                    if (selectedTransactionForEdit) {
                      await handleCategoryChange(selectedTransactionForEdit, catDef.name);
                      setShowCategoryPicker(false);
                    }
                  }}
                >
                  <View style={styles.categoryItemContent}>
                    <Ionicons name={catDef.icon as any} size={20} color={catDef.color} />
                    <Text style={[styles.categoryItemText, { color: catDef.color, fontWeight: isSelected ? 'bold' : '500' }]}>{catDef.name}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={catDef.color} style={{ marginLeft: 8 }} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowCategoryPicker(false)}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const summary = getTransactionSummary();

  return (
    <LinearGradient colors={["#e0e7ff", "#fff"]} style={styles.gradient}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity
          style={styles.filterIconButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'credit' && styles.activeFilter]}
          onPress={() => setFilter('credit')}
        >
          <Text style={[styles.filterText, filter === 'credit' && styles.activeFilterText]}>Credit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'debit' && styles.activeFilter]}
          onPress={() => setFilter('debit')}
        >
          <Text style={[styles.filterText, filter === 'debit' && styles.activeFilterText]}>Debit</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list" size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>Add a new transaction to get started</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={onRefresh}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/add-transaction')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {renderFilterModal()}
      {renderTransactionDetailModal()}
      {renderCategoryPickerModal()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  filterIconButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    marginBottom: 20,
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
  transactionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  debit: {
    color: '#F44336',
  },
  credit: {
    color: '#4CAF50',
  },
  transactionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  bankText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  recipientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  recipientText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 5,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryItemText: {
    fontSize: 16,
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
  smsContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  smsText: {
    textAlign: 'left',
    flex: 1,
    lineHeight: 20,
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
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    width: '92%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 40,
    marginBottom: 40,
  },
  detailIconRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  detailAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
    borderRadius: 1,
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#e0e7ff',
  },
}); 