import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getDBConnection, insertTransaction } from '../services/database';
import { useRouter } from 'expo-router';

export default function AddTransactionScreen() {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>('debit');
  const router = useRouter();

  const saveTransaction = async () => {
    const db = await getDBConnection();
    await insertTransaction(db, {
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      type,
      account: null,
      category: null,
      notes: null,
      source_sms: 'manual',
    });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Transaction</Text>

      <TextInput
        style={styles.input}
        placeholder="Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <View style={styles.typeContainer}>
        <TouchableOpacity
          style={[styles.typeButton, type === 'debit' && styles.active]}
          onPress={() => setType('debit')}
        >
          <Text style={styles.buttonText}>Debit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, type === 'credit' && styles.active]}
          onPress={() => setType('credit')}
        >
          <Text style={styles.buttonText}>Credit</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveTransaction}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 20 },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  typeButton: { borderWidth: 1, borderRadius: 8, padding: 10, width: 100, alignItems: 'center' },
  active: { backgroundColor: '#4CAF50' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8 },
  saveButtonText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
});
