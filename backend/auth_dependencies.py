"""
JWT Authentication Dependencies for FastAPI

Usage:
    from auth_dependencies import get_current_user, require_admin
    
    @app.get("/api/protected")
    async def protected_route(user = Depends(get_current_user)):
        return {"user": user}
    
    @app.get("/api/admin-only")
    async def admin_route(user = Depends(require_admin)):
        return {"admin": user}
"""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from backend.main import get_db, SECRET_KEY, ALGORITHM, OAuthUser


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user from JWT token in cookie
    Returns user object or raises 401
    """
    token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated - Please login to access this resource"
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        
        if email is None or user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token - Please login again"
            )
        
        # Fetch user from database
        user = db.query(OAuthUser).filter(OAuthUser.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="User not found - Please login again"
            )
        
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "provider": user.provider,
            "is_admin": bool(user.is_admin),
            "picture": user.picture,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        
    except JWTError as e:
        if "expired" in str(e).lower():
            raise HTTPException(
                status_code=401,
                detail="Token expired - Please login again"
            )
        raise HTTPException(
            status_code=401,
            detail="Invalid token - Please login again"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication error: {str(e)}"
        )


async def require_admin(
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Require authenticated user with admin privileges
    Returns user object or raises 403
    """
    if not user.get("is_admin"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden - Admin access required"
        )
    
    return user


async def require_authentication(
    user = Depends(get_current_user)
):
    """
    Alias for get_current_user - makes code more readable
    """
    return user
