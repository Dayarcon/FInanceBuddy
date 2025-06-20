import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { LinearGradient } from 'expo-linear-gradient';

interface BillForm {
  name: string;
  amount: string;
  dueDate: Date;
  isRecurring: boolean;
  frequency: 'monthly' | 'weekly' | 'yearly';
  category: string;
  isCreditCard: boolean;
  bankName: string;
  cardNumber: string;
  statementDate: Date;
  paymentDueDate: Date;
  minimumPayment: string;
  totalBalance: string;
}

const AddBillScreen = () => {
  const navigation = useNavigation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStatementDatePicker, setShowStatementDatePicker] = useState(false);
  const [showPaymentDueDatePicker, setShowPaymentDueDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'due' | 'statement' | 'payment'>('due');
  
  const [form, setForm] = useState<BillForm>({
    name: '',
    amount: '',
    dueDate: new Date(),
    isRecurring: false,
    frequency: 'monthly',
    category: 'Utilities',
    isCreditCard: false,
    bankName: '',
    cardNumber: '',
    statementDate: new Date(),
    paymentDueDate: new Date(),
    minimumPayment: '',
    totalBalance: '',
  });

  const categories = [
    'Utilities',
    'Rent/Mortgage',
    'Insurance',
    'Subscriptions',
    'Loans',
    'Credit Card',
    'Other',
  ];

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    setShowStatementDatePicker(false);
    setShowPaymentDueDatePicker(false);
    
    if (selectedDate) {
      switch (datePickerType) {
        case 'due':
          setForm({ ...form, dueDate: selectedDate });
          break;
        case 'statement':
          setForm({ ...form, statementDate: selectedDate });
          break;
        case 'payment':
          setForm({ ...form, paymentDueDate: selectedDate });
          break;
      }
    }
  };

  const handleSubmit = () => {
    if (!form.name || !form.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (form.isCreditCard && (!form.bankName || !form.cardNumber)) {
      Alert.alert('Error', 'Please fill in all credit card details');
      return;
    }

    const newBill = {
      id: Date.now().toString(),
      name: form.name,
      amount: parseFloat(form.amount),
      dueDate: form.dueDate,
      isRecurring: form.isRecurring,
      frequency: form.frequency,
      category: form.category,
      isPaid: false,
      isCreditCard: form.isCreditCard,
      bankName: form.bankName,
      cardNumber: form.cardNumber,
      statementDate: form.statementDate,
      paymentDueDate: form.paymentDueDate,
      minimumPayment: form.minimumPayment ? parseFloat(form.minimumPayment) : undefined,
      totalBalance: form.totalBalance ? parseFloat(form.totalBalance) : undefined,
    };

    // TODO: Save to database
    console.log('New bill:', newBill);
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={["#e0e7ff", "#fff"]}
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.title}>Add Bill</Text>

          <View style={styles.inputRow}>
            <Ionicons name="document-text-outline" size={22} color="#007AFF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="Bill Name *"
              placeholderTextColor="#bbb"
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="cash-outline" size={22} color="#4CAF50" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              value={form.amount}
              onChangeText={(text) => setForm({ ...form, amount: text })}
              placeholder="Amount *"
              placeholderTextColor="#bbb"
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setDatePickerType('due');
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
            <Text style={styles.dateButtonText}>Due Date: {form.dueDate.toLocaleDateString()}</Text>
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.label}>Credit Card Bill</Text>
            <Switch
              value={form.isCreditCard}
              onValueChange={(value) => setForm({ ...form, isCreditCard: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={form.isCreditCard ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          {form.isCreditCard && (
            <>
              <Text style={styles.label}>Bank Name *</Text>
              <TextInput
                style={styles.input}
                value={form.bankName}
                onChangeText={(text) => setForm({ ...form, bankName: text })}
                placeholder="e.g., Chase Bank"
              />

              <Text style={styles.label}>Card Number *</Text>
              <TextInput
                style={styles.input}
                value={form.cardNumber}
                onChangeText={(text) => setForm({ ...form, cardNumber: text })}
                placeholder="Last 4 digits"
                keyboardType="number-pad"
                maxLength={4}
              />

              <Text style={styles.label}>Statement Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setDatePickerType('statement');
                  setShowStatementDatePicker(true);
                }}
              >
                <Text>{form.statementDate.toLocaleDateString()}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Payment Due Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setDatePickerType('payment');
                  setShowPaymentDueDatePicker(true);
                }}
              >
                <Text>{form.paymentDueDate.toLocaleDateString()}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Minimum Payment</Text>
              <TextInput
                style={styles.input}
                value={form.minimumPayment}
                onChangeText={(text) => setForm({ ...form, minimumPayment: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Total Balance</Text>
              <TextInput
                style={styles.input}
                value={form.totalBalance}
                onChangeText={(text) => setForm({ ...form, totalBalance: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.label}>Recurring Bill</Text>
            <Switch
              value={form.isRecurring}
              onValueChange={(value) => setForm({ ...form, isRecurring: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={form.isRecurring ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          {form.isRecurring && (
            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Frequency</Text>
              <Picker
                selectedValue={form.frequency}
                onValueChange={(value) =>
                  setForm({ ...form, frequency: value as 'monthly' | 'weekly' | 'yearly' })
                }
                style={styles.picker}
              >
                <Picker.Item label="Weekly" value="weekly" />
                <Picker.Item label="Monthly" value="monthly" />
                <Picker.Item label="Yearly" value="yearly" />
              </Picker>
            </View>
          )}

          <Text style={styles.label}>Category</Text>
          <Picker
            selectedValue={form.category}
            onValueChange={(value) => setForm({ ...form, category: value })}
            style={styles.picker}
          >
            {categories.map((category) => (
              <Picker.Item key={category} label={category} value={category} />
            ))}
          </Picker>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Add Bill</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={form.dueDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {showStatementDatePicker && (
        <DateTimePicker
          value={form.statementDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {showPaymentDueDatePicker && (
        <DateTimePicker
          value={form.paymentDueDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  centered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    width: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginHorizontal: 16,
    marginTop: 32,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#222' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, width: '100%' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    flex: 1,
    borderColor: '#E0E0E0',
    color: '#222',
    backgroundColor: '#f7f7f7',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 18,
    marginTop: 2,
  },
  dateButtonText: { color: '#222', fontWeight: 'bold', fontSize: 15 },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  picker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
});

export default AddBillScreen; 