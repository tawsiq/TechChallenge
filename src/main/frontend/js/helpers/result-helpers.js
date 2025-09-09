// Helper functions for results display

function generateDetailedInformation(results) {
    return `
        <div class="bg-white p-4 rounded-md shadow-sm">
            <h3 class="font-semibold text-purple-800 mb-3">Important Information</h3>
            <div class="space-y-4">
                <!-- Timing Information -->
                <div class="border-l-4 border-purple-200 pl-4">
                    <h4 class="font-medium text-purple-900 mb-2">Timing Guidelines</h4>
                    <ul class="space-y-2 text-gray-700">
                        ${results.timing ? results.timing.map(time => `
                            <li class="flex items-start">
                                <svg class="w-5 h-5 text-purple-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/>
                                </svg>
                                <span>${time}</span>
                            </li>
                        `).join('') : `
                            <li>• Space doses evenly throughout the day</li>
                            <li>• Best taken with or after food</li>
                            <li>• Allow sufficient time between doses</li>
                        `}
                    </ul>
                </div>

                <!-- Special Instructions -->
                <div class="border-l-4 border-amber-200 pl-4">
                    <h4 class="font-medium text-amber-900 mb-2">Special Instructions</h4>
                    <ul class="space-y-2 text-gray-700">
                        ${results.special ? results.special.map(inst => `
                            <li class="flex items-start">
                                <svg class="w-5 h-5 text-amber-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/>
                                </svg>
                                <span>${inst}</span>
                            </li>
                        `).join('') : `
                            <li>• Store in a cool, dry place</li>
                            <li>• Keep out of reach of children</li>
                            <li>• Check expiration date before use</li>
                            <li>• Do not share with others</li>
                        `}
                    </ul>
                </div>

                <!-- Warnings -->
                <div class="border-l-4 border-red-200 pl-4">
                    <h4 class="font-medium text-red-900 mb-2">Important Warnings</h4>
                    <div class="space-y-2">
                        ${results.warnings ? results.warnings.map(warning => `
                            <div class="flex items-start ${warning.critical ? 'bg-red-50 p-2 rounded' : ''}">
                                <svg class="w-5 h-5 ${warning.critical ? 'text-red-600' : 'text-red-500'} mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
                                </svg>
                                <span class="${warning.critical ? 'text-red-700 font-medium' : 'text-gray-700'}">${warning.text || warning}</span>
                            </div>
                        `).join('') : `
                            <div class="flex items-start">
                                <svg class="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
                                </svg>
                                <span class="text-gray-700">Consult a healthcare professional before use if you have any concerns</span>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateExplanationPoints(advice) {
    const points = [];
    
    // Add effectiveness points
    if (advice.effectiveness) {
        points.push(`<li class="mb-2">✓ ${advice.effectiveness}</li>`);
    }

    // Add suitability points
    if (advice.suitability) {
        points.push(`<li class="mb-2">✓ ${advice.suitability}</li>`);
    }

    // Add safety points
    if (advice.safety) {
        points.push(`<li class="mb-2">🛡️ ${advice.safety}</li>`);
    }

    // Add any contraindications or warnings
    if (advice.warnings) {
        advice.warnings.forEach(warning => {
            points.push(`<li class="mb-2">⚠️ ${warning}</li>`);
        });
    }

    return points.length ? `<ul class="list-none pl-0">${points.join('')}</ul>` : '';
}
