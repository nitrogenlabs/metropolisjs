/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

export interface BaseDocument {
  readonly _id?: string;
  readonly _key?: string;
  readonly _rev?: string;
  readonly added?: number;
  readonly id?: string;
  readonly modified?: number;
  readonly type?: string;
  readonly updated?: number;
}

export interface ExtensibleFields {
  readonly [key: string]: any;
}

export interface ListFilters {
  readonly from?: number;
  readonly to?: number;
  readonly sort?: string;
  readonly order?: 'asc' | 'desc';
  readonly [key: string]: any;
}

export interface ListOptions {
  readonly fields?: string[];
  readonly limit?: number;
  readonly offset?: number;
  readonly [key: string]: any;
}
