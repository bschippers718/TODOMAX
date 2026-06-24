import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { COLORS } from '../lib/types';

interface AddTaskInputProps {
  onAdd: (text: string) => void;
}

export function AddTaskInput({ onAdd }: AddTaskInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputShell, text.trim() && styles.inputShellActive]}>
        <Text style={styles.promptPip}>✦</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Add one thing..."
          placeholderTextColor="#9C9285"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          blurOnSubmit={false}
        />
      </View>
      <TouchableOpacity
        style={[styles.addButton, !text.trim() && styles.addButtonDisabled]}
        onPress={handleSubmit}
        disabled={!text.trim()}
        activeOpacity={0.7}
      >
        <View style={styles.plusIcon}>
          <View style={styles.plusH} />
          <View style={styles.plusV} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 34,
    backgroundColor: 'rgba(247, 241, 228, 0.78)',
    borderTopColor: 'rgba(34, 31, 26, 0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputShell: {
    flex: 1,
    height: 52,
    backgroundColor: 'rgba(255, 252, 244, 0.86)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 31, 26, 0.12)',
    paddingLeft: 14,
    paddingRight: 8,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#564025',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  inputShellActive: {
    borderColor: 'rgba(229, 57, 45, 0.42)',
    shadowColor: '#E5392D',
    shadowOpacity: 0.12,
  },
  promptPip: {
    color: '#D99A21',
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#221F1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217, 154, 33, 0.7)',
    shadowColor: '#564025',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  addButtonDisabled: {
    backgroundColor: '#BDB5A9',
    borderColor: 'rgba(255,255,255,0.4)',
    shadowOpacity: 0,
  },
  plusIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusH: {
    position: 'absolute',
    width: 18,
    height: 2.5,
    backgroundColor: COLORS.white,
    borderRadius: 2,
  },
  plusV: {
    position: 'absolute',
    width: 2.5,
    height: 18,
    backgroundColor: COLORS.white,
    borderRadius: 2,
  },
});
