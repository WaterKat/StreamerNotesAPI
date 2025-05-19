import { DynamoRequestMap } from "./Dynamo";
import { createHash } from "crypto";

type ServerId = string; // uuid v4

/**
 * as defined in the database
*/
export type Note = {
    UserId: ServerId; // PK
    NoteId: ServerId; // SK

    Title?: string;
    Content?: string;
    CreatedAt?: string; // ISO 8601
    UpdatedAt?: string; // ISO 8601
    CompletedAt?: string; // ISO 8601
    Archived?: boolean;
    Completed?: boolean;
    Groups?: string[];
    Tags?: string[];
};

/**
 * The Crud request types for notes
 */
export type NoteCrudRequest = DynamoRequestMap<Note, 'UserId', 'NoteId'>;

/**
 * Template for default notes
 */
export type NoteTemplate = {
    name: string;
    base: Required<Note>;
    hash: string;
};

/**
 * The default values for a note
 * @since 1.0.0
 */
const DefaultNoteTemplateBase: Required<Note> = {
    UserId: '',
    NoteId: '',
    Title: '',
    Content: '',
    CreatedAt: '',
    UpdatedAt: '',
    CompletedAt: '',
    Archived: false,
    Completed: false,
    Groups: [],
    Tags: [],
} as const;

export const DefaultNoteTemplate: NoteTemplate = {
    name: 'DefaultNoteV1',
    base: DefaultNoteTemplateBase,
    hash: createHash('sha256').update(JSON.stringify(DefaultNoteTemplateBase)).digest('hex'),
} as const;


