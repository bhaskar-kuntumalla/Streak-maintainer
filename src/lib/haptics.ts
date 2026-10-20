import * as Haptics from 'expo-haptics';

/** Light tap feedback. Silently ignored where haptics are unsupported. */
export function tapFeedback(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
