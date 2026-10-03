import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../lib/theme';

export function AppBackground({ imageUri }: { imageUri?: string | null }) {
  const theme = useTheme();
  const { width: SW, height: SH } = useWindowDimensions();
  const [imageFailed, setImageFailed] = useState(false);
  const showCustomImage = Boolean(imageUri && !imageFailed);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

  // Signal: signage is opaque. Plain paper (or the user's photo), no map, no grain.
  if (!theme.showMap) {
    return (
      <View pointerEvents="none" style={styles.container}>
        <View style={[styles.base, { backgroundColor: theme.bg }]} />
        {showCustomImage ? (
          <>
            <Image
              source={{ uri: imageUri! }}
              style={styles.customImage}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
            <View
              style={[
                styles.imageScrim,
                { backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.62)' : 'rgba(246, 243, 236, 0.66)' },
              ]}
            />
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      {showCustomImage ? (
        <>
          <Image
            source={{ uri: imageUri! }}
            style={styles.customImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
          <View
            style={[
              styles.imageScrim,
              { backgroundColor: theme.isDark ? 'rgba(16, 18, 28, 0.6)' : 'rgba(236, 226, 211, 0.54)' },
            ]}
          />
        </>
      ) : null}
      <View
        style={[
          styles.base,
          { backgroundColor: theme.isDark ? '#10121C' : '#E9DDCA' },
          showCustomImage && styles.baseOverImage,
        ]}
      />
      {!showCustomImage && (
        <>
          {/* Pixel Manhattan from the Animation Kit: today's route, start to flag. */}
          <ExpoImage
            source={theme.mapAsset}
            style={styles.cityMap}
            contentFit="cover"
          />
          <View style={[styles.cityWash, { backgroundColor: theme.mapWash }]} />
          <View
            style={[
              styles.shadowPool,
              { backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.22)' : 'rgba(58, 43, 30, 0.07)' },
            ]}
          />
        </>
      )}
      <View style={[styles.paperGrain, showCustomImage && styles.paperGrainOverImage]}>
        {Array.from({ length: 28 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.fiber,
              {
                backgroundColor: theme.isDark ? '#FFFFFF' : '#221F1A',
                left: (index * 47) % SW,
                top: 38 + ((index * 83) % Math.max(SH - 76, 1)),
                width: 18 + (index % 5) * 7,
                opacity: 0.04 + (index % 4) * 0.012,
                transform: [{ rotate: `${-8 + (index % 7) * 3}deg` }],
              },
            ]}
          />
        ))}
      </View>
      {showCustomImage ? (
        <View
          style={[
            styles.photoReadabilityWash,
            { backgroundColor: theme.isDark ? 'rgba(16, 18, 28, 0.2)' : 'rgba(247, 241, 228, 0.18)' },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  base: {
    ...StyleSheet.absoluteFillObject,
  },
  baseOverImage: {
    backgroundColor: 'rgba(30, 24, 18, 0.2)',
  },
  customImage: {
    ...StyleSheet.absoluteFillObject,
  },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  cityMap: {
    ...StyleSheet.absoluteFillObject,
  },
  // Wash so header type and cards sit comfortably on the city.
  cityWash: {
    ...StyleSheet.absoluteFillObject,
  },
  shadowPool: {
    position: 'absolute',
    bottom: -70,
    left: -20,
    right: -20,
    height: 190,
    borderRadius: 110,
  },
  paperGrain: {
    ...StyleSheet.absoluteFillObject,
  },
  paperGrainOverImage: {
    opacity: 0.34,
  },
  fiber: {
    position: 'absolute',
    height: 1,
  },
  photoReadabilityWash: {
    ...StyleSheet.absoluteFillObject,
  },
});
