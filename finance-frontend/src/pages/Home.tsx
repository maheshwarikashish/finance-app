import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonIcon, IonBadge, IonList, IonText,
  IonRange // Added this import
} from '@ionic/react';
import { 
  walletOutline, flagOutline, cloudUploadOutline, 
  bulbOutline, pieChartOutline, checkmarkCircle, warningOutline,
  trendingUpOutline // Added this import
} from 'ionicons/icons';
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';

// --- Interfaces ---
interface ProjectionPoint { month: number; estimated_balance: number; }
interface AnalysisResponse { 
  burn_rate: number; 
  projection: ProjectionPoint[]; 
  categories: { [key: string]: number }; 
  summary: string; 
}

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Home: React.FC = () => {
  const [rawData, setRawData] = useState<AnalysisResponse | null>(null);
  const [categories, setCategories] = useState<{ [key: string]: number }>({});
  const [savingLevers, setSavingLevers] = useState<number>(0); 

  const [currentSavings, setCurrentSavings] = useState<number>(() => {
    const saved = localStorage.getItem('currentSavings');
    return saved ? Number(saved) : 5000;
  });

  const [goal, setGoal] = useState<number>(() => {
    const saved = localStorage.getItem('goal');
    return saved ? Number(saved) : 15000;
  });

  useEffect(() => {
    localStorage.setItem('currentSavings', currentSavings.toString());
    localStorage.setItem('goal', goal.toString());
  }, [currentSavings, goal]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file: File = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post<AnalysisResponse>(
        `http://10.10.141.121/analyze?current_savings=${currentSavings}`, 
        formData
      );
      setRawData(response.data);
      setCategories(response.data.categories || {});
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  const topCategory = useMemo(() => {
    if (Object.keys(categories).length === 0) return "Expenses";
    return Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b);
  }, [categories]);

  // --- REAL-TIME CALCULATION ENGINE ---
  // This recalculates the chart and advice whenever you move the slider
  const processedResults = useMemo(() => {
    if (!rawData) return null;

    const potentialSavings = (categories[topCategory] || 0) * (savingLevers / 100);
    const adjustedBurnRate = rawData.burn_rate + potentialSavings;
    
    const newProjection = [];
    for (let i = 1; i <= 12; i++) {
      newProjection.push(currentSavings + (adjustedBurnRate * i));
    }

    const finalBalance = newProjection[11];
    const isOnTrack = finalBalance >= goal;

    const chartConfig = {
      labels: Array.from({length: 12}, (_, i) => `Month ${i + 1}`),
      datasets: [
        {
          label: 'Projected Balance',
          data: newProjection,
          borderColor: '#3880ff',
          backgroundColor: 'rgba(56, 128, 255, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Target Goal',
          data: new Array(12).fill(goal),
          borderColor: '#eb445a',
          borderDash: [10, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    };

    return { chartConfig, finalBalance, isOnTrack, potentialSavings };
  }, [rawData, savingLevers, currentSavings, goal, topCategory, categories]);

  const totalMonthlySpend = Object.values(categories).reduce((a, b) => a + b, 0);
  const safetyBuffer = totalMonthlySpend > 0 ? (currentSavings / totalMonthlySpend).toFixed(1) : "0";

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary">
          <IonTitle>WealthPath Pro AI</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent color="light">
        {/* 1. Header Summary */}
        {processedResults && (
          <IonCard color={processedResults.isOnTrack ? "success" : "warning"} style={{ borderRadius: '15px' }}>
            <IonCardContent className="ion-text-center">
              <IonLabel style={{ opacity: 0.8 }}>Estimated 1-Year Wealth</IonLabel>
              <h1 style={{ fontSize: '2.8rem', fontWeight: 'bold', margin: '10px 0' }}>
                ${processedResults.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h1>
              <IonText>
                <IonIcon icon={processedResults.isOnTrack ? checkmarkCircle : warningOutline} />
                {processedResults.isOnTrack ? " Target Goal Reached!" : ` $${(goal - processedResults.finalBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })} below target`}
              </IonText>
            </IonCardContent>
          </IonCard>
        )}

        {/* 2. Emergency Fund Gauge */}
        {rawData && (
          <IonCard style={{ borderRadius: '15px', background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', color: 'white' }}>
            <IonCardContent className="ion-text-center">
              <h2 style={{ color: 'white', opacity: 0.9 }}>Emergency Fund</h2>
              <h1 style={{ fontSize: '3rem', fontWeight: 'bold', margin: '5px 0' }}>{safetyBuffer}</h1>
              <p style={{ color: 'white' }}>Months of runway</p>
              <div style={{ background: 'rgba(255,255,255,0.2)', height: '10px', borderRadius: '5px', marginTop: '10px' }}>
                <div style={{ 
                  background: '#fff', 
                  height: '100%', 
                  width: `${Math.min((Number(safetyBuffer) / 6) * 100, 100)}%`,
                  borderRadius: '5px' 
                }} />
              </div>
              <small>Target: 6.0 Months</small>
            </IonCardContent>
          </IonCard>
        )}

        {/* 3. Smart Advice & What-If Slider */}
        {rawData && (
          <IonCard style={{ borderRadius: '15px' }}>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: '1.1rem' }}>
                <IonIcon icon={bulbOutline} color="tertiary" /> Optimization Lever
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonLabel>Reduce <strong>{topCategory}</strong> spending by {savingLevers}%</IonLabel>
              <IonRange 
                min={0} max={50} step={5} value={savingLevers}
                onIonChange={e => setSavingLevers(Number(e.detail.value))}
                color="secondary"
              />
              <IonText color="medium">
                <p>Action: Reducing this will save you <strong>${processedResults?.potentialSavings.toFixed(0)}</strong> extra per month.</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        )}

        {/* 4. Financial Profile */}
        <IonCard style={{ borderRadius: '15px' }}>
          <IonCardContent>
            <IonList lines="none">
              <IonItem style={{ borderRadius: '8px', marginBottom: '10px', '--background': '#f4f5f8' }}>
                <IonIcon icon={walletOutline} slot="start" color="primary" />
                <IonLabel position="stacked">Current Balance ($)</IonLabel>
                <IonInput type="number" value={currentSavings} onIonChange={e => setCurrentSavings(Number(e.detail.value))} />
              </IonItem>
              <IonItem style={{ borderRadius: '8px', '--background': '#f4f5f8' }}>
                <IonIcon icon={flagOutline} slot="start" color="danger" />
                <IonLabel position="stacked">Savings Goal ($)</IonLabel>
                <IonInput type="number" value={goal} onIonChange={e => setGoal(Number(e.detail.value))} />
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* 5. Upload & Charts */}
        <IonCard style={{ borderRadius: '15px', border: '2px dashed #ccc', backgroundColor: 'transparent', boxShadow: 'none' }}>
          <IonCardContent className="ion-text-center">
            <IonIcon icon={cloudUploadOutline} style={{ fontSize: '42px', color: '#666' }} />
            <p>Upload new CSV to refresh analysis</p>
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ marginTop: '10px' }} />
          </IonCardContent>
        </IonCard>

        {processedResults && (
          <IonCard style={{ borderRadius: '15px' }}>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: '1.1rem' }}>Dynamic Growth Forecast</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ height: '250px' }}>
                <Line data={processedResults.chartConfig} options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } }
                }} />
              </div>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;