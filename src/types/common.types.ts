/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

export interface BaseDocument {
  _id?: string;
  _key?: string;
  _rev?: string;
  added?: number;
  id?: string;
  modified?: number;
  type?: string;
  updated?: number;
}

export interface ExtensibleFields {
  [key: string]: any;
}

export interface ListFilters {
  from?: number;
  to?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  [key: string]: any;
}

export interface ListOptions {
  fields?: string[];
  limit?: number;
  offset?: number;
  [key: string]: any;
}
