from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://fridely.netlify.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
