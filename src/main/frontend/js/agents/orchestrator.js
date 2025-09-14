// Inert orchestrator stub (assistant removed).
(function(){
  if (window.AI && window.AI.__orchestratorStub) return;
  window.AI = window.AI || { Agents: {} };
  window.AI.Orchestrator = function(){ return { handle: () => '' }; };
  window.AI.Agents.BNFAgent = function(){};
  window.AI.__orchestratorStub = true;
})();

