import React, { useState, useEffect } from 'react';
import { IonApp, IonContent, IonPage, setupIonicReact, IonButton, IonIcon } from '@ionic/react';
import { fingerPrintOutline } from 'ionicons/icons';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core'; // Important: Added this import
import Home from './pages/Home';

setupIonicReact();

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const performBiometricCheck = async () => {
    // --- BROWSER GUARD ---
    // This stops the "Method not implemented" error in Chrome/Safari
    if (!Capacitor.isNativePlatform()) {
      console.log("Development Mode: Biometrics skipped in browser");
      setIsAuthenticated(true);
      return;
    }

    try {
      const result = await NativeBiometric.isAvailable();
      if (result.isAvailable) {
        await NativeBiometric.verifyIdentity({
          reason: "Unlock your WealthPath AI Forecast",
          title: "Biometric Login",
          subtitle: "Use Fingerprint or FaceID",
          description: "Protect your financial data"
        });
        setIsAuthenticated(true);
      } else {
        // Fallback if the device has no biometric hardware
        setIsAuthenticated(true); 
      }
    } catch (error) {
      console.error("Biometric failed or cancelled", error);
      // User likely cancelled the popup. We stay on the lock screen.
    }
  };

  useEffect(() => {
    performBiometricCheck();
  }, []);

  if (!isAuthenticated) {
    return (
      <IonApp>
        <IonPage>
          <IonContent className="ion-padding ion-text-center">
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%' 
            }}>
              <IonIcon 
                icon={fingerPrintOutline} 
                style={{ fontSize: '100px', color: '#3880ff', marginBottom: '20px' }} 
              />
              <h2 style={{ fontWeight: 'bold' }}>WealthPath Locked</h2>
              <p style={{ color: '#666', marginBottom: '30px' }}>
                Secure authentication required to view projections.
              </p>
              <IonButton onClick={performBiometricCheck} expand="block" shape="round" style={{ width: '80%' }}>
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