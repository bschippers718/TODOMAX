import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '../lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded] = useFonts({
    PressStart2P: PressStart2P_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // Secondary screens open as sheets with a transparent header; iOS supplies
  // the material / scroll-edge blur itself, the way Settings / Store surfaces
  // do in Apple's own apps.
  const sheetOptions = {
    presentation: 'modal' as const,
    headerTransparent: Platform.OS === 'ios',
    headerLargeTitle: false,
    headerShadowVisible: false,
    gestureEnabled: true,
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.blue,
            headerTitleStyle: { fontSize: 17, fontWeight: '600', color: theme.text },
            contentStyle: { backgroundColor: theme.bg },
            animation: 'default',
            headerShadowVisible: false,
            headerBackTitle: 'Back',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={sheetOptions} />
          <Stack.Screen name="packs" options={sheetOptions} />
          <Stack.Screen name="collection" options={sheetOptions} />
        </Stack>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
