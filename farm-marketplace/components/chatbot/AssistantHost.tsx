import React, { useState, useEffect } from 'react';
import { usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import ChatButton from './ChatButton';
import ChatModal from './ChatModal';

/**
 * Mounts the AI assistant only where it belongs:
 *   • the signed-in user is a farmer or buyer (admins never see it), and
 *   • the current route is inside that role's area (/farmer/* or /buyer/*),
 *     so it never overlays the login, register or admin screens.
 *
 * Rendered once from the root layout, exactly like the previous ChatbotWidget.
 */
export default function AssistantHost() {
  const { user: authUser } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [asyncUser, setAsyncUser] = useState<{ role?: string; name?: string } | null>(null);

  useEffect(() => {
    const syncUser = async () => {
      try {
        const data = await AsyncStorage.getItem('currentUser');
        if (data) {
          setAsyncUser(JSON.parse(data));
        }
      } catch (e) {}
    };
    syncUser();
  }, [pathname]);

  const activeUser = authUser || asyncUser;
  // Normalize role to ensure case-insensitivity
  const normalizedRole = activeUser?.role ? activeUser.role.toLowerCase().trim() : null;
  const role = normalizedRole === 'farmer' || normalizedRole === 'buyer' ? (normalizedRole as 'farmer' | 'buyer') : null;

  // Check if current route is within the user's role portal
  const currentPath = (pathname || '').toLowerCase();
  const inRoleArea =
    role !== null &&
    (currentPath.includes(`/${role}`) ||
      currentPath.includes(role) ||
      currentPath === '/' ||
      currentPath === '');

  if (!activeUser || !role || !inRoleArea) return null;

  return (
    <>
      <ChatButton open={open} onPress={() => setOpen((v) => !v)} />
      <ChatModal visible={open} role={role} userName={activeUser?.name} onClose={() => setOpen(false)} />
    </>
  );
}

