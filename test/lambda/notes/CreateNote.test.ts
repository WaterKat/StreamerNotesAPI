import { handler, NOTE_HASH_HEADER } from "../../../lambda/notes/CreateNote";
import { mockClient } from 'aws-sdk-client-mock';
import { PutItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { DefaultNoteTemplate, Note } from "../../../lambda/lib/Note";

const dynamo = mockClient(DynamoDBClient);

beforeAll(() => {
    process.env.NOTES_TABLE = 'Notes';
    process.env.HANDLER_NAME = 'CreateNote';
});

beforeEach(() => {
    dynamo.reset();
});

const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    httpMethod: 'POST',
    requestContext: {
        authorizer: {
            claims: {
                sub: 'user-id',
            },
        },
    },
    headers: {
        'SN-Note-Template-Hash': '',
    },
    body: JSON.stringify(<Note>{
        UserId: 'user-id',
        NoteId: 'note-id',
        Title: 'title',
        Content: 'content',
        CreatedAt: '2023-01-01T00:00:00.000Z',
        UpdatedAt: '2023-01-01T00:00:00.000Z',
        CompletedAt: '2023-01-01T00:00:00.000Z',
        Archived: false,
        Completed: false,
        Groups: ['group1', 'group2'],
        Tags: ['tag1', 'tag2'],
    }),
    ...overrides
} as any);

test('returns 200 on valid request', async () => {
    dynamo.on(PutItemCommand).resolves({});
    const response = await handler(createEvent(), {} as any);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('message', 'Note created successfully');
    expect(body.data.note).toHaveProperty('NoteId', 'note-id');
    expect(body.data.template).toHaveProperty('name', DefaultNoteTemplate.name);
});

test('returns 200 on valid without template', async () => {
    dynamo.on(PutItemCommand).resolves({});
    const response = await handler(createEvent({ headers: { [NOTE_HASH_HEADER]: DefaultNoteTemplate.hash } }), {} as any);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('message', 'Note created successfully');
    expect(body.data.template).toBeUndefined();
});

test('returns 400 on invalid request', async () => {
    dynamo.on(PutItemCommand).resolves({});
    const response = await handler(createEvent({ body: '{}' }), {} as any);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error', 'Bad Request');
});

test('returns 401 on unauthorized', async () => {
    dynamo.on(PutItemCommand).resolves({});
    const response = await handler(createEvent({ requestContext: {} as any }), {} as any);
    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error', 'Unauthorized');
});

test('returns 403 on forbidden', async () => {
    dynamo.on(PutItemCommand).resolves({});
    const response = await handler(createEvent({ requestContext: {
        authorizer: {
            claims: {
                sub: 'unauthorized-user-id',
            },
        },
    } as any}), {} as any);
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error', 'Forbidden');
});