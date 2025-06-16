import { Platform, PermissionsAndroid, Alert } from 'react-native';

export const requestSMSPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    // Request all permissions at once
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
    ]);

    const allGranted = 
      granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;

    if (!allGranted) {
      // If permissions were denied, show a message and return false
      Alert.alert(
        'Permissions Required',
        'SMS permissions are required for the app to function properly.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error requesting SMS permissions:', err);
    Alert.alert(
      'Error',
      'Failed to request permissions. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
};
