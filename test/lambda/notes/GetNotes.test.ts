//! Mock DynamoDB client first
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
const dynamo = mockClient(DynamoDBClient);

//! Then import the handler
import { handler as createHandler, NOTE_HASH_HEADER } from "../../../lambda/notes/CreateNote";
import { handler } from "../../../lambda/notes/GetNotes";

import { PutItemCommand, ScanCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { DefaultNoteTemplate, Note } from "../../../lambda/lib/Note";
import { ToDynamoAttributeValue } from "../../../lambda/lib/utils";

const notes: ToDynamoAttributeValue<Note>[] = [];

beforeAll(() => {
    process.env.NOTES_TABLE = 'Notes';
    process.env.HANDLER_NAME = 'CreateNote';

    dynamo.on(PutItemCommand).callsFake(async (command) => {
        notes.push(command.Item);
        return {};
    })
    dynamo.on(ScanCommand).callsFake(async () => { throw new Error('Not implemented') });
    dynamo.on(QueryCommand).callsFake(async (params) => {
        const { KeyConditionExpression, ExpressionAttributeValues } = params;

        const user_id = ExpressionAttributeValues[':user_id']?.S;
        const note_id = ExpressionAttributeValues[':note_id']?.S;

        if (!user_id) {
            return { Items: [] };
        }

        if (note_id) {
            return { Items: notes.filter(note => note.UserId?.S === user_id && note.NoteId?.S === note_id) };
        } else {
            return { Items: notes.filter(note => note.UserId?.S === user_id) };
        }
    });
});

beforeEach(() => {
//    dynamo.reset();
    notes.length = 0;
});

const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}, note_override?: Partial<Note>): APIGatewayProxyEvent => ({
    ...overrides,
    httpMethod: 'POST',
    requestContext: {
        authorizer: {
            claims: {
                sub: 'rand-user-id',
            },
        },
    },
    headers: {
        [NOTE_HASH_HEADER]: DefaultNoteTemplate.hash
    },
    body: JSON.stringify(<Note>{
        UserId: 'rand-user-id',
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
        ...(note_override ?? {}),
    }),
    ...overrides
} as any);

const getEventAll = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    requestContext: {
        authorizer: {
            claims: {
                sub: 'rand-user-id',
            },
        },
    },
    headers: {
        [NOTE_HASH_HEADER]: DefaultNoteTemplate.hash
    },
    ...overrides
} as any);

const getEventOne = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    requestContext: {
        authorizer: {
            claims: {
                sub: 'rand-user-id',
            },
        },
    },
    pathParameters: {
        NoteId: 'note-id',
    },
    headers: {
        [NOTE_HASH_HEADER]: DefaultNoteTemplate.hash
    },
    ...overrides
} as any);

test('fetches all notes', async () => {
    //! Create 2 notes
    await createHandler(createEvent(), {} as any);
    await createHandler(createEvent({}, { NoteId: 'note-id-2' }), {} as any);

    //console.log(notes);

    const response = await handler(getEventAll());
    expect(response.statusCode).toBe(200);
    const response_body = JSON.parse(response.body);
    expect(response_body).toHaveProperty('message', 'success');
    expect(response_body.data.notes.length).toBe(2);
    expect(response_body.data.notes[1]).toHaveProperty('UserId', 'rand-user-id');
    expect(response_body.data.notes[1]).toHaveProperty('NoteId', 'note-id-2');

    const response2 = await handler(getEventOne());
    expect(response2.statusCode).toBe(200);
    const body2 = JSON.parse(response2.body);
    expect(body2).toHaveProperty('message', 'success');
    expect(body2.data.notes.length).toBe(1);
    expect(body2.data.notes[0]).toHaveProperty('UserId', 'rand-user-id');
    expect(body2.data.notes[0]).toHaveProperty('NoteId', 'note-id');
});

test('returns 401 on unauthorized', async () => {
    const response = await handler(getEventAll({ requestContext: {} as any }));
    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error', 'Unauthorized');
});
