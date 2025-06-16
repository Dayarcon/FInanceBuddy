import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import {
  CustomCategoryRule,
  categorizeTransaction,
  categoryDefinitions,
  defaultCustomRules,
  getCategoryDefinition
} from '../services/categoryService';
import { getAllTransactions, getDBConnection } from '../services/database';

type SpendingByPlace = {
  place: string;
  amount: number;
  count: number;
};

type SpendingByBank = {
  bank: string;
  amount: number;
  count: number;
};

type SpendingByCategory = {
  category: string;
  amount: number;
  count: number;
  color: string;
  icon: string;
};

export default function ReportsScreen() {
  const [summary, setSummary] = useState({ credit: 0, debit: 0 });
  const [spendingByPlace, setSpendingByPlace] = useState<SpendingByPlace[]>([]);
  const [spendingByBank, setSpendingByBank] = useState<SpendingByBank[]>([]);
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCategoryRules, setShowCategoryRules] = useState(false);
  const [customRules, setCustomRules] = useState<CustomCategoryRule[]>([]);
  const [newRuleSender, setNewRuleSender] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('');
  const [editingRule, setEditingRule] = useState<CustomCategoryRule | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Load custom rules from storage (you can implement AsyncStorage here)
  const loadCustomRules = () => {
    // For now, we'll use the default rules. In production, use AsyncStorage
    setCustomRules(defaultCustomRules);
  };

  useEffect(() => {
    loadCustomRules();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const db = await getDBConnection();
        const txns = await getAllTransactions(db);
        
        // Filter transactions for selected month
        const currentYear = selectedMonth.getFullYear();
        const currentMonth = selectedMonth.getMonth();
        
        const monthTransactions = txns.filter(t => {
          const txnDate = new Date(t.date);
          return txnDate.getFullYear() === currentYear && txnDate.getMonth() === currentMonth;
        });
        
        // Calculate income vs expenses
        const credit = monthTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
        const debit = monthTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
        setSummary({ credit, debit });
        setTotalSpent(debit);

        // Calculate spending by bank (account-based)
        const bankMap = new Map<string, { amount: number; count: number }>();
        
        // Calculate spending by place (merchant-based) - extract from SMS content
        const placeMap = new Map<string, { amount: number; count: number }>();
        
        // Calculate spending by category
        const categoryMap = new Map<string, { amount: number; count: number }>();
        
        monthTransactions.forEach(txn => {
          // Bank-based spending
          const bank = txn.account || 'Unknown Bank';
          const existingBank = bankMap.get(bank) || { amount: 0, count: 0 };
          bankMap.set(bank, {
            amount: existingBank.amount + txn.amount,
            count: existingBank.count + 1
          });

          // Place-based spending - extract merchant from SMS content
          const place = extractMerchantFromSMS(txn.source_sms || txn.notes || '') || 'Unknown Place';
          const existingPlace = placeMap.get(place) || { amount: 0, count: 0 };
          placeMap.set(place, {
            amount: existingPlace.amount + txn.amount,
            count: existingPlace.count + 1
          });

          // Category-based spending
          const category = categorizeTransaction(txn, customRules);
          const existingCategory = categoryMap.get(category) || { amount: 0, count: 0 };
          categoryMap.set(category, {
            amount: existingCategory.amount + txn.amount,
            count: existingCategory.count + 1
          });
        });

        const bankArray: SpendingByBank[] = Array.from(bankMap.entries())
          .map(([bank, data]) => ({
            bank,
            amount: data.amount,
            count: data.count
          }))
          .sort((a, b) => b.amount - a.amount);

        const placeArray: SpendingByPlace[] = Array.from(placeMap.entries())
          .map(([place, data]) => ({
            place,
            amount: data.amount,
            count: data.count
          }))
          .sort((a, b) => b.amount - a.amount);

        const categoryArray: SpendingByCategory[] = Array.from(categoryMap.entries())
          .map(([category, data]) => {
            const categoryDef = getCategoryDefinition(category) || 
                              { name: 'Other', color: '#607D8B', icon: 'help-circle' };
            return {
              category,
              amount: data.amount,
              count: data.count,
              color: categoryDef.color,
              icon: categoryDef.icon
            };
          })
          .sort((a, b) => b.amount - a.amount);

        setSpendingByBank(bankArray);
        setSpendingByPlace(placeArray);
        setSpendingByCategory(categoryArray);
      } catch (error) {
        console.error('Error loading report data:', error);
      }
    };
    loadData();
  }, [selectedMonth]);

  // Function to add new custom rule
  const addCustomRule = () => {
    if (!newRuleSender.trim() || !newRuleCategory.trim()) {
      Alert.alert('Error', 'Please enter both sender and category');
      return;
    }

    if (editingRule) {
      // Update existing rule
      const updatedRules = customRules.map(rule => 
        rule.id === editingRule.id 
          ? { ...rule, sender: newRuleSender.trim().toLowerCase(), category: newRuleCategory.trim() }
          : rule
      );
      setCustomRules(updatedRules);
      setEditingRule(null);
    } else {
      // Add new rule
      const newRule: CustomCategoryRule = {
        id: Date.now().toString(),
        sender: newRuleSender.trim().toLowerCase(),
        category: newRuleCategory.trim()
      };
      setCustomRules([...customRules, newRule]);
    }

    setNewRuleSender('');
    setNewRuleCategory('');
  };

  // Function to start editing a rule
  const startEditingRule = (rule: CustomCategoryRule) => {
    setEditingRule(rule);
    setNewRuleSender(rule.sender);
    setNewRuleCategory(rule.category);
  };

  // Function to cancel editing
  const cancelEditing = () => {
    setEditingRule(null);
    setNewRuleSender('');
    setNewRuleCategory('');
  };

  // Function to delete custom rule
  const deleteCustomRule = (ruleId: string) => {
    Alert.alert(
      'Delete Rule',
      'Are you sure you want to delete this rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => setCustomRules(customRules.filter(rule => rule.id !== ruleId))
        }
      ]
    );
  };

  // Function to extract merchant/place from SMS content
  const extractMerchantFromSMS = (smsText: string): string | null => {
    if (!smsText) return null;
    
    // Common merchant patterns in SMS
    const patterns = [
      /(?:at|from|via)\s+([A-Z][A-Z\s&]+?)(?:\s|$|\.|,)/i,
      /(?:purchase|payment|transaction)\s+(?:at|from)\s+([A-Z][A-Z\s&]+?)(?:\s|$|\.|,)/i,
      /(?:merchant|store|shop):\s*([A-Z][A-Z\s&]+?)(?:\s|$|\.|,)/i,
      /(?:UPI|PAYTM|GPAY)\s+(?:to|at)\s+([A-Z][A-Z\s&]+?)(?:\s|$|\.|,)/i,
    ];

    for (const pattern of patterns) {
      const match = smsText.match(pattern);
      if (match && match[1]) {
        const merchant = match[1].trim();
        if (merchant.length > 2 && merchant.length < 50) {
          return merchant;
        }
      }
    }

    // If no pattern matches, try to extract any capitalized words that might be merchant names
    const words = smsText.split(/\s+/);
    const potentialMerchants = words.filter(word => 
      word.length > 2 && 
      word === word.toUpperCase() && 
      !['INR', 'RS', 'DEBIT', 'CREDIT', 'ACCOUNT', 'BALANCE', 'TRANSACTION'].includes(word)
    );

    return potentialMerchants.length > 0 ? potentialMerchants[0] : null;
  };

  const data = [
    { name: 'Income', amount: summary.credit, color: '#4CAF50', legendFontColor: '#333', legendFontSize: 15 },
    { name: 'Expenses', amount: summary.debit, color: '#F44336', legendFontColor: '#333', legendFontSize: 15 }
  ];

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

  const renderSpendingItem = ({ item, index }: { item: SpendingByPlace; index: number }) => (
    <View style={[
      styles.spendingItem,
      index === spendingByPlace.length - 1 && styles.spendingItemLast
    ]}>
      <View style={styles.spendingInfo}>
        <Text style={styles.spendingName}>{item.place}</Text>
        <Text style={styles.spendingDetails}>{item.count} transactions</Text>
      </View>
      <Text style={styles.spendingAmount}>₹{item.amount.toFixed(2)}</Text>
    </View>
  );

  const renderBankItem = ({ item, index }: { item: SpendingByBank; index: number }) => (
    <View style={[
      styles.spendingItem,
      index === spendingByBank.length - 1 && styles.spendingItemLast
    ]}>
      <View style={styles.spendingInfo}>
        <Text style={styles.spendingName}>{item.bank}</Text>
        <Text style={styles.spendingDetails}>{item.count} transactions</Text>
      </View>
      <Text style={styles.spendingAmount}>₹{item.amount.toFixed(2)}</Text>
    </View>
  );

  const renderCategoryItem = ({ item, index }: { item: SpendingByCategory; index: number }) => (
    <View style={[
      styles.spendingItem,
      index === spendingByCategory.length - 1 && styles.spendingItemLast
    ]}>
      <View style={styles.spendingInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={item.icon as any} size={16} color={item.color} />
          <Text style={styles.spendingName}>{item.category}</Text>
        </View>
        <Text style={styles.spendingDetails}>{item.count} transactions</Text>
      </View>
      <Text style={[styles.spendingAmount, { color: item.color }]}>₹{item.amount.toFixed(2)}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Financial Reports</Text>
        <Text style={styles.headerSubtitle}>Your spending insights</Text>
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
      
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.incomeCard]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, styles.incomeIcon]}>
              <Ionicons name="trending-up" size={24} color="#fff" />
            </View>
            <Text style={styles.cardLabel}>Monthly Income</Text>
          </View>
          <Text style={[styles.cardAmount, styles.incomeAmount]}>
            ₹{summary.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
        
        <View style={[styles.summaryCard, styles.expenseCard]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, styles.expenseIcon]}>
              <Ionicons name="trending-down" size={24} color="#fff" />
            </View>
            <Text style={styles.cardLabel}>Monthly Spent</Text>
          </View>
          <Text style={[styles.cardAmount, styles.expenseAmount]}>
            ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* Pie Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Income vs Expenses - {formatMonthYear(selectedMonth)}</Text>
        <View style={styles.chartCard}>
          <PieChart
            data={data}
            width={Dimensions.get('window').width - 80}
            height={240}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              color: () => '#000',
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="10"
            absolute
          />
        </View>
      </View>

      {/* Spending by Bank */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Spending from Banks - {formatMonthYear(selectedMonth)}</Text>
        {spendingByBank.length > 0 ? (
          <FlatList
            data={spendingByBank}
            renderItem={renderBankItem}
            keyExtractor={(item) => item.bank}
            scrollEnabled={false}
            style={styles.spendingList}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="information-circle" size={32} color="#ccc" />
            <Text style={styles.noDataText}>No bank spending data available for {formatMonthYear(selectedMonth)}</Text>
          </View>
        )}
      </View>

      {/* Spending by Place */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Spending at Places - {formatMonthYear(selectedMonth)}</Text>
        {spendingByPlace.length > 0 ? (
          <FlatList
            data={spendingByPlace}
            renderItem={renderSpendingItem}
            keyExtractor={(item) => item.place}
            scrollEnabled={false}
            style={styles.spendingList}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="information-circle" size={32} color="#ccc" />
            <Text style={styles.noDataText}>No place spending data available for {formatMonthYear(selectedMonth)}</Text>
          </View>
        )}
      </View>

      {/* Spending by Category */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Spending by Category - {formatMonthYear(selectedMonth)}</Text>
          <TouchableOpacity 
            style={styles.categoryRulesButton}
            onPress={() => setShowCategoryRules(true)}
          >
            <Ionicons name="settings" size={20} color="#007AFF" />
            <Text style={styles.categoryRulesButtonText}>Rules</Text>
          </TouchableOpacity>
        </View>
        
        {/* Category Pie Chart */}
        {spendingByCategory.length > 0 && (
          <View style={styles.chartCard}>
            <PieChart
              data={spendingByCategory.map(item => ({
                name: item.category,
                amount: item.amount,
                color: item.color,
                legendFontColor: '#333',
                legendFontSize: 12
              }))}
              width={Dimensions.get('window').width - 80}
              height={200}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                color: () => '#000',
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="10"
              absolute
            />
          </View>
        )}
        
        {spendingByCategory.length > 0 ? (
          <FlatList
            data={spendingByCategory}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.category}
            scrollEnabled={false}
            style={styles.spendingList}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="information-circle" size={32} color="#ccc" />
            <Text style={styles.noDataText}>No category spending data available for {formatMonthYear(selectedMonth)}</Text>
          </View>
        )}
      </View>

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

      {/* Category Rules Modal */}
      <Modal
        visible={showCategoryRules}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryRules(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Category Rules</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCategoryRules(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Customize how transactions are categorized</Text>
            
            {/* Add/Edit Rule */}
            <View style={styles.addRuleContainer}>
              <Text style={styles.addRuleTitle}>
                {editingRule ? 'Edit Rule' : 'Add New Rule'}
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Transaction Keyword</Text>
                <TextInput
                  style={styles.ruleInput}
                  placeholder="Enter transaction name or keyword (e.g., Uber, Starbucks)"
                  value={newRuleSender}
                  onChangeText={setNewRuleSender}
                  accessibilityLabel="Transaction keyword input"
                  accessibilityHint="Enter the name or keyword that appears in your transaction messages"
                />
              </View>
              
              <View style={styles.categoryPicker}>
                <Text style={styles.categoryPickerLabel}>Select Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categoryDefinitions.map((category) => (
                    <TouchableOpacity
                      key={category.name}
                      style={[
                        styles.categoryOption,
                        newRuleCategory === category.name && styles.categoryOptionSelected
                      ]}
                      onPress={() => setNewRuleCategory(category.name)}
                      accessibilityLabel={`${category.name} category`}
                      accessibilityHint={`Select ${category.name} as the category for this rule`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: newRuleCategory === category.name }}
                    >
                      <Ionicons name={category.icon as any} size={16} color={newRuleCategory === category.name ? '#fff' : category.color} />
                      <Text style={[
                        styles.categoryOptionText,
                        newRuleCategory === category.name && styles.categoryOptionTextSelected
                      ]}>
                        {category.name}
                      </Text>
                      {newRuleCategory === category.name && (
                        <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.checkmarkIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.buttonGroup}>
                {editingRule && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={cancelEditing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.addRuleButton,
                    (!newRuleSender.trim() || !newRuleCategory.trim()) && styles.addRuleButtonDisabled
                  ]}
                  onPress={addCustomRule}
                  disabled={!newRuleSender.trim() || !newRuleCategory.trim()}
                >
                  <Ionicons name={editingRule ? "checkmark" : "add"} size={20} color="#fff" />
                  <Text style={styles.addRuleButtonText}>
                    {editingRule ? 'Update Rule' : 'Add Rule'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Existing Rules */}
            <View style={styles.existingRulesContainer}>
              <Text style={styles.existingRulesTitle}>Existing Rules</Text>
              {customRules.length > 0 ? (
                customRules.map((rule) => (
                  <View key={rule.id} style={[
                    styles.ruleItem,
                    editingRule?.id === rule.id && styles.ruleItemEditing
                  ]}>
                    <TouchableOpacity 
                      style={styles.ruleInfo}
                      onPress={() => startEditingRule(rule)}
                    >
                      <Text style={styles.ruleSender}>{rule.sender}</Text>
                      <View style={styles.ruleCategoryContainer}>
                        {(() => {
                          const categoryDef = getCategoryDefinition(rule.category);
                          return (
                            <>
                              <Ionicons name={categoryDef.icon as any} size={14} color={categoryDef.color} />
                              <Text style={[styles.ruleCategory, { color: categoryDef.color }]}>
                                {rule.category}
                              </Text>
                            </>
                          );
                        })()}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.ruleActions}>
                      <TouchableOpacity
                        style={styles.editRuleButton}
                        onPress={() => startEditingRule(rule)}
                      >
                        <Ionicons name="pencil" size={16} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteRuleButton}
                        onPress={() => deleteCustomRule(rule.id)}
                      >
                        <Ionicons name="trash" size={16} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noRulesText}>No custom rules added yet</Text>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowCategoryRules(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
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
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeIcon: {
    backgroundColor: '#4CAF50',
  },
  expenseIcon: {
    backgroundColor: '#F44336',
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  cardAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#4CAF50',
  },
  expenseAmount: {
    color: '#F44336',
  },
  chartContainer: {
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  spendingList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  spendingItemLast: {
    borderBottomWidth: 0,
  },
  spendingInfo: {
    flex: 1,
  },
  spendingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  spendingDetails: {
    fontSize: 14,
    color: '#666',
  },
  spendingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  noDataContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
    marginBottom: 20,
    textAlign: 'center',
  },
  addRuleContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  addRuleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  ruleInput: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  categoryPicker: {
    marginBottom: 16,
  },
  categoryPickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginRight: 8,
    gap: 8,
    backgroundColor: '#fff',
  },
  categoryOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryOptionTextSelected: {
    color: '#fff',
  },
  addRuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  addRuleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  existingRulesContainer: {
    marginBottom: 24,
  },
  existingRulesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  ruleInfo: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  ruleSender: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  ruleCategory: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  deleteRuleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff5f5',
  },
  noRulesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  checkmarkIcon: {
    marginLeft: 8,
  },
  addRuleButtonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  ruleItemEditing: {
    backgroundColor: '#fff5f5',
  },
  ruleCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editRuleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  categoryRulesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  categoryRulesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
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
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  doneButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
