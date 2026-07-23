// server/src/engine/stack-adapters/python-fastapi.adapter.ts
// NEW FILE — complete FastAPI adapter config with all 5 mapping categories:
//   1. TypeScript interface → Pydantic BaseModel (type mapping)
//   2. NestJS DI → FastAPI Depends() (dependency injection)
//   3. NestJS Guard → FastAPI Security Dependency
//   4. NestJS Interceptor → FastAPI Middleware
//   5. NestJS ExceptionFilter → FastAPI Exception Handler

export interface StackAdapterConfig {
  stackId: string;
  language: string;
  fileExtension: string;
  templateDir: string;
  mappings: {
    typeMapping: Record<string, string>;
    namingConvention: string;
    dependencyInjection: Record<string, { template: string }>;
    guards: Record<string, { imports: string[]; template: string }>;
    interceptors: Record<string, { template: string }>;
    exceptionFilters: Record<string, { template: string }>;
    routes: Record<string, string>;
  };
}

export const FASTAPI_ADAPTER: StackAdapterConfig = {
  stackId: 'FastAPI',
  language: 'python',
  fileExtension: '.py',
  templateDir: 'templates/python-fastapi',

  mappings: {
    // Category 1: TypeScript interface → Pydantic BaseModel
    typeMapping: {
      string: 'str',
      number: 'float',
      integer: 'int',
      boolean: 'bool',
      Date: 'datetime',
      'string[]': 'List[str]',
      'number[]': 'List[float]',
      'Record<string, unknown>': 'Dict[str, Any]',
      unknown: 'Any',
      void: 'None',
      interface: 'BaseModel', // → Pydantic BaseModel
    },
    namingConvention: 'snake_case', // camelCase → snake_case

    // Category 2: NestJS DI → FastAPI Depends()
    dependencyInjection: {
      injectable: {
        template: `
def get_{service_name_snake}() -> {ServiceClass}:
    return {ServiceClass}()

class {ServiceClass}:
    def __init__(self, {dep_name}: {DepType} = Depends(get_{dep_name})):
        self.{dep_name} = {dep_name}
`,
      },
    },

    // Category 3: NestJS Guard → FastAPI Security Dependency
    guards: {
      JwtAuthGuard: {
        imports: ['from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials'],
        template: `
security = HTTPBearer()

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    token = credentials.credentials
    payload = decode_jwt(token)
    return payload["sub"]
`,
      },
    },

    // Category 4: NestJS Interceptor → FastAPI Middleware
    interceptors: {
      LoggingInterceptor: {
        template: `
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(f"{request.method} {request.url.path} {response.status_code} {duration:.3f}s")
    return response
`,
      },
    },

    // Category 5: NestJS ExceptionFilter → FastAPI Exception Handler
    exceptionFilters: {
      HttpExceptionFilter: {
        template: `
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": str(exc.status_code), "message": exc.detail},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"code": "INTERNAL_ERROR", "message": "An error occurred"})
`,
      },
    },

    // Routes: NestJS decorators → FastAPI path operations
    routes: {
      '@Get(path)': '@router.get("{path}")',
      '@Post(path)': '@router.post("{path}")',
      '@Put(path)': '@router.put("{path}")',
      '@Delete(path)': '@router.delete("{path}")',
      '@Patch(path)': '@router.patch("{path}")',
    },
  },
};
