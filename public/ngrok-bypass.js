// Добавляем заголовок для обхода ngrok предупреждения во все запросы
(function() {
  // Проверяем, что мы на ngrok домене
  if (window.location.hostname.includes('ngrok')) {
    // Перехватываем все fetch запросы
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      options.headers = options.headers || {};
      if (typeof options.headers === 'object' && options.headers.constructor === Object) {
        options.headers['ngrok-skip-browser-warning'] = 'true';
      } else if (options.headers instanceof Headers) {
        options.headers.set('ngrok-skip-browser-warning', 'true');
      }
      return originalFetch.call(this, url, options);
    };
    
    // Перехватываем XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
      const result = originalOpen.apply(this, arguments);
      this.setRequestHeader('ngrok-skip-browser-warning', 'true');
      return result;
    };
    
    console.log('🔄 ngrok bypass headers enabled');
  }
})();