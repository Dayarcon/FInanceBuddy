import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, Text, TextInput, View, Linking, Platform } from 'react-native';
import { getPin, savePin } from '../src/services/pinService';
import { createTables } from '../src/services/database';
import { requestSMSPermissions } from '../src/services/permissionService';

export default function PinScreen() {
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsInitializing(true);
        // Initialize database tables
        await createTables();
        
        // Request SMS permissions
        const hasPermissions = await requestSMSPermissions();
        if (!hasPermissions) {
          // If permissions are denied, show error and exit
          Alert.alert(
            'Permission Required',
            'SMS permissions are required for the app to function. Please restart the app and grant permissions.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Load saved PIN
        const saved = await getPin();
        setSavedPin(saved);
      } catch (error) {
        console.error('Error during initialization:', error);
        Alert.alert('Error', 'Failed to initialize app. Please restart.');
      } finally {
        setIsInitializing(false);
      }
    };
    initialize();
  }, []);

  const handleSubmit = async () => {
    if (!savedPin) {
      await savePin(pin);
      Alert.alert("PIN Set");
      router.replace('/home');
    } else if (pin === savedPin) {
      router.replace('/home');
    } else {
      Alert.alert("Incorrect PIN");
    }
  };

  if (isInitializing) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, marginBottom: 20 }}>Initializing app...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        {savedPin ? 'Enter your PIN' : 'Set a new PIN'}
      </Text>
      <TextInput
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
        keyboardType="numeric"
        maxLength={4}
        secureTextEntry
        value={pin}
        onChangeText={setPin}
      />
      <Button title="Submit" onPress={handleSubmit} />
    </View>
  );
}
