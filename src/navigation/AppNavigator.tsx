import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import AddBillScreen from '../screens/AddBillScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import BillsScreen from '../screens/BillsScreen';
import ComprehensiveSyncScreen from '../screens/ComprehensiveSyncScreen';
import CreditCardBillsScreen from '../screens/CreditCardBillsScreen';
import CreditCardStatementsScreen from '../screens/CreditCardStatementsScreen';
import HomeScreen from '../screens/HomeScreen';
import ReportsScreen from '../screens/ReportsScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import { BillsStackParamList, RootStackParamList } from '../types/navigation';

const Stack = createStackNavigator<BillsStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

const BillsStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Bills" component={BillsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AddBill" component={AddBillScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-circle-outline';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'BillsStack') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'ComprehensiveSync') {
            iconName = focused ? 'sync' : 'sync-outline';
          } else if (route.name === 'CreditCardBills') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'CreditCardStatements') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'AddTransaction') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="BillsStack" component={BillsStack} options={{ headerShown: false }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="ComprehensiveSync" component={ComprehensiveSyncScreen} options={{ headerShown: false }} />
      <Tab.Screen name="CreditCardBills" component={CreditCardBillsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="CreditCardStatements" component={CreditCardStatementsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="AddTransaction" component={AddTransactionScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
};

export default AppNavigator; 