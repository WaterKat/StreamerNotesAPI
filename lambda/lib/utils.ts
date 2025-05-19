import { AttributeValue } from "@aws-sdk/client-dynamodb";
import type { Note } from "./Note";

export type ToDynamoAttributeValue<T> = {
  [K in keyof T]:
  T[K] extends string ? { S: string } :
  T[K] extends number ? { N: string } :
  T[K] extends boolean ? { BOOL: boolean } :
  T[K] extends Array<infer U> ? { L: ToDynamoAttributeValue<U>[] } :
  T[K] extends object ? { M: ToDynamoAttributeValue<T[K]> } :
  AttributeValue;
}

export const tryParseJson = <T = unknown>(str: unknown): T | undefined => {
  if (typeof str !== 'string') return;
  try { return JSON.parse(str); }
  catch { return; }
};
const isIsoDate = (str: unknown): str is string => {
  if (typeof str !== "string")
    return false;

  if (str.trim() === "")
    return false;

  try {
    const date = new Date(str);
    return !isNaN(date.valueOf()) && date.toISOString() === str;
  } catch { return false; }
};
const validateStringArray = (arr?: string[]): boolean => {
  if (!Array.isArray(arr)) return false;
  return arr.every((item) => typeof item === 'string');
};
export const validateNote = (note: Partial<Note>): boolean => {
  return (
    typeof note.UserId === 'string' && // REQUIRED PK
    typeof note.NoteId === 'string' && // REQUIRED SK
    (typeof note.Title === 'string' || typeof note.Title === 'undefined') &&
    (typeof note.Content === 'string' || typeof note.Content === 'undefined') &&
    (isIsoDate(note.CreatedAt) || typeof note.CreatedAt === 'undefined') &&
    (isIsoDate(note.UpdatedAt) || typeof note.UpdatedAt === 'undefined') &&
    (isIsoDate(note.CompletedAt) || typeof note.CompletedAt === 'undefined') &&
    (typeof note.Archived === 'boolean' || typeof note.Archived === 'undefined') &&
    (typeof note.Completed === 'boolean' || typeof note.Completed === 'undefined') &&
    (validateStringArray(note.Groups) || typeof note.Groups === 'undefined') &&
    (validateStringArray(note.Tags) || typeof note.Tags === 'undefined')
  );
};
export const sanitize = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
};
