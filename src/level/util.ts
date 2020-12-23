import { LevelUp } from 'levelup';
import { EventEmitter } from 'stream';
import * as sub from 'subleveldown';
import { resolveValue } from '../common/util';
import { Value } from '../types';

export function createPromiseArrayIteratable<T = any>(array: readonly Promise<T>[]): AsyncIterable<T> {
  let index = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          if(index >= array.length)
            return { value: null, done: true };
          return { value: await array[index++], done: false };
        }
      };
    }
  };
}

export function subdb(db: LevelUp, prefix: string) {
  return sub(db, prefix, { keyEncoding: 'string', valueEncoding: 'json' });
}

export async function processStream<T = any, U = T>(stream: EventEmitter,
  ...modifiers: { type: 'test' | 'transform'; exec: (entry: Value<any>) => Value<any> }[]): Promise<{ key: any; value: U }[]> {

  const entries = await new Promise<{ key: any; value: Value<any> }[]>((resolve, reject) => {
    const data: { key: any; value: Value<any> }[] = [];
    stream.on('data', (entry: { key: any; value: any }) => {
      for(const mod of modifiers) {
        if(mod.type === 'test' && !mod.exec(entry.value))
          return;
        else if (mod.type === 'transform')
          entry.value = mod.exec(entry.value);
      }
      data.push(entry);
    })
      .on('end', () => { resolve(data); })
      .on('error', err => reject(err));
  });

  return await Promise.all(entries.map(e => resolveValue(e.value).then(v => ({ key: e.key, value: v }))));
}
