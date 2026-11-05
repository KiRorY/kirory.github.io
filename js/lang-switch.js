// Language is determined by the URL. The switch is a regular HTML link.
// Pandoc renders English TeX delimiters; typeset them only when needed.
(function () {
  if (document.documentElement.lang !== 'en') return;
  var content = document.querySelector('.kira-post-content');
  if (!content || !content.querySelector('.math, script[type^="math/tex"]')) return;

  function typeset() {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([content]).catch(function (error) {
        console.warn('Math rendering failed', error);
      });
    }
  }

  if (window.MathJax && window.MathJax.typesetPromise) {
    typeset();
    return;
  }
  var existing = document.querySelector('script[src*="mathjax"]');
  if (existing) {
    existing.addEventListener('load', typeset);
    return;
  }
  window.MathJax = {
    tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
    startup: { typeset: false }
  };
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
  script.async = true;
  script.onload = typeset;
  document.head.appendChild(script);
})();
