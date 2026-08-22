import { Pressable, StyleSheet, View } from 'react-native';

import { ShellDetailPopover } from '@/components/shell/ShellDetailPopover';
import { Text } from '@/ui/layout/visualPrimitives';

export function NotificationsPopover({
  onOpenDaily,
  onClose,
}: {
  onOpenDaily: () => void;
  onClose: () => void;
}) {
  return <ShellDetailPopover
    accessibilityLabel="お知らせ"
    contentContainerStyle={styles.content}
    eyebrow="NOTIFICATIONS"
    onClose={onClose}
    subtitle="今日の出来事をまとめて確認できるよ"
    title="お知らせ"
  >
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>今日</Text>
      <Pressable
        accessibilityLabel="今日の記録を開く"
        accessibilityRole="button"
        onPress={onOpenDaily}
        style={({ pressed }) => [styles.row, styles.rowFirst, pressed && styles.rowPressed]}
      >
        <View style={styles.rowCopy}>
          <Text style={styles.body}>今日の記録</Text>
          <Text style={styles.secondary}>スタンプとミッションを確認できます</Text>
        </View>
        <Text pointerEvents="none" style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  </ShellDetailPopover>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 24 },
  section: {},
  sectionTitle: { color: '#553B59', fontSize: 17, lineHeight: 24, fontWeight: '800', marginBottom: 10 },
  row: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(89, 60, 93, 0.12)',
  },
  rowFirst: { borderTopWidth: 1, borderTopColor: 'rgba(89, 60, 93, 0.12)' },
  rowPressed: { opacity: 0.84, transform: [{ translateY: 2 }] },
  rowCopy: { flex: 1, minWidth: 0 },
  body: { color: '#6E5864', fontSize: 16, lineHeight: 24, fontWeight: '700' },
  secondary: { color: '#806B74', fontSize: 12, lineHeight: 18 },
  chevron: { color: '#A45D68', fontSize: 24, lineHeight: 26, fontWeight: '900' },
});
