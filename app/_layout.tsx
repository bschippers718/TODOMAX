import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { Archivo_700Bold, Archivo_900Black } from '@expo-google-fonts/archivo';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '../lib/theme';
import { useSettings } from '../hooks/useSettings';
import { useTasks } from '../hooks/useTasks';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded, fontsError] = useFonts({
    PressStart2P: PressStart2P_400Regular,
    // Signal's display face — Helvetica's loud cousin, without the licence.
    Archivo_700Bold,
    Archivo_900Black,
  });

  // Hold the splash until the theme and the list are known, so the first
  // frame is the user's own, not a default-theme flash. A font failure
  // falls back to system faces rather than hanging on the splash.
  const { loaded: settingsLoaded } = useSettings();
  const { loaded: tasksLoaded } = useTasks();
  const ready = (fontsLoaded || Boolean(fontsError)) && settingsLoaded && tasksLoaded;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

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
            headerTitleStyle: theme.isSignal
              ? { fontSize: 17, fontFamily: 'Archivo_900Black', color: theme.text }
              : { fontSize: 17, fontWeight: '600', color: theme.text },
            contentStyle: { backgroundColor: theme.bg },
            animation: 'default',
            headerShadowVisible: false,
            headerBackTitle: 'Back',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
          {/* The Map is another view of the same list, not a destination: cross-fade. */}
          <Stack.Screen name="map" options={{ headerShown: false, animation: 'fade', animationDuration: 220 }} />
          <Stack.Screen name="settings" options={sheetOptions} />
          <Stack.Screen name="packs" options={sheetOptions} />
          <Stack.Screen name="collection" options={sheetOptions} />
        </Stack>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
