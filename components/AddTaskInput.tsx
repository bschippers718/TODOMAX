import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
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
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Add a task..."
        placeholderTextColor={COLORS.dimmed}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        blurOnSubmit={false}
      />
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.separator,
    backgroundColor: COLORS.bg,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 17,
    marginRight: 10,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.dimmed,
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
