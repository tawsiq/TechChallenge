// Chat widget helpers with safe constructor guards.
(function(){
  'use strict';

  function safeNew(Ctor, ...args) {
    return typeof Ctor === 'function' ? new Ctor(...args) : null;
  }

  // Simple widget API to avoid hard errors if deps are missing.
  const ChatWidget = {
    init(options = {}) {
      this.options = options;
      this._target = options.target || document.querySelector('[data-chat]');
      // Observers (guarded)
      this._io = safeNew(window.IntersectionObserver, (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            this._target && this._target.classList.add('in-view');
          }
        });
      }, options.intersectionOptions || {});

      this._ro = safeNew(window.ResizeObserver, () => {
        // No-op: hook for responsive tweaks
      });

      if (this._io && this._target) this._io.observe(this._target);
      if (this._ro && this._target) this._ro.observe(this._target);

      return this;
    },

    open() {
      this._target && this._target.classList.add('open');
    },
    close() {
      this._target && this._target.classList.remove('open');
    }
  };

  // Expose globally for existing callers
  window.ChatWidget = window.ChatWidget || ChatWidget;
})();

