/*!
 * jQuery QueryBuilder OGC Filter Support
 * Allows to export rules as a SQL WHERE statement as well as populating the builder from an SQL query.
 */

// DEFAULT CONFIG
// ===============================
QueryBuilder.defaults({
    /* operators for internal -> SQL conversion */
    filterOperators: {
        equal:            { op: 'ogc:PropertyIsEqualTo' },
        not_equal:        { op: 'ogc:PropertyIsNotEqualTo' },
        less:             { op: 'ogc:PropertyIsLessThan' },
        less_or_equal:    { op: 'ogc:PropertyIsLessThanOrEqualTo' },
        greater:          { op: 'ogc:PropertyIsGreaterThan' },
        greater_or_equal: { op: 'ogc:PropertyIsLessThanOrEqualTo' },
        between:          { op: 'ogc:PropertyIsBetween',      sep: 'And' },
        is_null:          { op: 'ogc:PropertyIsNull' }

    },


    /* statements for internal -> SQL conversion */
    filterStatements: {
        'question_mark': function() {
            var params = [];
            return {
                add: function(rule, value) {
                    params.push(value);
                    return '?';
                },
                run: function() {
                    return params;
                }
            };
        },

        'numbered': function(char) {
            if (!char || char.length > 1) char = '$';
            var index = 0;
            var params = [];
            return {
                add: function(rule, value) {
                    params.push(value);
                    index++;
                    return char + index;
                },
                run: function() {
                    return params;
                }
            };
        },

        'named': function(char) {
            if (!char || char.length > 1) char = ':';
            var indexes = {};
            var params = {};
            return {
                add: function(rule, value) {
                    if (!indexes[rule.field]) indexes[rule.field] = 1;
                    var key = rule.field + '_' + (indexes[rule.field]++);
                    params[key] = value;
                    return char + key;
                },
                run: function() {
                    return params;
                }
            };
        }
    }
});


// PUBLIC METHODS
// ===============================
QueryBuilder.extend({
    /**
     * Get rules as Filter query
     * @throws UndefinedFilterConditionError, UndefinedFilterOperatorError
     * @param data {object} (optional) rules
     * @return {object}
     */
    getFilter: function(data) {
        data = (data === undefined) ? this.getRules() : data;
        var nl = '\n';

        var self = this;

        var filterXML = (function parse(data) {
            var parts = [];

            if (!data.condition) {
                data.condition = self.settings.default_condition;
            }
            if (['AND', 'OR'].indexOf(data.condition.toUpperCase()) === -1) {
                Utils.error('UndefinedSQLCondition', 'Unable to build SQL query with condition "{0}"', data.condition);
            }

            if (!data.rules) {
                return '';
            }

            parts.push('<ogc:Filter>');
            if (data.condition.toUpperCase() === 'OR') {
                parts.push('<ogc:Or>');
            } else {
                parts.push('<ogc:And>');
            }


            data.rules.forEach(function(rule) {

                var filterCmd = self.settings.filterOperators[rule.operator];
                var value = '';

                if (filterCmd === undefined) {
                    Utils.error('UndefinedFilterOperator', 'Unknown Filter operation for operator "{0}"', rule.operator);
                }

/*                rule.value.forEach(function(v, i) {
                    if (i > 0) {
                        value += sql.sep;
                    }

                    if (rule.type == 'integer' || rule.type == 'double' || rule.type == 'boolean') {
                        v = Utils.changeType(v, rule.type, true);
                    }
                    else if (!stmt) {
                        v = Utils.escapeString(v);
                    }

                    else {
                        if (typeof v == 'string') {
                            v = '\'' + v + '\'';
                        }

                        value += v;
                    }
                });*/

                parts.push('<' + filterCmd.op + '>' + nl);
                parts.push('<ogc:PropertyName>' + rule.field + '</ogc:PropertyName>' + nl);
                parts.push('<ogc:Literal>' + rule.value + '</ogc:Literal>' + nl);
                parts.push('</' + filterCmd.op + '>' + nl);

            });

            if (data.condition.toUpperCase() === 'OR') {
                parts.push('</ogc:Or>');
            } else {
                parts.push('</ogc:And>');
            }
            parts.push('</ogc:Filter>')

            return parts.join(' ');
        }(data));

        return {
            filter: filterXML
        };
    }
});

function getStmtConfig(stmt) {
    var config = stmt.match(/(question_mark|numbered|named)(?:\((.)\))?/);
    if (!config) config = [null, 'question_mark', undefined];
    return config;
}
