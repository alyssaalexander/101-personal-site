/**
HTML & CSS Code Editor

This is all pretty much a copy of what we do currently with the non-WPCW lesson steps.

I think we'll probably want to refactor this into a JS class or something fancier / cleaner,
but for now let's just git 'er working!
**/
(function($) {
  'use strict';

  window.scFirstLoad = true;

  $(function() {
    var update = $('#lesson-wrapper');
    if (update.length > 0) {
      var isAll = update.hasClass('htmlcssjseditor'),
        isHtmlCss = update.hasClass('htmlcsseditor'),
        isJs = update.hasClass('jseditor');
    } else {
      var isAll = $('.skill-main').hasClass('htmlcssjseditor'),
        isHtmlCss = $('.skill-main').hasClass('htmlcsseditor'),
        isJs = $('.skill-main').hasClass('jseditor');
    }

    // set up editor object so that we can iterate over them to reduce code
    var editors = {
      html: {
        object: false,
        value: false,
        textarea: jQuery('#sclmsaddon-html-code'),
        tab: jQuery('a[href="#sclmsaddon-editor-tab-html"]'),
        mode: 'text/html',
      },
      css: {
        object: false,
        value: false,
        textarea: jQuery('#sclmsaddon-css-code'),
        tab: jQuery('a[href="#sclmsaddon-editor-tab-css"]'),
        mode: 'text/css',
      },
      js: {
        object: false,
        value: false,
        textarea: jQuery('#sclmsaddon-js-code'),
        tab: jQuery('a[href="#sclmsaddon-editor-tab-js"]'),
        mode: 'text/javascript',
      },
    };

    // setup console
    if (isAll || isJs) {
      // Create the sandbox:
      window.sandbox = new Sandbox.View({
        el: $('#sandbox'),
        model: new Sandbox.Model({ iframe: true }),
        placeholder: '// type :clear and hit enter to empty the console',
      });

      // takes care of textarea resizing back down on delete of lines
      $('.input textarea').on('keydown', function(e) {
        var $this = $(this),
          rows = parseInt($this.attr('rows')),
          lines;

        // on enter and alt press add row
        if (e.which === 13) {
          if (e.altKey) {
            $this.attr('rows', rows + 1);
          } else {
            // if only enter is pressed reset the error
            $('.sclmsaddon-console-tab a').css('background-color', 'inherit');
          }
        }

        // on backspace -- THIS IS THE PROBLEM
        if (e.which === 8 && rows !== 1) {
          lines = $(this).val().split('\n');
          if (!lines[lines.length - 1]) {
            $this.attr('rows', rows - 1);
          }
        }

        var resultHeight = $('.result-tab[aria-hidden="false"]').height();
        $('.editor-tab').height(resultHeight);
      });
    }

    // initialize codemirror function and pass whether it is the focus
    function initCodeMirror(editor, isFocus = false) {
      if (editor.textarea.length > 0) {
        editor.object = CodeMirror.fromTextArea(editor.textarea[0], {
          mode: editor.mode,
          indentUnit: 4,
          indentWithTabs: true,
          lineNumbers: true,
          lineWrapping: true,
          lint: window.sclmsaddon_editor_js_consts.linting_config.on,
          gutters: [ 'CodeMirror-lint-markers' ],
          readOnly: false,
        });

        return editor.object;
      }

      return;
    }

    // function to handle repeated calls to a function and only run it when calls are done.
    function debounce(func, wait, immediate) {
      var timeout;
      return function() {
        var context = this,
          args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    }

    // updates the preview area and WPCW fields with CodeMirror HTML, CSS & JS values
    var updateFormFieldValues = debounce(function() {
      // declare our variables

      var previewFrame = $('#sclmsaddon-editor-preview-iframe')[0],
        preview,
        jqueryScript = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>',
        cacheControl =
          '<meta http-Equiv="Cache-Control" Content="no-cache" /><meta http-Equiv="Pragma" Content="no-cache" /><meta http-Equiv="Expires" Content="0" />';

      for (var key of Object.keys(editors)) {
        if (editors[key].object) {
          editors[key].value = editors[key].object.getValue();
        }
      }

      // make sure right questions are pulled depending on the editor type
      if (isAll) {
        $('.wpcw_fe_quiz_q_single_0 textarea').text(editors.html.value);
        $('.wpcw_fe_quiz_q_single_1 textarea').text(editors.css.value);
        $('.wpcw_fe_quiz_q_single_2 textarea').text(editors.js.value);
      } else if (isHtmlCss) {
        $('.wpcw_fe_quiz_q_single_0 textarea').text(editors.html.value);
        $('.wpcw_fe_quiz_q_single_1 textarea').text(editors.css.value);
      } else if (isJs) {
        $('.wpcw_fe_quiz_q_single_0 textarea').text(editors.js.value);
      }

      // prepare to write the HTML & CSS to the preview area
      if (previewFrame) {
        preview = previewFrame.contentDocument || previewFrame.contentWindow.document;
      }

      // write the HTML
      if (preview) {
        preview.open();
        preview.write(cacheControl, jqueryScript, editors.html.value);
        preview.close();
      }

      // write the CSS
      $('#sclmsaddon-editor-preview-iframe').contents().find('head').append('<style>' + editors.css.value + '</style>');

      // when function ends enable save button
      $('#js-run, .wpcw_fe_quiz_submit input[name=submit]').removeAttr('disabled');
      const submitButton = document.querySelectorAll('[data-action-lesson-submit]');
      submitButton.forEach((btn) => btn.classList.toggle('sc-submit-disabled', false));

      if (window.scFirstLoad == false) {
        const wrapper = document.querySelector('[data-lesson-state]');
        const state = wrapper.getAttribute('data-lesson-state');
        if (wrapper && (state == 'complete' || state == 'success')) {
          wrapper.setAttribute('data-lesson-state', 'update');
        }
      }
    }, 1500);

    function js_run() {
      var previewFrame = $('#sclmsaddon-editor-preview-iframe')[0],
        preview;

      if (previewFrame) {
        preview = previewFrame.contentDocument || previewFrame.contentWindow.document;
      }

      if (editors.js.object) {
        editors.js.value = '(function () { ' + editors.js.object.getValue() + ' }());';
      }

      if (editors.js.value) {
        sandbox.model.evaluate(editors.js.value);

        if ($('#sclmsaddon-editor-preview-iframe').contents().find('#the-script').length > 0) {
          $('#sclmsaddon-editor-preview-iframe').contents().find('#the-script').text(editors.js.value);
        } else {
          $('#sclmsaddon-editor-preview-iframe')
            .contents()
            .find('body')
            .append('<script type="text/javascript" id="the-script">' + editors.js.value + '</script>');
        }
      }
    }

    // refresh a tabs code
    function refreshTab(e) {
      if (editors[e.data.tab].object) {
        editors[e.data.tab].object.refresh();
        editors[e.data.tab].object.focus();
      }
    }

    // do not need to be inside of any if cases becuase it already checks if the textarea exists before running.
    if (isAll || isJs) {
      var htmleditor = initCodeMirror(editors.html, false);
      var jseditor = initCodeMirror(editors.js, true);
    } else {
      var htmleditor = initCodeMirror(editors.html, false);
      var jseditor = initCodeMirror(editors.js, true);
    }
    var csseditor = initCodeMirror(editors.css, false);

    var config = window.sclmsaddon_editor_js_consts.linting_config;

    if (config && config.on) {
      if (htmleditor) {
        htmleditor.state.lint.options = { rules: config.html };
      }

      if (csseditor) {
        csseditor.state.lint.options = config.css;
      }

      if (jseditor) {
        jseditor.state.lint.options = config.js;
      }
    }

    // tab up the code areas
    if (isAll) {
      $('#sclmsaddon-editor-tabs').tabs({ active: 2 });
    } else {
      $('#sclmsaddon-editor-tabs').tabs();
    }
    const submitButton = document.querySelectorAll('[data-action-lesson-submit]');
    $('#sclmsaddon-result-tabs').tabs({ active: 0 }); // 0 sets preview to be active tab on reload
    // code to run only if there is a html tab
    if (editors.html.textarea.length > 0) {
      editors.html.tab.click({ tab: 'html' }, refreshTab);
      editors.html.object.on('change', function() {
        // when user starts typing disable button
        $('#js-run, .wpcw_fe_quiz_submit input[name=submit]').attr('disabled', 'disabled');

        submitButton.forEach((btn) => btn.classList.toggle('sc-submit-disabled', true));

        updateFormFieldValues();

        if (isHtmlCss) {
          setTimeout(() => {
            window.scFirstLoad = false;
          }, 2000);
        }
      });
    }
    // code to run only if there is a css tab
    if (editors.css.textarea.length > 0) {
      editors.css.tab.click({ tab: 'css' }, refreshTab);
      editors.css.object.on('change', function() {
        // when user starts typing disable button
        $('#js-run, .wpcw_fe_quiz_submit input[name=submit]').attr('disabled', 'disabled');

        submitButton.forEach((btn) => btn.classList.toggle('sc-submit-disabled', true));

        updateFormFieldValues();
        if (isHtmlCss) {
          setTimeout(() => {
            window.scFirstLoad = false;
          }, 2000);
        }
      });
    }
    // code to run only if there is a js tab
    if (editors.js.textarea.length > 0) {
      editors.js.tab.click({ tab: 'js' }, refreshTab);
      editors.js.object.on('change', function() {
        // when user starts typing disable button
        $('#js-run, .wpcw_fe_quiz_submit input[name=submit]').attr('disabled', 'disabled');

        submitButton.forEach((btn) => btn.classList.toggle('sc-submit-disabled', true));

        updateFormFieldValues();
        if (isJs || isAll) {
          setTimeout(() => {
            window.scFirstLoad = false;
          }, 2000);
        }
      });

      // run js in preview and console on button click
      $('#js-run').on('click', function(e) {
        $('.sclmsaddon-console-tab-updated a').removeAttr('data-has-js-error');
        e.preventDefault;
        js_run();
        $('#js-run').attr('data-js-state', 'complete');
        setTimeout(() => {
          $('#js-run').attr('data-js-state', 'default');
        }, 2000);
      });

      // focus on JS code on tab click
      $('a[href="#sclmsaddon-result-tab-console"]').on('click', function() {
        $(this).closest('ul').addClass('console-active');
      });

      // focus on JS code on tab click
      $('a[href="#sclmsaddon-result-tab-preview"]').on('click', function() {
        $(this).closest('ul').removeClass('console-active');
      });
    }

    // if this is a code editor challenge load either the default code or user's saved code
    if (isAll) {
      // make sure CodeMirror has initialized for both tabs
      if (editors.html.object && editors.css.object && editors.js.object) {
        var data = {
          action: sclmsaddon_editor_js_consts.editor_challenge_code_value_action,
          id: $('.sclmsaddon_lesson_challenge_form').attr('id'),
          sclmsaddon_progress_nonce: sclmsaddon_editor_js_consts.sclmsaddon_progress_nonce,
        };
        $.post(sclmsaddon_editor_js_consts.ajaxurl, data, function(response, status) {
          // the response object that has messages & data in it
          var responseObj = $.parseJSON(response);

          if (responseObj.hasOwnProperty('success')) {
            if (responseObj.success.hasOwnProperty('data')) {
              // if we have HTML code, update the HTML tab with it
              if (responseObj.success.data.hasOwnProperty('html_code')) {
                if (responseObj.success.data.html_code !== null) {
                  editors.html.object.setValue(responseObj.success.data.html_code);
                }
                editors.html.object.refresh();
              }
              // if we have CSS code, update the CSS tab with it
              if (responseObj.success.data.hasOwnProperty('css_code')) {
                if (responseObj.success.data.css_code !== null) {
                  editors.css.object.setValue(responseObj.success.data.css_code);
                }
                editors.css.object.refresh();
              }
              // if we have JS code, update the JS tab with it
              if (responseObj.success.data.hasOwnProperty('js_code')) {
                if (responseObj.success.data.js_code !== null) {
                  editors.js.object.setValue(responseObj.success.data.js_code);
                }
                editors.js.object.refresh();
              }
            }
          }
        });
      }
    }

    // if this is a code editor challenge load either the default code or user's saved code
    if (isHtmlCss) {
      // make sure CodeMirror has initialized for both tabs
      if (editors.html.object && editors.css.object) {
        var data = {
          action: sclmsaddon_editor_js_consts.editor_challenge_code_value_action,
          id: $('.sclmsaddon_lesson_challenge_form').attr('id'),
          sclmsaddon_progress_nonce: sclmsaddon_editor_js_consts.sclmsaddon_progress_nonce,
        };
        $.post(sclmsaddon_editor_js_consts.ajaxurl, data, function(response, status) {
          // the response object that has messages & data in it
          var responseObj = $.parseJSON(response);

          if (responseObj.hasOwnProperty('success')) {
            if (responseObj.success.hasOwnProperty('data')) {
              // if we have HTML code, update the HTML tab with it
              if (responseObj.success.data.hasOwnProperty('html_code')) {
                if (responseObj.success.data.html_code !== null) {
                  editors.html.object.setValue(responseObj.success.data.html_code);
                }
                editors.html.object.refresh();
              }
              // if we have CSS code, update the CSS tab with it
              if (responseObj.success.data.hasOwnProperty('css_code')) {
                if (responseObj.success.data.css_code !== null) {
                  editors.css.object.setValue(responseObj.success.data.css_code);
                }
                editors.css.object.refresh();
              }
            }
          }
        });
      }
    }

    // if this is a code editor challenge load either the default code or user's saved code
    if (isJs) {
      // make sure CodeMirror has initialized for both tabs
      if (editors.js.object) {
        var data = {
          action: sclmsaddon_editor_js_consts.editor_challenge_code_value_action,
          id: $('.sclmsaddon_lesson_challenge_form').attr('id'),
          sclmsaddon_progress_nonce: sclmsaddon_editor_js_consts.sclmsaddon_progress_nonce,
        };
        $.post(sclmsaddon_editor_js_consts.ajaxurl, data, function(response, status) {
          // the response object that has messages & data in it
          var responseObj = $.parseJSON(response);

          if (responseObj.hasOwnProperty('success')) {
            if (responseObj.success.hasOwnProperty('data')) {
              // if we have JS code, update the JS tab with it
              if (responseObj.success.data.hasOwnProperty('js_code')) {
                if (responseObj.success.data.js_code !== null) {
                  editors.js.object.setValue(responseObj.success.data.js_code);
                }
                editors.js.object.refresh();
              }
            }
          }
        });
      }
    }
  });
})(jQuery);
