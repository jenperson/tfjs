/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {env} from './environment';
import {BackendValues, DataType, RecursiveArray, TensorLike, TypedArray} from './types';
import * as base from './util_base';
export * from './util_base';
export * from './hash_util';

/**
 * Create typed array for scalar value. Used for storing in `DataStorage`.
 */
export function createScalarValue(
    value: DataType, dtype: DataType): BackendValues {
  if (dtype === 'string') {
    return encodeString(value);
  }

  return toTypedArray([value], dtype);
}

function noConversionNeeded(a: TensorLike, dtype: DataType): boolean {
  return (a instanceof Float32Array && dtype === 'float32') ||
      (a instanceof Int32Array && dtype === 'int32') ||
      (a instanceof Uint8Array && dtype === 'bool');
}

export function toTypedArray(a: TensorLike, dtype: DataType): TypedArray {
  if (dtype === 'string') {
    throw new Error('Cannot convert a string[] to a TypedArray');
  }
  if (Array.isArray(a)) {
    a = flatten(a);
  }

  if (env().getBool('DEBUG')) {
    base.checkConversionForErrors(a as number[], dtype);
  }
  if (noConversionNeeded(a, dtype)) {
    return a as TypedArray;
  }
  if (dtype == null || dtype === 'float32' || dtype === 'complex64') {
    return new Float32Array(a as number[]);
  } else if (dtype === 'int32') {
    return new Int32Array(a as number[]);
  } else if (dtype === 'bool') {
    const bool = new Uint8Array((a as number[]).length);
    for (let i = 0; i < bool.length; ++i) {
      if (Math.round((a as number[])[i]) !== 0) {
        bool[i] = 1;
      }
    }
    return bool;
  } else {
    throw new Error(`Unknown data type ${dtype}`);
  }
}

/**
 * Returns the current high-resolution time in milliseconds relative to an
 * arbitrary time in the past. It works across different platforms (node.js,
 * browsers).
 *
 * ```js
 * console.log(tf.util.now());
 * ```
 *
 * @doc {heading: 'Util', namespace: 'util'}
 */
export function now(): number {
  return env().platform.now();
}

/**
 * Returns a platform-specific implementation of
 * [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
 *
 * If `fetch` is defined on the global object (`window`, `process`, etc.),
 * `tf.util.fetch` returns that function.
 *
 * If not, `tf.util.fetch` returns a platform-specific solution.
 *
 * ```js
 * const resource = await tf.util.fetch('https://unpkg.com/@tensorflow/tfjs');
 * // handle response
 * ```
 *
 * @doc {heading: 'Util'}
 */
export function fetch(
    path: string, requestInits?: RequestInit): Promise<Response> {
  return env().platform.fetch(path, requestInits);
}

/**
 * Encodes the provided string into bytes using the provided encoding scheme.
 *
 * @param s The string to encode.
 * @param encoding The encoding scheme. Defaults to utf-8.
 *
 * @doc {heading: 'Util'}
 */
export function encodeString(s: string, encoding = 'utf-8'): Uint8Array {
  encoding = encoding || 'utf-8';
  return env().platform.encode(s, encoding);
}

/**
 * Decodes the provided bytes into a string using the provided encoding scheme.
 * @param bytes The bytes to decode.
 *
 * @param encoding The encoding scheme. Defaults to utf-8.
 *
 * @doc {heading: 'Util'}
 */
export function decodeString(bytes: Uint8Array, encoding = 'utf-8'): string {
  encoding = encoding || 'utf-8';
  return env().platform.decode(bytes, encoding);
}

export function isTypedArray(a: {}): a is Float32Array|Int32Array|Uint8Array|
    Uint8ClampedArray {
  return env().platform.isTypedArray(a);
}

// NOTE: We explicitly type out what T extends instead of any so that
// util.flatten on a nested array of number doesn't try to infer T as a
// number[][], causing us to explicitly type util.flatten<number>().
/**
 *  Flattens an arbitrarily nested array.
 *
 * ```js
 * const a = [[1, 2], [3, 4], [5, [6, [7]]]];
 * const flat = tf.util.flatten(a);
 * console.log(flat);
 * ```
 *
 *  @param arr The nested array to flatten.
 *  @param result The destination array which holds the elements.
 *  @param skipTypedArray If true, avoids flattening the typed arrays. Defaults
 *      to false.
 *
 * @doc {heading: 'Util', namespace: 'util'}
 */
export function
flatten<T extends number|boolean|string|Promise<number>|TypedArray>(
    arr: T|RecursiveArray<T>, result: T[] = [], skipTypedArray = false): T[] {
  if (result == null) {
    result = [];
  }
  if (typeof arr === 'boolean' || typeof arr === 'number' ||
    typeof arr === 'string' || base.isPromise(arr) || arr == null ||
      isTypedArray(arr) && skipTypedArray) {
    result.push(arr as T);
  } else if (Array.isArray(arr) || isTypedArray(arr)) {
    for (let i = 0; i < arr.length; ++i) {
      flatten(arr[i], result, skipTypedArray);
    }
  } else {
    let maxIndex = -1;
    for (const key of Object.keys(arr)) {
      // 0 or positive integer.
      if (/^([1-9]+[0-9]*|0)$/.test(key)) {
        maxIndex = Math.max(maxIndex, Number(key));
      }
    }
    for (let i = 0; i <= maxIndex; i++) {
      // tslint:disable-next-line: no-unnecessary-type-assertion
      flatten((arr as RecursiveArray<T>)[i], result, skipTypedArray);
    }
  }
  return result;
}
