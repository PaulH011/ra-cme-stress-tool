"""
Scenario management endpoints.

Provides CRUD operations for saved scenarios using SQLAlchemy.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import json
import sys
import os

# Add parent directory to path to import auth module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from api.models.requests import ScenarioCreateRequest
from auth.database import get_db_session
from auth.models import Scenario, User

router = APIRouter()


@router.get("/")
async def list_scenarios(user_id: str):
    """
    List all scenarios for a user.

    Parameters:
        user_id: The user's ID from authentication
    """
    db = get_db_session()
    try:
        scenarios = db.query(Scenario).filter(Scenario.user_id == user_id).all()
        
        return {
            "scenarios": [
                {
                    "id": s.id,
                    "name": s.name,
                    "user_id": s.user_id,
                    "overrides": json.loads(s.overrides) if s.overrides else {},
                    "base_currency": s.base_currency,
                    "created_at": s.created_at.isoformat() if s.created_at else "",
                    "updated_at": s.updated_at.isoformat() if s.updated_at else "",
                }
                for s in scenarios
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.post("/")
async def create_scenario(user_id: str, request: ScenarioCreateRequest):
    """
    Create a new scenario.

    Parameters:
        user_id: The user's ID from authentication
        request: Scenario data including name, overrides, and base currency
    """
    db = get_db_session()
    try:
        # Check if scenario with same name exists for this user
        existing = db.query(Scenario).filter(
            Scenario.user_id == user_id,
            Scenario.name == request.name
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Scenario '{request.name}' already exists"
            )
        
        scenario = Scenario(
            user_id=user_id,
            name=request.name,
            overrides=json.dumps(request.overrides) if request.overrides else "{}",
            base_currency=request.base_currency or "usd",
        )
        
        db.add(scenario)
        db.commit()
        db.refresh(scenario)
        
        return {
            "success": True,
            "scenario": {
                "id": scenario.id,
                "name": scenario.name,
                "user_id": scenario.user_id,
                "overrides": json.loads(scenario.overrides) if scenario.overrides else {},
                "base_currency": scenario.base_currency,
                "created_at": scenario.created_at.isoformat() if scenario.created_at else "",
                "updated_at": scenario.updated_at.isoformat() if scenario.updated_at else "",
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str, user_id: str):
    """
    Get a specific scenario by ID.

    Parameters:
        scenario_id: The scenario's ID
        user_id: The user's ID (for authorization check)
    """
    db = get_db_session()
    try:
        scenario = db.query(Scenario).filter(
            Scenario.id == scenario_id,
            Scenario.user_id == user_id
        ).first()
        
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        return {
            "id": scenario.id,
            "name": scenario.name,
            "user_id": scenario.user_id,
            "overrides": json.loads(scenario.overrides) if scenario.overrides else {},
            "base_currency": scenario.base_currency,
            "created_at": scenario.created_at.isoformat() if scenario.created_at else "",
            "updated_at": scenario.updated_at.isoformat() if scenario.updated_at else "",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.put("/{scenario_id}")
async def update_scenario(scenario_id: str, user_id: str, request: ScenarioCreateRequest):
    """
    Update an existing scenario.

    Parameters:
        scenario_id: The scenario's ID
        user_id: The user's ID (for authorization check)
        request: Updated scenario data
    """
    db = get_db_session()
    try:
        scenario = db.query(Scenario).filter(
            Scenario.id == scenario_id,
            Scenario.user_id == user_id
        ).first()
        
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        scenario.name = request.name
        scenario.overrides = json.dumps(request.overrides) if request.overrides else "{}"
        scenario.base_currency = request.base_currency or "usd"
        scenario.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(scenario)
        
        return {
            "success": True,
            "scenario": {
                "id": scenario.id,
                "name": scenario.name,
                "user_id": scenario.user_id,
                "overrides": json.loads(scenario.overrides) if scenario.overrides else {},
                "base_currency": scenario.base_currency,
                "created_at": scenario.created_at.isoformat() if scenario.created_at else "",
                "updated_at": scenario.updated_at.isoformat() if scenario.updated_at else "",
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.delete("/{scenario_id}")
async def delete_scenario(scenario_id: str, user_id: str):
    """
    Delete a scenario.

    Parameters:
        scenario_id: The scenario's ID
        user_id: The user's ID (for authorization check)
    """
    db = get_db_session()
    try:
        scenario = db.query(Scenario).filter(
            Scenario.id == scenario_id,
            Scenario.user_id == user_id
        ).first()
        
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        db.delete(scenario)
        db.commit()
        
        return {"success": True, "deleted": scenario_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
