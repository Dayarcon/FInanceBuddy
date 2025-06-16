import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_KEY = 'user_pin';

export const savePin = async (pin: string) => {
  await AsyncStorage.setItem(PIN_KEY, pin);
};

export const getPin = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(PIN_KEY);
};

export const removePin = async () => {
  await AsyncStorage.removeItem(PIN_KEY);
};
