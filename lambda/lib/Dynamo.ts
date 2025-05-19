
export type DynamoRequestMap<T, PK extends keyof T, SK extends keyof T> = {
    PUT: Required<Pick<T, PK | SK>> & Partial<Omit<T, PK | SK>>;
    GET: Required<Pick<T, PK | SK>>;
    PATCH: Required<Pick<T, PK | SK>> & Partial<Omit<T, PK | SK>>;
    DELETE: Required<Pick<T, PK | SK>>;
};
