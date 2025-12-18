from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

# 1. Create the app instance FIRST
app = FastAPI()

# 2. Add Middleware SECOND
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Define your routes LAST
@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...), current_savings: float = 0):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Clean column names
        df.columns = [c.strip() for c in df.columns]
        df['Amount'] = pd.to_numeric(df['Amount'])

        # Categorization Logic
        def categorize(description):
            desc = str(description).lower()
            if any(k in desc for k in ['rent', 'mortgage', 'housing']): return 'Housing'
            if any(k in desc for k in ['food', 'grocer', 'swiggy', 'zomato', 'restaur']): return 'Food'
            if any(k in desc for k in ['uber', 'petrol', 'gas', 'train', 'flight']): return 'Travel'
            if any(k in desc for k in ['amazon', 'apple', 'netflix', 'shop']): return 'Shopping'
            return 'Other'

        expenses_df = df[df['Amount'] < 0].copy()
        # Find the correct description column
        desc_col = 'Description' if 'Description' in df.columns else df.columns[1]
        expenses_df['Category'] = expenses_df[desc_col].apply(categorize)
        
        category_totals = expenses_df.groupby('Category')['Amount'].sum().abs().to_dict()

        # Projection Logic (Calculate net flow)
        net_flow = df['Amount'].sum()
        
        projection = []
        for i in range(1, 13):
            projection.append({
                "month": i,
                "estimated_balance": float(current_savings + (net_flow * i))
            })

        # Calculate average monthly expense for the safety buffer
        total_expenses = sum(category_totals.values())
        safety_buffer_months = current_savings / total_expenses if total_expenses > 0 else 12

        return {
            "burn_rate": round(float(net_flow), 2),
            "projection": projection,
            "categories": category_totals,
            "safety_buffer": round(safety_buffer_months, 1),
            "avg_monthly_expense": round(total_expenses, 2),
            "summary": "On track" if net_flow > 0 else "Negative Cash Flow"
        }
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return {"error": str(e)}