declare const __brand: unique symbol;
export type Branded<T, Brand = void> = T & { readonly [__brand]: Brand };

export type Claim = {
  sub: string;
};
type LocalId = `SN_LOCAL_${string}`;

