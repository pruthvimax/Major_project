import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isDark } = useTheme();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'farmer') {
        router.replace('/farmer');
      } else if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/buyer');
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#101412' : '#FFFFFF' }]}>
        <ActivityIndicator size="large" color="#75C82A" />
      </View>
    );
  }

  // If user is already logged in, return placeholder while redirecting
  if (user) {
    return <View style={styles.container} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#101412' : '#FFFFFF' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="#E8F8D6" translucent={false} />

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Image
          source={{
            uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN7F7mLRjxuxebpVAh8QmuXWCqi8odiFg9a11wJ4d8FekpskGenBJFAmm8e8rEGCAmgZgjeWSYxMaIdc112pRHBgtlvA_UcyUKZWZmp_u4qzi9XzCuUAG270f-4RQt-95ABmMYiCOHHv4QfVJ5sp2FNYhKQs_erzLgqTq_bbbhy5PqNccBZSIOnXUCkVhU7LCHJUqaiQK7OjtxE_iU1XtXF1z13YdBG_fKXQhoBK6VxPv5ArjmbDWj',
          }}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Curved Cut-out Overlay */}
        <View style={[styles.curveOverlay, { backgroundColor: isDark ? '#101412' : '#FFFFFF' }]} />
      </View>

      {/* Content Section */}
      <SafeAreaView style={styles.contentSection}>
        <View style={styles.textContainer}>
          <Text style={[styles.heading, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            Empowering Farmers,{"\n"}Connecting Markets
          </Text>

          <Text style={[styles.description, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Transparent trade, fair pricing, and secure payments - all powered by blockchain
          </Text>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.88}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.ctaButtonText}>Get started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    width: '100%',
    height: '52%',
    backgroundColor: '#E8F8D6',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  curveOverlay: {
    position: 'absolute',
    bottom: -1,
    left: -width * 0.1,
    width: width * 1.2,
    height: 50,
    borderTopLeftRadius: width * 0.6,
    borderTopRightRadius: width * 0.6,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  heading: {
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 22,
    maxWidth: 290,
  },
  actionContainer: {
    width: '100%',
    marginBottom: 8,
  },
  ctaButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#75C82A',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#72C429',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});


