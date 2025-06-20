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

  const SectionDivider = () => <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 18, opacity: 0.5, borderRadius: 1 }} />;

  const PieLegend = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
      {data.map((item, idx) => (
        <View key={item.name} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginBottom: 6 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: item.color, marginRight: 6 }} />
          <Text style={{ fontSize: 14, color: '#333', fontWeight: '500' }}>{item.name}</Text>
        </View>
      ))}
    </View>
  );

  const CategoryChip = ({ name, color, icon }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: color + '22', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, marginRight: 8 }}>
      <Ionicons name={icon} size={14} color={color} style={{ marginRight: 4 }} />
      <Text style={{ color, fontWeight: '600', fontSize: 13 }}>{name}</Text>
    </View>
  );

  const ACCENT = '#2563eb';

  const StatCard = ({ label, value, color }) => (
    <View style={{ backgroundColor: color + '11', borderRadius: 24, paddingVertical: 18, paddingHorizontal: 28, marginRight: 14, alignItems: 'center', minWidth: 120 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color }}>{value}</Text>
      <Text style={{ fontSize: 14, color: '#444', marginTop: 4 }}>{label}</Text>
    </View>
  );

  const Pill = ({ icon, label, value, color }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: color + '11', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, minWidth: 120 }}>
      <Ionicons name={icon} size={18} color={color} style={{ marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color }}>{label}</Text>
        <Text style={{ fontSize: 13, color: '#444', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );

  const EmojiEmpty = ({ emoji, text, cta, onPress }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontSize: 48, marginBottom: 8 }}>{emoji}</Text>
      <Text style={{ fontSize: 16, color: '#888', marginBottom: 12 }}>{text}</Text>
      {cta && <TouchableOpacity style={{ backgroundColor: ACCENT, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }} onPress={onPress}><Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{cta}</Text></TouchableOpacity>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Stat Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 24, marginBottom: 18, paddingLeft: 16 }}>
          <StatCard label="Income" value={`₹${summary.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} color={ACCENT} />
          <StatCard label="Expenses" value={`₹${summary.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} color="#ef4444" />
          <StatCard label="Net" value={`₹${(summary.credit-summary.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} color="#10b981" />
        </ScrollView>
        {/* Pie Chart */}
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 8 }}>Spending Breakdown</Text>
          <PieChart
            data={data}
            width={Math.min(320, Dimensions.get('window').width - 32)}
            height={220}
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
        {/* Category Breakdown */}
        <Text style={{ fontSize: 17, fontWeight: '600', color: ACCENT, marginLeft: 18, marginBottom: 8 }}>By Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18, paddingLeft: 16 }}>
          {(spendingByCategory || []).length === 0 ? (
            <EmojiEmpty emoji="📊" text="No category data available." cta="Add Category" onPress={() => {}} />
          ) : (
            (spendingByCategory || []).map((item) => (
              <Pill key={item.category} icon={item.icon} label={item.category} value={`₹${item.amount.toFixed(2)}`} color={item.color} />
            ))
          )}
        </ScrollView>
        {/* Bank Breakdown */}
        <Text style={{ fontSize: 17, fontWeight: '600', color: ACCENT, marginLeft: 18, marginBottom: 8 }}>By Bank</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18, paddingLeft: 16 }}>
          {(spendingByBank || []).length === 0 ? (
            <EmojiEmpty emoji="🏦" text="No bank data available." cta="Add Bank" onPress={() => {}} />
          ) : (
            (spendingByBank || []).map((item) => (
              <Pill key={item.bank} icon="card" label={item.bank} value={`₹${item.amount.toFixed(2)}`} color={ACCENT} />
            ))
          )}
        </ScrollView>
        {/* Place Breakdown */}
        <Text style={{ fontSize: 17, fontWeight: '600', color: ACCENT, marginLeft: 18, marginBottom: 8 }}>By Place</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18, paddingLeft: 16 }}>
          {(spendingByPlace || []).length === 0 ? (
            <EmojiEmpty emoji="📍" text="No place data available." cta="Add Place" onPress={() => {}} />
          ) : (
            (spendingByPlace || []).map((item) => (
              <Pill key={item.place} icon="location" label={item.place} value={`₹${item.amount.toFixed(2)}`} color="#f59e42" />
            ))
          )}
        </ScrollView>
      </ScrollView>
      {/* Simple FAB */}
      <TouchableOpacity
        style={{ position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 8 }}
        onPress={() => setShowCategoryRules(true)}
        activeOpacity={0.85}
        accessibilityLabel="Open Category Rules"
      >
        <Ionicons name="settings" size={26} color="#fff" />
      </TouchableOpacity>
      {/* Modals remain unchanged */}
      {/* ... existing code ... */}
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
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  cardCount: {
    fontSize: 13,
    color: '#888',
    marginLeft: 34,
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  summaryCard: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    minWidth: 120,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginVertical: 10,
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
  monthSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
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
  animatedCard: {
    // Placeholder for animation (add fade/slide in with Animated API if desired)
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyCta: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  emptyCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
