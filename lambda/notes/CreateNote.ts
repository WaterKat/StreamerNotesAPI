import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { APIGatewayProxyResult, type APIGatewayProxyEvent, type Context } from "aws-lambda";
import { Claim } from "../lib/types";
import { DefaultNoteTemplate, NoteTemplate, type Note } from "../lib/Note";
import { tryParseJson, validateNote, sanitize } from "../lib/utils";
import { BadRequestReponse, createJsonResponse as jsonResponse, ForbiddenReponse, UnauthorizedReponse, BodyResponse } from "../lib/Api";

type CreateNoteData = {
  note: Partial<Note>;
  template?: NoteTemplate
};

type CreateNoteBodyResponse = BodyResponse<CreateNoteData>;

const NOTES_TABLE = process.env.NOTES_TABLE;
//const HANDLER_NAME = process.env.HANDLER_NAME;

export const NOTE_HASH_HEADER = 'SN-Note-Template-Hash';

const dynamo = new DynamoDBClient();

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const claims: Partial<Claim> | undefined = event.requestContext.authorizer?.claims;

  if (!claims || !claims.sub) {
    return UnauthorizedReponse;
  }

  const body = tryParseJson<Partial<Note>>(event.body);

  if (!body || !validateNote(body)) {
    return BadRequestReponse;
  }

  if (!body.UserId || body.UserId !== claims.sub) {
    return ForbiddenReponse;
  }

  const new_note: Note = {
    UserId: body.UserId!,
    NoteId: body.NoteId!.startsWith('SN_LOCAL_') ? crypto.randomUUID() : body.NoteId!,
    Title: body.Title,
    Content: body.Content,
    CreatedAt: body.CreatedAt || new Date().toISOString(),
    UpdatedAt: body.UpdatedAt || body.CreatedAt || new Date().toISOString(),
    CompletedAt: body.CompletedAt,
    Archived: body.Archived,
    Completed: body.Completed,
    Groups: body.Groups,
    Tags: body.Tags
  }

  const shouldIncludeTemplate = !event.headers[NOTE_HASH_HEADER] || event.headers[NOTE_HASH_HEADER] !== DefaultNoteTemplate.hash;

  const response_data: CreateNoteData = {
    note: sanitize(new_note),
    ...(shouldIncludeTemplate ? { template: DefaultNoteTemplate } : {})
  };

  const response_body: CreateNoteBodyResponse = {
    message: 'Note created successfully',
    data: response_data
  };

  try {
    await dynamo.send(new PutItemCommand({
      TableName: NOTES_TABLE,
      Item: marshall(new_note, { removeUndefinedValues: true })
    }));
    return jsonResponse(200, response_body);
  } catch (error) {
    console.error(error);
    return jsonResponse(500, { error: 'Internal Server Error' });
  }
};
