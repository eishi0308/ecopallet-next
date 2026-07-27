from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
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
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://fridely.netlify.app"],
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
        f"{i+1}. {it['name']} (receipt category: {it['category']})"
        for i, it in enumerate(items)
    )

    prompt = f"""You are a grocery expert. For each grocery item below, provide three things:
1. A short clean display name (2-5 words max, no brand names, no store names like "Woolworths"/"Coles"/"Devondale", no weights or sizes) — e.g. "eggs", "mozzarella cheese", "olive oil", "broccoli", "chicken thighs", "toothpaste"
2. The most specific category from ONLY this list: Fruit, Vegetable, Meat, Dairy, Drinks, Condiments, Bakery, Frozen, Pantry, Chilled, Health, Toiletries, Household, Baby, Pet
3. How many days the item typically lasts after purchase when stored correctly at home

Reply ONLY with a valid JSON array of objects in the same order as the items. No explanations, no markdown, just the JSON array.

Example: [{{"short_name": "eggs", "category": "Dairy", "shelf_days": 21}}, {{"short_name": "broccoli", "category": "Vegetable", "shelf_days": 7}}]

Items:
{item_list}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        ai_results = json.loads(response.choices[0].message.content.strip())
    except Exception:
        # Fallback: category-based defaults if OpenAI fails
        CATEGORY_DEFAULTS = {
            "Chilled": 7, "Dairy": 10, "Meat": 3, "Serviced": 3,
            "Fruit": 5, "Vegetable": 5, "Frozen": 90, "Bakery": 5, "Pantry": 180,
            "Condiments": 180, "Drinks": 14, "Health": 365,
            "Toiletries": 365, "Household": 365,
        }
        ai_results = [
            {
                "short_name": it["name"],
                "category":   it["category"],
                "shelf_days": CATEGORY_DEFAULTS.get(it["category"], 30),
            }
            for it in items
        ]

    # Build final response
    from datetime import date, timedelta
    today = date.today()
    result = []
    for it, ai in zip(items, ai_results):
        days   = int(ai.get("shelf_days", 30))
        expiry = today + timedelta(days=days)
        result.append({
            "name":        it["name"],
            "short_name":  ai.get("short_name", it["name"]),
            "qty":         it["qty"],
            "unit_price":  it["unit_price"],
            "total":       it["total"],
            "category":    ai.get("category", it["category"]),
            "shelf_days":  days,
            "expiry_date": f"{expiry.day} {expiry.strftime('%b')} {expiry.year}",
        })

    return {"items": result}


# ──────────────────────────────────────────────────────────────
# Storage tips (Tips page only)
#
# The 423-entry curated dataset stays the fast, free, deterministic
# path in the frontend. These endpoints only run where that dataset
# has nothing to say.
# ──────────────────────────────────────────────────────────────

TIP_SECTIONS = ["Pantry", "Refrigerator", "Freezer", "Additional Tips"]


@app.get("/storage-tips")
async def storage_tips(name: str):
    """
    Fallback for foods missing from the curated dataset. Returns the same
    shape as a tips-data.json entry so the UI renders it identically.
    Refuses to invent advice for things that are not food.
    """
    food = name.strip()
    if not food:
        raise HTTPException(status_code=400, detail="A food name is required")
    if len(food) > 60:
        raise HTTPException(status_code=400, detail="That food name is too long")

    prompt = f"""You are a food storage expert. The user searched for: "{food}"

First decide whether this is actually a food, drink, or grocery item.
If it is NOT (gibberish, an object, a person, a place), reply with exactly:
{{"is_food": false}}

If it IS, reply with a JSON object with these keys:
- "name": the tidy display name (e.g. "Halloumi", "Kombucha")
- "category": the single best fit from this list ONLY: Produce (Fresh Fruits),
  Produce (Fresh Vegetables), Dairy Products & Eggs, Meat & Seafood,
  Baked Goods (Bakery), Shelf Stable Foods, Condiments, Sauces & Canned Goods,
  Beverages, Frozen Foods, Deli & Prepared Foods, Vegetarian Proteins,
  Grains, Beans & Pasta, Herbs & Spices, Snacks & Confectionery
- "pantry": how it keeps at room temperature, or why that is not advised
- "refrigerator": how to store it in the fridge, including where and how long
- "freezer": whether it freezes well, how to do it, and for how long
- "additional": one genuinely useful, non-obvious tip

Each of the four text fields must be one or two plain sentences. Give concrete
timeframes wherever you can. No markdown, no bullet points, no preamble.
Reply with the JSON object and nothing else."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content.strip())
    except Exception:
        raise HTTPException(status_code=502, detail="Could not generate storage tips right now")

    if not data.get("is_food", True) or not data.get("refrigerator"):
        raise HTTPException(status_code=404, detail=f'"{food}" does not look like a food item')

    sections = [
        f"Pantry: {data.get('pantry', '').strip()}",
        f"Refrigerator: {data.get('refrigerator', '').strip()}",
        f"Freezer: {data.get('freezer', '').strip()}",
        f"Additional Tips: {data.get('additional', '').strip()}",
    ]

    return {
        "ID": f"ai-{food.lower()}",
        "Name": data.get("name", food).strip(),
        "Category_Name": data.get("category", "Shelf Stable Foods").strip(),
        "Keywords": food.lower(),
        "Tips": "\n".join(sections),
        "generated": True,
    }


class AdviceRequest(BaseModel):
    name: str
    amount: Optional[float] = None
    days_left: Optional[int] = None
    spent: Optional[float] = None


@app.post("/storage-advice")
async def storage_advice(req: AdviceRequest):
    """
    Situational advice for one pantry item. A static table cannot say
    "yours expires in 2 days" — this can, because it knows the quantity,
    the days remaining and what was paid.
    """
    food = req.name.strip()
    if not food:
        raise HTTPException(status_code=400, detail="A food name is required")

    facts = [f"item: {food}"]
    if req.amount is not None:
        facts.append(f"quantity on hand: {req.amount}")
    if req.days_left is not None:
        facts.append(
            "already past its expiry date" if req.days_left < 0
            else f"days until expiry: {req.days_left}"
        )
    if req.spent is not None:
        facts.append(f"amount paid: ${req.spent:.2f}")

    prompt = f"""You are a food waste expert advising someone about one item in their kitchen.

{chr(10).join(facts)}

Give ONE piece of advice for what they should do about this specific item today.
Be concrete and act on the numbers above — reference the days remaining and the
quantity where they matter. If it is close to expiring, say what to do right now
(freeze in portions, cook it tonight, and so on). If there is plenty of time, give
the single best thing to do to make it last.

Two sentences maximum, under 200 characters, plain text, no markdown, no preamble.
Reply with a JSON object: {{"advice": "..."}}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content.strip())
    except Exception:
        raise HTTPException(status_code=502, detail="Could not generate advice right now")

    advice = (data.get("advice") or "").strip()
    if not advice:
        raise HTTPException(status_code=502, detail="Could not generate advice right now")

    return {"advice": advice}
