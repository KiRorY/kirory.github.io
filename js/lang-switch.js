(function () {
  var STORAGE_KEY = 'kira-lang';

  function detectLang() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    var nav = navigator.language || navigator.userLanguage || 'zh-CN';
    return nav.startsWith('zh') ? 'zh-CN' : 'en';
  }

  var _mathjaxLoaded = false;
  var _enMathRendered = false;

  function hasMathInEn() {
    return !!document.querySelector('.hexo-llm-en .math, .hexo-llm-en script[type^="math/tex"]');
  }

  function renderMathInEn() {
    if (_enMathRendered) return;
    if (!hasMathInEn()) {
      _enMathRendered = true;
      return;
    }
    if (document.querySelector('.hexo-llm-en .mjx-container, .hexo-llm-en .MathJax')) {
      _enMathRendered = true;
      return;
    }
    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
      var enDivs = document.querySelectorAll('.hexo-llm-en');
      if (enDivs.length) {
        MathJax.typesetPromise(Array.from(enDivs)).then(function () {
          _enMathRendered = true;
        }).catch(function () {
          _enMathRendered = true;
        });
      }
    }
  }

  function loadMathjaxCDN() {
    if (_enMathRendered) return;
    if (!hasMathInEn()) {
      _enMathRendered = true;
      return;
    }

    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
      renderMathInEn();
      return;
    }

    if (document.querySelector('script[src*="mathjax"]')) {
      _mathjaxLoaded = true;
      return;
    }

    if (_mathjaxLoaded) { renderMathInEn(); return; }

    _mathjaxLoaded = true;
    window.MathJax = {
      tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
      startup: { typeset: false }
    };
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    s.async = true;
    s.onload = function () { renderMathInEn(); };
    document.head.appendChild(s);
  }

  function applyLang(lang) {
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem(STORAGE_KEY, lang);

    var icon = document.getElementById('lang-icon');
    if (icon) {
      icon.textContent = lang.startsWith('zh') ? 'EN' : '中';
    }

    var switchBtn = document.querySelector('.kira-lang-switch');
    if (switchBtn) {
      var label = lang.startsWith('zh') ? 'Switch to English' : '切换到中文';
      switchBtn.setAttribute('title', label);
      switchBtn.setAttribute('aria-label', label);
    }

    applyI18nMap(lang);
    applyTitleSwitch(lang);

    if (!lang.startsWith('zh')) {
      loadMathjaxCDN();
    }
  }

  function refreshLangDependentContent() {
    var lang = document.documentElement.getAttribute('lang') || detectLang();
    applyI18nMap(lang);
    applyTitleSwitch(lang);
  }

  function syncAfterInjectedData() {
    var tries = 0;

    function run() {
      var hasTitlePairs = !!(window._hexo_title_pairs && window._hexo_title_pairs.length);
      var hasI18nMap = !!window._i18n_map;

      if (hasTitlePairs || hasI18nMap) {
        refreshLangDependentContent();
        return;
      }

      if (tries < 20) {
        tries += 1;
        setTimeout(run, 120);
      }
    }

    run();
  }

  function applyTitleSwitch(lang) {
    var isEn = !lang.startsWith('zh');

    var pageTitleEls = document.querySelectorAll('[data-zh-title][data-en-title]');
    for (var t = 0; t < pageTitleEls.length; t++) {
      var titleEl = pageTitleEls[t];
      var zhTitle = titleEl.getAttribute('data-zh-title');
      var enTitle = titleEl.getAttribute('data-en-title');
      if (!zhTitle || !enTitle) continue;
      titleEl.textContent = isEn ? enTitle : zhTitle;
    }

    // Handle pages with explicit title_en (e.g. about page)
    if (window._page_title_en) {
      var coverH1 = document.querySelector('.kira-post-cover h1');
      if (coverH1) {
        if (!coverH1._origTitle) coverH1._origTitle = coverH1.textContent;
        coverH1.textContent = isEn ? window._page_title_en : coverH1._origTitle;
      }

      // Keep browser tab title consistent with current language.
      if (!window._orig_doc_title) {
        window._orig_doc_title = document.title;
      }
      if (isEn) {
        var parts = window._orig_doc_title.split(' - ');
        if (parts.length > 1) {
          document.title = window._page_title_en + ' - ' + parts.slice(1).join(' - ');
        } else {
          document.title = window._page_title_en;
        }
      } else {
        document.title = window._orig_doc_title;
      }
    }

    var pairs = window._hexo_title_pairs;
    if (!pairs || !pairs.length) return;

    // Build lookup maps
    var zhToEn = {};
    var enToZh = {};
    for (var i = 0; i < pairs.length; i++) {
      var zh = (pairs[i].zh || '').trim();
      var en = (pairs[i].en || '').trim();
      if (!zh || !en) continue;
      zhToEn[zh] = en;
      enToZh[en] = zh;
    }

    // Replace post titles (h1 in cover, card titles on index, nav links, archives)
    var titleEls = document.querySelectorAll('.kira-post-cover h1, .post-nav a, h1[data-lang-title], .kira-archives article li a, .archive-list-item a');
    for (var j = 0; j < titleEls.length; j++) {
      var el = titleEls[j];
      var text = el.textContent.trim();
      if (isEn && zhToEn[text]) {
        el.textContent = zhToEn[text].trim();
      } else if (!isEn && enToZh[text]) {
        el.textContent = enToZh[text].trim();
      }
    }

    // Replace document title
    var docTitle = document.title;
    if (isEn) {
      for (var zh in zhToEn) {
        if (docTitle.indexOf(zh) !== -1) {
          document.title = docTitle.replace(zh, zhToEn[zh]);
          break;
        }
      }
    } else {
      for (var en in enToZh) {
        if (docTitle.indexOf(en) !== -1) {
          document.title = docTitle.replace(en, enToZh[en]);
          break;
        }
      }
    }
  }

  function buildReverseMap(map) {
    var rev = {};
    for (var k in map) {
      if (map.hasOwnProperty(k) && map[k]) {
        rev[map[k]] = k;
      }
    }
    return rev;
  }

  function applyI18nMap(lang) {
    var map = window._i18n_map;
    if (!map) return;
    var isEn = !lang.startsWith('zh');

    if (!window._i18n_reverse_map) {
      window._i18n_reverse_map = buildReverseMap(map);
    }
    var reverseMap = window._i18n_reverse_map;

    var els = document.querySelectorAll('[data-i18n-key]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-i18n-key');
      var icon = el.querySelector('i');
      if (isEn && map[key]) {
        if (icon) {
          el.innerHTML = '';
          el.appendChild(icon);
          el.appendChild(document.createTextNode(' ' + map[key]));
        } else {
          el.textContent = map[key];
        }
      } else {
        if (icon) {
          el.innerHTML = '';
          el.appendChild(icon);
          el.appendChild(document.createTextNode(' ' + key));
        } else {
          el.textContent = key;
        }
      }
    }

    applyTagCloud(map, isEn);
  }

  function applyTagCloud(map, isEn) {
    var containers = document.querySelectorAll('.tagcloud a, .kira-archives .tagcloud a');
    for (var i = 0; i < containers.length; i++) {
      var a = containers[i];
      var key = a.getAttribute('data-i18n-key');
      if (!key) {
        var firstTextNode = null;
        for (var j = 0; j < a.childNodes.length; j++) {
          if (a.childNodes[j].nodeType === 3 && a.childNodes[j].nodeValue.trim()) {
            firstTextNode = a.childNodes[j];
            break;
          }
        }

        if (firstTextNode) {
          key = firstTextNode.nodeValue.trim();
        } else {
          key = a.textContent.trim();
        }

        a.setAttribute('data-i18n-key', key);
      }

      var targetText = (isEn && map[key]) ? map[key] : key;
      var countEl = a.querySelector('.tag-list-count');
      if (countEl) {
        var nameNode = null;
        for (var k = 0; k < a.childNodes.length; k++) {
          if (a.childNodes[k].nodeType === 3) {
            nameNode = a.childNodes[k];
            break;
          }
        }
        if (!nameNode) {
          nameNode = document.createTextNode('');
          a.insertBefore(nameNode, countEl);
        }
        nameNode.nodeValue = targetText + ' ';
      } else {
        a.textContent = targetText;
      }
    }
  }

  window.toggleLang = function () {
    var current = document.documentElement.getAttribute('lang') || 'zh-CN';
    var next = current.startsWith('zh') ? 'en' : 'zh-CN';
    applyLang(next);
  };

  var lang = detectLang();
  applyLang(lang);
  syncAfterInjectedData();

  document.addEventListener('DOMContentLoaded', syncAfterInjectedData);
  window.addEventListener('load', syncAfterInjectedData);
})();
