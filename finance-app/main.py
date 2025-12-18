from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import logging

# --- App Setup ---
# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create the FastAPI app instance
app = FastAPI(
    title="WealthPath AI API",
    description="Analyzes personal finance data from CSV files.",
    version="1.0.0"
)

# Add CORS middleware to allow cross-origin requests from our frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"]  # Allows all methods
)

# --- Financial Analysis Logic ---

def categorize_transaction(description: str) -> str:
    """Categorizes a transaction based on its description."""
    desc = str(description).lower()
    
    # Keyword-based categorization
    if any(k in desc for k in ['rent', 'mortgage', 'housing']):
        return 'Housing'
    if any(k in desc for k in ['food', 'grocer', 'restaurant', 'swiggy', 'zomato']):
        return 'Food'
    if any(k in desc for k in ['transport', 'uber', 'ola', 'taxi', 'metro', 'petrol', 'gas']):
        return 'Travel'
    if any(k in desc for k in ['entertainment', 'movie', 'netflix', 'spotify']):
        return 'Entertainment'
    if any(k in desc for k in ['shopping', 'amazon', 'flipkart', 'myntra', 'apparel']):
        return 'Shopping'
    if any(k in desc for k in ['health', 'pharmacy', 'doctor', 'hospital']):
        return 'Health'
    if any(k in desc for k in ['investment', 'stocks', 'mutual fund']):
        return 'Investments'
    if 'salary' in desc or 'payroll' in desc:
        return 'Income'
        
    return 'Other'

def find_relevant_columns(df: pd.DataFrame) -> (str, str):
    """Intelligently finds the description and amount columns."""
    cols = {col.lower().strip(): col for col in df.columns}
    
    desc_col = cols.get('description', cols.get('details', df.columns[1]))
    amount_col = cols.get('amount', cols.get('price', df.columns[2]))
    
    return desc_col, amount_col

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "WealthPath AI Analyzer is running."}

@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...), current_savings: float = 0):
    """
    Analyzes the uploaded CSV file to provide financial insights.
    - Calculates burn rate (net monthly cash flow).
    - Projects future savings over 12 months.
    - Categorizes expenses.
    - Determines the emergency fund safety buffer.
    """
    try:
        # Read and parse the CSV file
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # --- Data Cleaning and Preparation ---
        desc_col, amount_col = find_relevant_columns(df)
        
        df.rename(columns={desc_col: 'Description', amount_col: 'Amount'}, inplace=True)
        
        # Ensure 'Amount' is a numeric type, coercing errors
        df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce').fillna(0)
        
        # --- Analysis ---
        # 1. Categorize all transactions
        df['Category'] = df['Description'].apply(categorize_transaction)
        
        # 2. Separate income and expenses
        expenses_df = df[df['Amount'] < 0].copy()
        
        # 3. Calculate category totals (absolute values for expenses)
        category_totals = expenses_df.groupby('Category')['Amount'].sum().abs().to_dict()

        # 4. Calculate Net Flow (Burn Rate)
        # Assuming the CSV represents one month of data
        net_flow = df['Amount'].sum()
        
        # 5. Generate 12-month financial projection
        projection = [
            {"month": i, "estimated_balance": float(current_savings + (net_flow * i))}
            for i in range(1, 13)
        ]

        # 6. Calculate Safety Buffer (Emergency Fund Runway)
        total_monthly_expenses = sum(category_totals.values())
        safety_buffer_months = (current_savings / total_monthly_expenses) if total_monthly_expenses > 0 else 12.0

        # --- Response Payload ---
        return {
            "burn_rate": round(float(net_flow), 2),
            "projection": projection,
            "categories": category_totals,
            "safety_buffer": round(safety_buffer_months, 1),
            "avg_monthly_expense": round(total_monthly_expenses, 2),
            "summary": "Positive Cash Flow" if net_flow > 0 else "Action Required: Negative Cash Flow"
        }

    except Exception as e:
        logger.error(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {e}")
