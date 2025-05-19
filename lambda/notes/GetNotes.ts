import type { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";

import { DynamoDBClient, GetItemCommand, InternalServerError, QueryCommand } from "@aws-sdk/client-dynamodb";
import { NOTE_HASH_HEADER } from "./CreateNote";
import { Claim } from "../lib/types";
import { BodyResponse, createJsonResponse, InternalServerErrorReponse, UnauthorizedReponse } from "../lib/Api";
import { DefaultNoteTemplate, type Note, type NoteTemplate } from "../lib/Note";
import { unmarshall } from "@aws-sdk/util-dynamodb";

type GetNoteData = {
  notes: Partial<Note>[];
  template?: NoteTemplate;
};

type GetNoteBodyResponse = BodyResponse<GetNoteData>;

const NOTES_TABLE = process.env.NOTES_TABLE;

const dynamo = new DynamoDBClient();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const claims: Partial<Claim> | undefined = event.requestContext.authorizer?.claims;

  if (!claims || !claims.sub) {
    return UnauthorizedReponse;
  }

  const user_id = claims.sub;
  const note_id = event.pathParameters?.NoteId;

  try {
    const dynamo_response = await dynamo.send(new QueryCommand({
      TableName: NOTES_TABLE,
      KeyConditionExpression:
        note_id ? 'UserId = :user_id AND NoteId = :note_id' : 'UserId = :user_id',
      ExpressionAttributeValues: {
        ':user_id': { S: user_id },
        ...(note_id ? { ':note_id': { S: note_id } } : {}),
      }
    }));

    const notes: Note[] = dynamo_response.Items?.map(item => unmarshall(item)) as Note[] ?? [];

    const shouldIncludeTemplate = !event.headers[NOTE_HASH_HEADER] || event.headers[NOTE_HASH_HEADER] !== DefaultNoteTemplate.hash;

    const body_response: GetNoteBodyResponse = {
      message: 'success',
      data: {
        notes: notes,
        ...(shouldIncludeTemplate ? { template: DefaultNoteTemplate } : {}),
      },
    };

    return createJsonResponse(200, body_response);
  } catch (error) {
    console.error(error);
    return InternalServerErrorReponse;
  }
};
