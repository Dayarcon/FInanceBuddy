import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getPin, savePin } from '../services/pinService';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import { LinearGradient } from 'expo-linear-gradient';

export default function PinScreen() {
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
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
      setShake(true);
      setTimeout(() => setShake(false), 500);
      Alert.alert('Incorrect PIN', 'Please try again.');
    }
  };

  return (
    <LinearGradient
      colors={["#e0e7ff", "#fff"]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.centered}>
        <View style={[styles.card, shake && styles.shake]}>
          <Ionicons name="lock-closed" size={40} color="#4CAF50" style={{ marginBottom: 18 }} />
          <Text style={styles.title}>{savedPin ? 'Enter your PIN' : 'Set a new PIN'}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            value={pin}
            onChangeText={setPin}
            placeholder="••••"
            placeholderTextColor="#bbb"
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit</Text>
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
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginHorizontal: 16,
  },
  shake: {
    transform: [{ translateX: -10 }],
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 18, textAlign: 'center', color: '#222' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 22,
    textAlign: 'center',
    fontSize: 28,
    width: 160,
    borderColor: '#E0E0E0',
    color: '#222',
    letterSpacing: 8,
    backgroundColor: '#f7f7f7',
  },
  submitButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 10, width: 160 },
  submitText: { color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
});
