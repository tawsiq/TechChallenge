// Quick test to simulate the results page
// Set up some mock data for testing
sessionStorage.setItem('condition', 'headache');
sessionStorage.setItem('who', 'adult');
sessionStorage.setItem('what', 'mild pain');
sessionStorage.setItem('duration', '2');

console.log('Mock data set for testing');
console.log('Stored state:', {
    condition: sessionStorage.getItem('condition'),
    who: sessionStorage.getItem('who'),
    what: sessionStorage.getItem('what'),
    duration: sessionStorage.getItem('duration')
});
