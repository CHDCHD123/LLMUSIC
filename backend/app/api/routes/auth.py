from fastapi import APIRouter, HTTPException, Request

from backend.app.models.schemas import AuthResponse, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
def login(request: Request, payload: LoginRequest) -> AuthResponse:
    auth_service = request.app.state.auth_service
    is_valid, error_message = auth_service.validate_credentials(payload.username.strip(), payload.password)
    if not is_valid:
        raise HTTPException(status_code=401, detail=error_message)

    username = payload.username.strip()
    token = auth_service.create_token(username)
    return AuthResponse(token=token, username=username)


@router.get("/me")
def me(request: Request) -> dict:
    user = request.app.state.auth_service.require_user(request)
    return {"username": user.username}
