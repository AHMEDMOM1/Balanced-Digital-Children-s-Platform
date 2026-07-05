import React from 'react';
import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import useAuthStore from '../../store/useAuthStore';

export default function AdminLayout() {
  const role = useAuthStore(state => state.role);
  const isLoading = useAuthStore(state => state.isLoading);

  if (isLoading) return null;

  if (role !== 'admin') {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Panel' }} />
      <Stack.Screen name="content-new" options={{ title: 'New Content' }} />
      <Stack.Screen name="content-edit/[id]" options={{ title: 'Edit Content' }} />
      <Stack.Screen name="categories" options={{ title: 'Categories' }} />
    </Stack>
  );
}
