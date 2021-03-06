let v = require('./boss.validators');
let m = require('./languages/default');
let f = require('./boss.filters');
let formSerialize = require('form-serialize');

let Boss = {
  // Private attr
  _errorClassInput: 'boss--is-wrong',
  _errorClassSpan: 'boss--error',

  // Public attrs
  errors: [],
  options: {
    appendErrors: true,
    errorElement: 'label'
  },
  validators: v,
  messages: m,

  // Public Methods
  configure: function(newOptions) {
    this.options = Object.assign({}, this.options, newOptions);
  },

  configureMessages: function (messages) {
    try {
      if (this._typeof(messages) !== 'object') {
        throw new Error('configureMessages: Please, your messages needs to be an object of keys and values (string).');
      }

      this.messages = Object.assign({}, this.messages, messages);
    }
    catch (err) {
      console.error(err.getMessage());
    }
  },

  loadLanguage: function (language) {
    return this.configureMessages(language);
  },

  addValidator: function (v) {
    this.validators[v.name] = v.validator.bind(this);
    this.messages[v.name] = v.message || false;
  },

  validate: function (data, validations, filters) {
    let self = this;
    let vals = Object.keys(validations);

    self.data = data;
    self.errors = [];

    for (let i = 0, t = vals.length; i < t; i++) {
      let name = vals[i];
      let el = data[name];

      if (el) {
        let rules = validations[name];
        let rulesKeys = Object.keys(rules);

        for (let j = 0, tt = rulesKeys.length; j < tt; j++) {
          let r = rulesKeys[j];

          if ((rules.hasOwnProperty('required')) || el.value.length) {
            let validate = self.validators[r];
            let rule = rules[r];
            let message = self.messages[r];
            let messageValue;

            if (self._typeof(rule) === 'object') {
              message = rule.message;
              rule = rule.value;
            }

            if (r == 'between') {
              let transformation = '';

              for(let i = 0, t = rule.length; i < t ; ++i) {
                transformation += rule[i].join(m.prepositions.and);
                if (i != t - 1) {
                  transformation += m.prepositions.or;
                }
              }

              messageValue = transformation;
            }

            if (!validate.call(self, el, rule, rules)) {
              self.errors.push({
                el,
                rule: r,
                value: rule,
                message: self._supplant(message || self.messages['default'], {
                  val: messageValue || rule.toString()
                })
              });
            }
          }
        } // end for
      } // end if
    } // end for

    if (self._typeof(data) === 'htmlformelement' && self.options.appendErrors) self._appendErrors();

    if (self.errors.length) return Promise.reject(self.errors);

    if (self._typeof(filters) === 'object') return Promise.resolve({ transformed: self._filter(data, filters), source: data });

    return Promise.resolve({ source: data });
  },

  setErrorClass: function (className) {
    this._errorClassSpan = `${className} boss--error`;
  },

  transform: function (data, filters) {
    return this._filter(data, filters);
  },

  _filter: function (data, filters) {
    let dataType = this._typeof(data);
    let filterType = this._typeof(filters);
    let filterKeys = Object.keys(filters);
    let filteredData = {};

    if (!(dataType === 'htmlformelement' || dataType === 'object')) {
      throw new Error('filter: Only HTML form element or object are allowed.');
    }

    if (filterType !== 'object') {
      throw new Error('filter: The filter param must be an object.');
    }

    if (dataType === 'htmlformelement') {
      data = formSerialize(data, { hash: true, empty: true });
    }

    for (let i = 0, t = filterKeys.length; i < t; i++) {
      let name = filterKeys[i];
      let field = data[name];

      if (name in data) {
        let fieldFilters = filters[name];

        fieldFilters.forEach(v => {
          if (f[v]) field = f[v](field);
        });

        filteredData[name] = field;
      }
    }

    return Object.assign({}, data, filteredData);
  },

  // Private Methods
  _clearErrors: function () {
    let errorLabelElements = document.querySelectorAll('.boss--error');
    let errorInputElements = document.querySelectorAll('.boss--is-wrong');

    if (errorInputElements) {
      [].forEach.call(errorInputElements, el => {
        el.classList.remove(this._errorClassInput.split(' '));
      });
    }

    if (errorLabelElements) {
      [].forEach.call(errorLabelElements, el => {
        this._removeNode(el);
      });
    }
  },

  _appendErrors: function () {
    let errors = this.errors;

    this._clearErrors();

    for (let i = 0, t = errors.length; i < t; ++i) {
      this._appendError(errors[i]);
    }
  },

  _insertAfter: function (newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  },
  _removeNode: function (el) {
    el.parentElement.removeChild(el);
  },
  _appendError: function (err) {
    let label = document.createElement(this.options.errorElement || 'label');

    label.innerHTML = this._supplant(err.message, {
      val: err.value.toString()
    });

    label.htmlFor = err.el.id || null;

    label.className = `${this._errorClassSpan} boss--error-${err.rule}`;

    err.el.classList.add(this._errorClassInput);

    this._insertAfter(label, err.el);
  },
  _supplant: function(str, o) {
    return str.replace(/{([^{}]*)}/g,function(a, b) {
      var r = o[b];
      return typeof r === 'string' || typeof r === 'number' ? r : a;
    });
  },
  _typeof: function (value) {
    return Object.prototype.toString
            .call(value)
            .replace(/(\[|\])/g, '')
            .split(' ')[1]
            .toLowerCase();
  }
};

module.exports = Boss;
