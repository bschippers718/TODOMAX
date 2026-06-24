import { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

export function AppBackground({ imageUri }: { imageUri?: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showCustomImage = Boolean(imageUri && !imageFailed);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

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
          <View style={styles.imageScrim} />
        </>
      ) : null}
      <View style={[styles.base, showCustomImage && styles.baseOverImage]} />
      {!showCustomImage && (
        <>
          <View style={styles.deskMat} />
          <View style={styles.stationerySheet} />
          <View style={styles.oliveTab} />
          <View style={styles.markerGhost} />
          <View style={styles.shadowPool} />
        </>
      )}
      <View style={[styles.paperGrain, showCustomImage && styles.paperGrainOverImage]}>
        {Array.from({ length: 28 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.fiber,
              {
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
      {showCustomImage ? <View style={styles.photoReadabilityWash} /> : null}
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
    backgroundColor: '#E9DDCA',
  },
  baseOverImage: {
    backgroundColor: 'rgba(30, 24, 18, 0.2)',
  },
  customImage: {
    ...StyleSheet.absoluteFillObject,
  },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(236, 226, 211, 0.54)',
  },
  deskMat: {
    position: 'absolute',
    top: -SH * 0.1,
    left: -SW * 0.2,
    width: SW * 1.3,
    height: SH * 0.58,
    borderRadius: 48,
    backgroundColor: '#CDB99C',
    opacity: 0.36,
    transform: [{ rotate: '-9deg' }],
  },
  stationerySheet: {
    position: 'absolute',
    top: SH * 0.14,
    right: -SW * 0.35,
    width: SW * 0.9,
    height: SH * 0.64,
    borderRadius: 34,
    backgroundColor: '#F8F1E7',
    opacity: 0.58,
    shadowColor: '#5F4933',
    shadowOffset: { width: -16, height: 18 },
    shadowOpacity: 0.07,
    shadowRadius: 26,
    transform: [{ rotate: '12deg' }],
  },
  oliveTab: {
    position: 'absolute',
    top: SH * 0.09,
    left: SW * 0.08,
    width: SW * 0.36,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#798268',
    opacity: 0.22,
    transform: [{ rotate: '-4deg' }],
  },
  markerGhost: {
    position: 'absolute',
    bottom: SH * 0.23,
    left: SW * 0.08,
    width: SW * 0.78,
    height: 9,
    borderRadius: 8,
    backgroundColor: '#B93228',
    opacity: 0.08,
    transform: [{ rotate: '-7deg' }],
  },
  shadowPool: {
    position: 'absolute',
    bottom: -70,
    left: -20,
    right: -20,
    height: 190,
    borderRadius: 110,
    backgroundColor: 'rgba(58, 43, 30, 0.07)',
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
    backgroundColor: '#221F1A',
  },
  photoReadabilityWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(247, 241, 228, 0.18)',
  },
});
