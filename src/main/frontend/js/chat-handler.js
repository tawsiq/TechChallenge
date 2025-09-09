// Handle transition from chat to results
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the chat module
    const chatModule = {
        init() {
            this.setupEventListeners();
            this.checkStateManager();
        },

        checkStateManager() {
            if (!window.StateManager) {
                console.error('StateManager not loaded');
                this.showError('Required components not loaded');
                return false;
            }
            return true;
        },

        setupEventListeners() {
            // Listen for form submission
            const form = document.getElementById('composer');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleSubmit(e);
                });
            }

            // Listen for restart button
            const restartBtn = document.getElementById('restart');
            if (restartBtn) {
                restartBtn.addEventListener('click', () => {
                    if (window.StateManager) {
                        StateManager.clearState();
                    }
                    window.location.reload();
                });
            }
        },

        handleSubmit(e) {
            const input = document.getElementById('input');
            if (!input) return;

            const text = input.value.trim();
            if (!text) return;

            // Save the input to state
            if (window.StateManager) {
                const currentState = StateManager.getStoredState();
                currentState.what = currentState.what ? `${currentState.what} ${text}` : text;
                StateManager.saveCheckState(currentState);
            }

            // Clear input
            input.value = '';
        },

        showError(message) {
            const container = document.querySelector('.chat');
            if (container) {
                container.innerHTML = `
                    <div class="error-message p-4 bg-red-50 text-red-700 rounded">
                        <h2 class="font-bold mb-2">Error</h2>
                        <p>${message}</p>
                        <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
                            Try Again
                        </button>
                    </div>
                `;
            }
        },

        transitionToResults() {
            // Validate state before transitioning
            if (!window.StateManager || !StateManager.validateState()) {
                this.showError('Required information is missing. Please complete the symptom check.');
                return;
            }

            // Transition to results page
            window.location.href = 'results.html';
        }
    };

    // Initialize the chat module
    chatModule.init();
});
