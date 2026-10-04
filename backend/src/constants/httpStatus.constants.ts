export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

export enum HttpResponseMessage {
  SUCCESS = 'Operation completed successfully',
  CREATED = 'Resource created successfully',
  BAD_REQUEST = 'Invalid parameter or validation error',
  NOT_FOUND = 'Requested resource not found',
  INTERNAL_ERROR = 'An unexpected internal error occurred',
}
