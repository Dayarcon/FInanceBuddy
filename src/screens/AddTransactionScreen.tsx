import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getDBConnection, insertTransaction } from '../services/database';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { LinearGradient } from 'expo-linear-gradient';

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
    <LinearGradient
      colors={["#e0e7ff", "#fff"]}
      style={styles.gradient}
    >
      <View style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.title}>Add Transaction</Text>

          <TextInput
            style={styles.input}
            placeholder="Amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor="#bbb"
          />

          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'debit' && styles.active]}
              onPress={() => setType('debit')}
            >
              <Ionicons name="remove-circle" size={22} color={type === 'debit' ? '#fff' : '#4CAF50'} style={{ marginRight: 6 }} />
              <Text style={styles.buttonText}>Debit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'credit' && styles.active]}
              onPress={() => setType('credit')}
            >
              <Ionicons name="add-circle" size={22} color={type === 'credit' ? '#fff' : '#007AFF'} style={{ marginRight: 6 }} />
              <Text style={styles.buttonText}>Credit</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveTransaction}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    width: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginHorizontal: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#222' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 22,
    textAlign: 'center',
    fontSize: 22,
    width: 180,
    borderColor: '#E0E0E0',
    color: '#222',
    backgroundColor: '#f7f7f7',
  },
  typeContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginHorizontal: 10,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  active: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  buttonText: { color: '#222', fontWeight: 'bold', fontSize: 16 },
  saveButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 10, width: 180, marginTop: 10 },
  saveButtonText: { color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
});
