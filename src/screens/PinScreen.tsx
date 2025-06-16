import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getPin, savePin } from '../services/pinService';
import { useRouter } from 'expo-router';

export default function PinScreen() {
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadPin = async () => {
      const saved = await getPin();
      setSavedPin(saved);
    };
    loadPin();
  }, []);

  const handleSubmit = async () => {
    if (!savedPin) {
      await savePin(pin);
      Alert.alert('PIN Set', 'Your PIN has been set.');
      router.replace('/');
    } else if (pin === savedPin) {
      router.replace('/');
    } else {
      Alert.alert('Incorrect PIN', 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{savedPin ? 'Enter your PIN' : 'Set a new PIN'}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        maxLength={4}
        secureTextEntry
        value={pin}
        onChangeText={setPin}
      />
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 20, textAlign: 'center', fontSize: 20 },
  submitButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8 },
  submitText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
});
