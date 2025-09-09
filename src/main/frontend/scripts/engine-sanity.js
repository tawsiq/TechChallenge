const fs = require('fs');
const vm = require('vm');

// minimal browser-like globals
global.window = global;
global.fetch = (path)=> Promise.resolve({
  json: () => Promise.resolve(JSON.parse(fs.readFileSync(`src/main/frontend/${path}`, 'utf8')))
});

// load engine script
theCode = fs.readFileSync('src/main/frontend/js/engine.js', 'utf8');
vm.runInThisContext(theCode);

// run sample evaluations after microtask flush
setTimeout(()=>{
  console.log('Adult headache sample:', Engine.evaluate({condition:'headache', who:'adult'}));
  console.log('Pregnant hay fever sample:', Engine.evaluate({condition:'hayfever', who:'pregnant'}));
},0);