from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import json
import tempfile
from dotenv import load_dotenv
from openai import OpenAI
from ocr_ereceipt import parse_ereceipt

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://fridely.netlify.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "c28caa21ebmshad90569c94c63b6p1bed38jsn8049f9342f0f")
RAPIDAPI_HOST = "spoonacular-recipe-food-nutrition-v1.p.rapidapi.com"
BASE_URL = f"https://{RAPIDAPI_HOST}"

HEADERS = {
    
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
}


@app.get("/recipes")
async def find_recipes_by_ingredients(ingredients: str, number: int = 15):
    """Find recipes by ingredients. ingredients = comma-separated string e.g. 'salmon,milk,eggs'"""
    url = f"{BASE_URL}/recipes/findByIngredients"
    params = {
        "ingredients": ingredients,
        "number": number,
        "ranking": 1,
        "ignorePantry": True,
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=HEADERS, params=params)
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="Spoonacular rate limit reached")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch recipes")
        return response.json()


@app.get("/recipes/{recipe_id}")
async def get_recipe_details(recipe_id: int):
    """Get full details for a single recipe by id."""
    url = f"{BASE_URL}/recipes/{recipe_id}/information"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=HEADERS)
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="Spoonacular rate limit reached")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch recipe details")
        return response.json()


@app.post("/ereceipt")
async def parse_receipt(file: UploadFile = File(...)):
    """
    Accept a Woolworths e-receipt PDF, parse items, then use OpenAI to
    estimate shelf life (days) for each item. Returns items with expiry dates.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Save upload to a temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        items = parse_ereceipt(tmp_path)
    finally:
        os.unlink(tmp_path)

    if not items:
        raise HTTPException(status_code=422, detail="No items found in receipt")

    # Build a compact list for the OpenAI prompt
    item_list = "\n".join(
        f"{i+1}. {it['name']} (category: {it['category']})"
        for i, it in enumerate(items)
    )

    prompt = f"""You are a food shelf-life expert. For each grocery item below, estimate how many days it typically lasts after purchase when stored correctly at home.

Reply ONLY with a valid JSON array of integers (one number per item, in the same order). No explanations, no markdown, just the JSON array.

Example: [7, 14, 90, 3]

Items:
{item_list}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        shelf_days = json.loads(response.choices[0].message.content.strip())
    except Exception:
        # Fallback: category-based defaults if OpenAI fails
        CATEGORY_DEFAULTS = {
            "Chilled": 7, "Dairy": 10, "Meat": 3, "Serviced": 3,
            "Fruit": 5, "Frozen": 90, "Bakery": 5, "Pantry": 180,
            "Cooking": 180, "Drinks": 14, "Health": 365,
            "Toiletries": 365, "Household": 365,
        }
        shelf_days = [
            CATEGORY_DEFAULTS.get(it["category"], 30) for it in items
        ]

    # Build final response
    from datetime import date, timedelta
    today = date.today()
    result = []
    for it, days in zip(items, shelf_days):
        expiry = today + timedelta(days=int(days))
        result.append({
            "name":       it["name"],
            "qty":        it["qty"],
            "unit_price": it["unit_price"],
            "total":      it["total"],
            "category":   it["category"],
            "shelf_days": int(days),
            "expiry_date": f"{expiry.day} {expiry.strftime('%b')} {expiry.year}",  # e.g. "21 Apr 2025"
        })

    return {"items": result}
