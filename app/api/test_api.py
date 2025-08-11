#!/usr/bin/env python3
"""
Simple test script for the Sleeper Draft Assistant API
Run this to verify the backend is working correctly
"""

import asyncio
import httpx
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = "http://localhost:8000"

async def test_health():
    """Test the health check endpoint"""
    print("Testing health check...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False

async def test_discover():
    """Test the discover endpoint with a sample username"""
    print("\nTesting discover endpoint...")
    username = "test_user"  # Replace with a real username for testing
    season = "2024"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/discover?username={username}&season={season}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Discover endpoint working: {len(data.get('leagues', []))} leagues found")
            return True
        elif response.status_code == 404:
            print(f"⚠️  Discover endpoint working but user not found (expected for test)")
            return True
        else:
            print(f"❌ Discover endpoint failed: {response.status_code}")
            return False

async def test_players():
    """Test the players endpoint"""
    print("\nTesting players endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/players")
        if response.status_code == 200:
            data = response.json()
            player_count = len(data.get('players', {}))
            print(f"✅ Players endpoint working: {player_count} players loaded")
            return True
        else:
            print(f"❌ Players endpoint failed: {response.status_code}")
            return False

async def test_recommendations():
    """Test the recommendations endpoint with mock data"""
    print("\nTesting recommendations endpoint...")
    
    # Mock request data
    request_data = {
        "draft_id": "test_draft_123",
        "team_on_clock": "team_1",
        "strategy": "balanced"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/recommend",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            rec_count = len(data.get('ranked', []))
            llm_enabled = data.get('llm_enabled', False)
            print(f"✅ Recommendations endpoint working: {rec_count} recommendations")
            print(f"   LLM enabled: {llm_enabled}")
            return True
        else:
            print(f"❌ Recommendations endpoint failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Error: {response.text}")
            return False

async def main():
    """Run all tests"""
    print("🧪 Testing Sleeper Draft Assistant API")
    print("=" * 50)
    
    tests = [
        test_health(),
        test_players(),
        test_discover(),
        test_recommendations()
    ]
    
    results = await asyncio.gather(*tests, return_exceptions=True)
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    passed = 0
    total = len(results)
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"❌ Test {i+1} failed with exception: {result}")
        elif result:
            passed += 1
            print(f"✅ Test {i+1} passed")
        else:
            print(f"❌ Test {i+1} failed")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The API is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    asyncio.run(main())

