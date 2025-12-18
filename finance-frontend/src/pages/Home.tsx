import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonIcon, IonBadge, IonList, IonText,
  IonRange, IonGrid, IonRow, IonCol, IonButton
} from '@ionic/react';
import {
  walletOutline, flagOutline, cloudUploadOutline, bulbOutline, 
  pieChartOutline, checkmarkCircle, warningOutline, trendingUpOutline, 
  arrowUpCircleOutline, arrowDownCircleOutline
} from 'ionicons/icons';
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';

// --- Interfaces ---
interface ProjectionPoint { month: number; estimated_balance: number; }
interface AnalysisResponse {
  burn_rate: number;
  projection: ProjectionPoint[];
  categories: { [key: string]: number };
  summary: string;
}

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, 
  Tooltip, Legend, Filler, ArcElement
);

const Home: React.FC = () => {
  const [rawData, setRawData] = useState<AnalysisResponse | null>(null);
  const [categories, setCategories] = useState<{ [key: string]: number }>({});
  const [savingLevers, setSavingLevers] = useState<number>(0);
  const [currentSavings, setCurrentSavings] = useState<number>(() => {
    const saved = localStorage.getItem('currentSavings');
    return saved ? Number(saved) : 10000;
  });
  const [goal, setGoal] = useState<number>(() => {
    const saved = localStorage.getItem('goal');
    return saved ? Number(saved) : 25000;
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
        `/analyze?current_savings=${currentSavings}`,
        formData
      );
      setRawData(response.data);
      setCategories(response.data.categories || {});
    } catch (error) {
      console.error("API call failed", error);
    }
  };

  const topCategory = useMemo(() => {
    if (Object.keys(categories).length === 0) return "Expenses";
    return Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b);
  }, [categories]);

  const processedResults = useMemo(() => {
    if (!rawData) return null;

    const potentialSavings = (categories[topCategory] || 0) * (savingLevers / 100);
    const adjustedBurnRate = rawData.burn_rate + potentialSavings;
    
    const newProjection = Array.from({ length: 12 }, (_, i) => currentSavings + (adjustedBurnRate * (i + 1)));

    const finalBalance = newProjection[11];
    const isOnTrack = finalBalance >= goal;

    const lineChartConfig = {
      labels: Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`),
      datasets: [
        {
          label: 'Projected Balance',
          data: newProjection,
          borderColor: '#4c8dff',
          backgroundColor: 'rgba(76, 141, 255, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Target Goal',
          data: new Array(12).fill(goal),
          borderColor: '#ff6384',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        }
      ]
    };

    const doughnutChartConfig = {
        labels: Object.keys(categories),
        datasets: [{
            data: Object.values(categories),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
        }]
    };

    return { lineChartConfig, doughnutChartConfig, finalBalance, isOnTrack, potentialSavings, adjustedBurnRate };
  }, [rawData, savingLevers, currentSavings, goal, topCategory, categories]);

  const totalMonthlySpend = Object.values(categories).reduce((a, b) => a + b, 0);
  const safetyBuffer = totalMonthlySpend > 0 ? (currentSavings / totalMonthlySpend).toFixed(1) : "0";

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary">
          <IonTitle>WealthPath AI Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent color="light" className="ion-padding">
        <IonGrid>
            <IonRow>
                {/* Main Dashboard Column */}
                <IonCol size="12" size-md="8">
                    {/* Dynamic Header */}
                    {processedResults && (
                        <IonCard color={processedResults.isOnTrack ? 'success' : 'danger'} className="main-summary-card">
                            <IonCardContent>
                                <IonText color="light"><p style={{ margin: 0 }}>12-Month Projected Net Worth</p></IonText>
                                <h1 className="main-summary-value">${processedResults.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h1>
                                <IonBadge color="light" mode="outline">{processedResults.isOnTrack ? 'On Track' : 'Needs Attention'}</IonBadge>
                            </IonCardContent>
                        </IonCard>
                    )}

                    {/* Main Projection Chart */}
                    {processedResults && (
                        <IonCard className="dashboard-card">
                            <IonCardHeader>
                                <IonCardTitle className="card-title"><IonIcon icon={trendingUpOutline} /> Growth Projection</IonCardTitle>
                            </IonCardHeader>
                            <IonCardContent>
                                <div style={{ height: '300px' }}>
                                    <Line data={processedResults.lineChartConfig} options={{ responsive: true, maintainAspectRatio: false }} />
                                </div>
                            </IonCardContent>
                        </IonCard>
                    )}

                    {/* Expense Breakdown Chart */}
                    {processedResults && (
                        <IonCard className="dashboard-card">
                            <IonCardHeader>
                                <IonCardTitle className="card-title"><IonIcon icon={pieChartOutline} /> Expense Categories</IonCardTitle>
                            </IonCardHeader>
                            <IonCardContent>
                                <div style={{ height: '300px' }}>
                                    <Doughnut data={processedResults.doughnutChartConfig} options={{ responsive: true, maintainAspectRatio: false }} />
                                </div>
                            </IonCardContent>
                        </IonCard>
                    )}
                </IonCol>

                {/* Sidebar Column */}
                <IonCol size="12" size-md="4">
                    {/* Upload Card */}
                     <IonCard className="dashboard-card upload-card">
                        <IonCardContent className="ion-text-center">
                          <IonIcon icon={cloudUploadOutline} className="upload-icon" />
                          <IonCardTitle>Analyze Finances</IonCardTitle>
                          <p>Upload a CSV of your bank statements.</p>
                          <input type="file" id="file-upload" hidden accept=".csv" onChange={handleFileUpload} />
                          <IonButton htmlFor="file-upload" expand="block" fill="outline">Choose File</IonButton>
                        </IonCardContent>
                      </IonCard>

                    {/* What-if Analysis */}
                    {rawData && (
                        <IonCard className="dashboard-card">
                            <IonCardHeader>
                                <IonCardTitle className="card-title"><IonIcon icon={bulbOutline} /> Savings Optimizer</IonCardTitle>
                            </IonCardHeader>
                            <IonCardContent>
                                <p>Cut spending on <strong>{topCategory}</strong> by <strong>{savingLevers}%</strong>.</p>
                                <IonRange min={0} max={50} value={savingLevers} onIonChange={e => setSavingLevers(Number(e.detail.value))} />
                                <IonText>
                                    <p>New Monthly Net: 
                                        <strong style={{ color: processedResults.adjustedBurnRate > 0 ? 'green' : 'red' }}>
                                            ${processedResults.adjustedBurnRate.toFixed(2)}
                                        </strong>
                                    </p>
                                </IonText>
                            </IonCardContent>
                        </IonCard>
                    )}

                    {/* Financial Profile Settings */}
                    <IonCard className="dashboard-card">
                        <IonCardHeader>
                          <IonCardTitle className="card-title"><IonIcon icon={walletOutline} /> Financial Profile</IonCardTitle>
                        </IonCardHeader>
                        <IonCardContent>
                            <IonList>
                                <IonItem lines="full">
                                    <IonLabel position="stacked">Current Savings</IonLabel>
                                    <IonInput type="number" value={currentSavings} onIonChange={e => setCurrentSavings(Number(e.detail.value))} />
                                </IonItem>
                                <IonItem lines="full">
                                    <IonLabel position="stacked">Savings Goal</IonLabel>
                                    <IonInput type="number" value={goal} onIonChange={e => setGoal(Number(e.detail.value))} />
                                </IonItem>
                            </IonList>
                        </IonCardContent>
                    </IonCard>
                </IonCol>
            </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Home;
