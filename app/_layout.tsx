import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
        },
        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Stack.Screen
        name="bills"
        options={{
          title: 'Bills',
        }}
      />
      <Stack.Screen
        name="overdue-bills"
        options={{
          title: 'Overdue Bills',
        }}
      />
      <Stack.Screen
        name="add-bill"
        options={{
          title: 'Add Bill',
        }}
      />
      <Stack.Screen
        name="transactions"
        options={{
          title: 'Transactions',
        }}
      />
      <Stack.Screen
        name="add-transaction"
        options={{
          title: 'Add Transaction',
        }}
      />
      <Stack.Screen
        name="reports"
        options={{
          title: 'Reports',
        }}
      />
      <Stack.Screen
        name="comprehensive-sync"
        options={{
          title: 'Sync SMS',
        }}
      />
      <Stack.Screen
        name="credit-card-bills"
        options={{
          title: 'Credit Card Bills',
        }}
      />
      <Stack.Screen
        name="credit-card-statements"
        options={{
          title: 'Credit Card Statements',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Stack>
  );
}
