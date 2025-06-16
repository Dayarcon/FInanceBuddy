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
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Bill Name *</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
          placeholder="e.g., Electricity Bill"
        />

        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={styles.input}
          value={form.amount}
          onChangeText={(text) => setForm({ ...form, amount: text })}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

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

        <Text style={styles.label}>Due Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            setDatePickerType('due');
            setShowDatePicker(true);
          }}
        >
          <Text>{form.dueDate.toLocaleDateString()}</Text>
        </TouchableOpacity>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
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
});

export default AddBillScreen; 