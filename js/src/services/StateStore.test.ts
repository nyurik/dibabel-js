/* eslint-disable import/first */
import { enableFetchMocks, } from 'jest-fetch-mock';

import dataTestAll from './faux/all.json';
import dataTestDivergedQ63324398bcl from './faux/diverged-Q63324398-bcl.json';

import { StateStore } from './StateStore';
import { Items, RawData, SrvPageType } from './types';

const path = require('path');
const fs = require('fs');

enableFetchMocks();

const regenerateExpectedData = true;

test('Load faux data', async () => {
  fetchMock.mockOnce(JSON.stringify(dataTestAll));
  const store = new StateStore(false);
  expect(store.rawData).toStrictEqual(new Map<string, SrvPageType>());
  await store.loadData();

  fetchMock.mockOnce(JSON.stringify(dataTestDivergedQ63324398bcl));
  await store.loadData('Q63324398', 'bcl.wikipedia.org');

  // @ts-ignore
  const rawData = JSON.stringify(Object.assign({}, ...[...store.rawData.entries()].map(([k, v]) => ({ [k]: v }))),
    (key, value) =>
      key === 'allLocalDependencies' || key === 'allPrimaryDependencies' || key === 'copiesLookup'
        ? Array.from(value.keys()) : value,
    2);
  const expectedRawPath = path.join(__dirname, 'faux/all-expected-rawData.json');
  if (regenerateExpectedData) {
    fs.writeFileSync(expectedRawPath, rawData);
  }
  expect(JSON.parse(rawData)).toStrictEqual<RawData>(JSON.parse(fs.readFileSync(expectedRawPath)));

  const items = JSON.stringify(store.items,
    (key, value) => key === 'srvPage' ? value.primaryTitle : (key === 'srvCopy' ? value.domain : value),
    2);
  const expectedItemsPath = path.join(__dirname, 'faux/all-expected-items.json');
  if (regenerateExpectedData) {
    fs.writeFileSync(expectedItemsPath, items);
  }
  expect(JSON.parse(items)).toStrictEqual<Items>(JSON.parse(fs.readFileSync(expectedItemsPath)));

});
