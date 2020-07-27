require('./ts/tests/babel-support');
global['Document'] = process;
global['window'] = global;
global['window'].addEventListener = () => {};
global['document'] = process;
global['document']['head'] = {};
global['document']['addEventListener'] = () => {};
global['fetch'] = require('node-fetch');

global['KeyboardEvent'] = null;

global['btoa'] = (s) => s;

window['isNode'] = true;

require('./ts/tests/mocks').initMocks();

require('zone.js/dist/zone-node');
require('reflect-metadata');
const testing_1 = require("@angular/core/testing");
const testing_2  = require("@angular/platform-browser-dynamic/testing");

var fs = require('fs');
var jasmine = require('jasmine/lib/jasmine');
// var jasmine = global['jasmine'];
var j = new jasmine({});
testing_1.getTestBed().initTestEnvironment(testing_2.BrowserDynamicTestingModule, testing_2.platformBrowserDynamicTesting());

const loadFolder = function(path) {
  const files = fs.readdirSync(path);
  files
    .filter(f => f.match(/\.spec\.js$/g))
    .forEach(f => require(`${path}/${f.replace(/\.js$/g, '')}`));

  files
    .filter(f => fs.statSync(`${path}/${f}`).isDirectory())
    .forEach(f => loadFolder(`${path}/${f}`));
};
loadFolder('.');
const TEST_CASES = require('./ts/decorators').TEST_CASES;
const TEST_CASES_ONLY = require('./ts/decorators').TEST_CASES_ONLY;
let tests = TEST_CASES;
if (Array.from(TEST_CASES_ONLY.keys()).length > 0) {
  tests = TEST_CASES_ONLY;
}
Array.from(tests.keys()).forEach(k => {
  describe(`Testing ${k.name}`, () => {
    const instance = new (k)();
    beforeAll(() => instance['__init__']());
    tests.get(k).forEach(test => {
      it(`Running test case ${test.name || test.method}`, instance[test.method].bind(instance));
    });
  });
});

j.execute();
