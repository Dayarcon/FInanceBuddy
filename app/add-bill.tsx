import { StyleSheet, Text, View } from 'react-native';

const AddBillScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Bill</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});

export default AddBillScreen; 