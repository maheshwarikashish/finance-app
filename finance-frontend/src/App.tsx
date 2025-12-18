import React, { useState, useEffect } from 'react';
import {
  IonApp, IonContent, IonPage, setupIonicReact, IonButton, 
  IonIcon, IonSpinner, IonText
} from '@ionic/react';
import { fingerPrintOutline } from 'ionicons/icons';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import Home from './pages/Home';

// Import global stylesheet
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true); // Added for initial check

  const performBiometricCheck = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log("Development Mode: Biometrics skipped in browser");
      setIsAuthenticated(true);
      setIsAuthenticating(false);
      return;
    }

    try {
      const result = await NativeBiometric.isAvailable();
      if (result.isAvailable) {
        await NativeBiometric.verifyIdentity({
          reason: 'Unlock your WealthPath AI Forecast',
          title: 'Authentication Required',
          subtitle: 'Use Fingerprint or FaceID',
          description: 'Your financial data is protected with biometric security.',
        });
        setIsAuthenticated(true);
      } else {
        // No biometric hardware, so we authenticate by default
        setIsAuthenticated(true); 
      }
    } catch (error) {
      console.error('Biometric verification failed or was cancelled.', error);
    } finally {
        setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    performBiometricCheck();
  }, []);

  if (isAuthenticating) {
    return (
        <IonApp>
            <IonPage>
                <IonContent className="ion-padding ion-text-center" color="primary">
                    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <IonSpinner name="bubbles" color="light" />
                        <IonText color="light" style={{ marginTop: '20px' }}>Authenticating...</IonText>
                    </div>
                </IonContent>
            </IonPage>
        </IonApp>
    )
  }

  if (!isAuthenticated) {
    return (
      <IonApp>
        <IonPage>
          <IonContent className="ion-padding ion-text-center" color="primary">
            <div style={{
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              background: 'linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-tertiary))'
            }}>
              <IonIcon 
                icon={fingerPrintOutline} 
                style={{ fontSize: '120px', color: 'var(--ion-color-primary-contrast)', marginBottom: '2rem' }} 
              />
              <h1 style={{ color: 'white', fontWeight: '700' }}>WealthPath Locked</h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2.5rem', maxWidth: '80%' }}>
                Secure biometric access is required to protect your financial forecast.
              </p>
              <IonButton onClick={performBiometricCheck} expand="block" shape="round" color="light" style={{ width: '80%' }}>
                Unlock with Biometrics
              </IonButton>
            </div>
          </IonContent>
        </IonPage>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <Home />
    </IonApp>
  );
};

export default App;
