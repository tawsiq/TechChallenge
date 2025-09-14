// CommonJS runner for the browser NLU module (uses require).
global.window = {};
global.window.Engine = {
  getConditionMeta: function(cond){
    const map = {
      headache: {
        options: [{class_name:'Paracetamol', example_products:['Panadol','Calpol'], members_examples:['paracetamol']}]
      },
      hayfever: {
        options: [{class_name:'Loratadine', example_products:['Claritin'], members_examples:['loratadine','antihistamine']}]
      },
      indigestion: {
        options: [{class_name:'Omeprazole', example_products:['Losec'], members_examples:['omeprazole','antacid']}]
      },
      diarrhoea: {
        options: [{class_name:'Loperamide', example_products:['Imodium'], members_examples:['loperamide']}]
      },
      sorethroat: {
        options: [{class_name:'Ibuprofen', example_products:['Nurofen'], members_examples:['ibuprofen']}]
      }
    };
    return map[cond] || null;
  }
};

// load the NLU module (it attaches window.NLU)
require('./nlu.js');

const tests = [
  "I've been vomiting blood since this morning",
  "Took two paracetamol yesterday and still in pain",
  "My 3yo has had a fever for 2 days",
  "I've had a headache on and off for a week",
  "I'm breathless and dizzy",
  "No vomiting blood, just nausea",
  "Been taking iboprofen (misspelt) and not helped",
  "I've had heartburn and acid reflux for a couple of days",
  "Pregnant and have a sore throat",
  "I am breastfeeding and have hay fever"
];

console.log('NLU smoke tests:\n');
for(const t of tests){
  try{
    const res = window.NLU.analyze(t, {});
    console.log('INPUT:', t);
    console.log('OUTPUT:', JSON.stringify(res, null, 2));
    console.log('---');
  }catch(err){
    console.error('Error analyzing:', t, err);
  }
}

console.log('\nSmoke test completed.');
