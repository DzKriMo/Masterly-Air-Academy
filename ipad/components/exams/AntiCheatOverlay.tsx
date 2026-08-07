import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AlertTriangle } from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/constants/colors';

interface AntiCheatOverlayProps {
  onViolation: (type: string) => void;
}

const GRACE_PERIOD_MS = 5000;

export function AntiCheatOverlay({ onViolation }: AntiCheatOverlayProps) {
  const { t } = useTranslation();
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningText, setWarningText] = useState('');
  const appState = useRef(AppState.currentState);
  const mountedAtRef = useRef(Date.now());
  const [permission] = useCameraPermissions();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;

      if (Date.now() - mountedAtRef.current < GRACE_PERIOD_MS) return;

      if (prev === 'active' && next === 'background') {
        setWarningText(t('exams.tabSwitchDetected'));
        setWarningVisible(true);
        onViolation('tab_switch');
        setTimeout(() => setWarningVisible(false), 3000);
      }
    });

    return () => subscription.remove();
  }, [onViolation, t]);

  return (
    <>
      {permission?.granted && (
        <View style={styles.cameraHidden}>
          <CameraView style={styles.camera} facing="front" />
        </View>
      )}

      {warningVisible && (
        <View style={styles.overlay}>
          <View style={styles.warningBox}>
            <AlertTriangle size={28} color={colors.status.warning} />
            <Text style={styles.warningText}>{warningText}</Text>
            <Text style={styles.warningSubtext}>
              {t('exams.sessionMonitored')}
            </Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  cameraHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  camera: {
    width: 1,
    height: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  warningBox: {
    backgroundColor: colors.navy[800],
    borderWidth: 2,
    borderColor: colors.status.warning,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    maxWidth: 340,
  },
  warningText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.status.warning,
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
