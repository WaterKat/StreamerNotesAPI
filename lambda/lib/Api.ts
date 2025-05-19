type JsonPrimitive = string | number | boolean | null;
type Json = JsonPrimitive | Json[] | { [key: string]: Json };
type JsonSerializeable = Json[] | { [key: string]: Json };

type StatusCodes = {
    Success: 200;
    'Bad Request': 400;
    Unauthorized: 401;
    Forbidden: 403;
    'Not Found': 404;
    'Internal Server Error': 500;
}

type DataResponse<T extends JsonSerializeable> = {
    message: string;
    data: T;
}

type SuccessResponse = {
    message: string;
}

type ErrorResponse = {
    error: keyof StatusCodes;
    message?: string;
}

export type BodyResponse<T extends JsonSerializeable> = DataResponse<T> | SuccessResponse | ErrorResponse;

type AnyStatusCode = StatusCodes[keyof StatusCodes];

export const createJsonResponse = <C extends AnyStatusCode,T extends JsonSerializeable>(statusCode: C, body: BodyResponse<T>) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

export const BadRequestReponse = createJsonResponse(400, { error: 'Bad Request' });
export const UnauthorizedReponse = createJsonResponse(401, { error: 'Unauthorized' });
export const ForbiddenReponse = createJsonResponse(403, { error: 'Forbidden' });
export const NotFoundReponse = createJsonResponse(404, { error: 'Not Found' });
export const InternalServerErrorReponse = createJsonResponse(500, { error: 'Internal Server Error' });