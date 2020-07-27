import { Type } from '@angular/core';

export interface Convertor<T> {
  convert(src: any): T;
  convertFrom?(src: T): any;
}

export type CycleType = 'destroy' | 'afterViewInit' | 'change' | 'init';

export type TestCase = {method: string, name: string};

export const TEST_CASES: Map<Function, Array<TestCase>> = new Map<Function, Array<TestCase>>();
export const TEST_CASES_ONLY: Map<Function, Array<TestCase>> = new Map<Function, Array<TestCase>>();

export const METADATA: Map<Function, Map<string, Array<any>>> = new Map<Function, Map<string, Array<any>>>();

export type DeserializableType<T> = Type<T> | 'date' | Convertor<T>;

function __decorate(protoName: string, arg: Type<any> | string | CycleType | DeserializableType<any>) {
  return function(ctor: any, property: string) {
    if (!METADATA.get(ctor.constructor)) {
      METADATA.set(ctor.constructor, new Map<string, Array<string>>());
    }
    const m = METADATA.get(ctor.constructor);

    if (typeof(m.get(protoName)) == 'undefined') {
      m.set(protoName, []);
    }

    m.get(protoName).push({prop: property, arg: arg});
  }
}

export function NgInject(type: Type<any> | string) {
  return __decorate('__injectors__', type);
}

export function NgCycle(cycle: CycleType) {
  return __decorate('__cycles__', cycle);
}

export function deserialize<T extends Object>(type: DeserializableType<T>) {
  return __decorate('__deserializers__', type);
}

export function deserializers(ctor: Function): Array<any> {
  if (!METADATA.get(ctor)) {
    return [];
  }

  return METADATA.get(ctor).get('__deserializers__');
}

function add_to_testcases(which: Map<Function, Array<TestCase>>, ctor: any, property: string, name?: string) {
  if (typeof(which.get(ctor.constructor)) == 'undefined') {
    which.set(ctor.constructor, []);
  }
  which.get(ctor.constructor).push({name: name, method: property});
}

export function NgTest(name?: string, only: boolean = false) {
  return function(ctor: any, property: string) {
    add_to_testcases(only ? TEST_CASES_ONLY : TEST_CASES, ctor, property, name);
  }
}
