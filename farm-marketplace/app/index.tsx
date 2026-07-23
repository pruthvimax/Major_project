import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useColors from '../constants/Colors';

export default function Index() {
  const colors = useColors();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const token = await AsyncStorage.getItem('token');

      // Both must exist and be consistent — if not, clear and go to login
      if (!userData || !token) {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/(auth)/login');
        return;
      }

      const user = JSON.parse(userData);

      // Admin stored without a real token (old local-auth flow) — clear it
      if (!user.role) {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/(auth)/login');
        return;
      }

      if (user.role === 'farmer') {
        router.replace('/(farmer)');
      } else if (user.role === 'buyer') {
        router.replace('/(buyer)');
      } else if (user.role === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
