"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractDatumPartial = void 0;
class AbstractDatumPartial {
    constructor() {
        this.query = [];
    }
    // LOGIC
    eq(...values) {
        this.query.push({ cmd: 'eq', params: values });
        return this;
    }
    ne(...values) {
        this.query.push({ cmd: 'ne', params: values });
        return this;
    }
    // BOOLEAN
    or(...bool) {
        this.query.push({ cmd: 'or', params: bool });
        return this;
    }
    and(...bool) {
        this.query.push({ cmd: 'and', params: bool });
        return this;
    }
    not() {
        this.query.push({ cmd: 'not' });
        return this;
    }
    do(func) {
        this.query.push({ cmd: 'do', params: [func] });
        return this;
    }
    branch(trueAction, ...testsActionsAndFalseAction) {
        if (testsActionsAndFalseAction.length % 2 < 1)
            throw new Error('Must have an action for every test, and a false action at the end!');
        this.query.push({ cmd: 'branch', params: [trueAction, ...testsActionsAndFalseAction] });
        return this;
    }
    // STRING
    startsWith(str) {
        this.query.push({ cmd: 'startsWith', params: [str] });
        return this;
    }
    endsWith(str) {
        this.query.push({ cmd: 'endsWith', params: [str] });
        return this;
    }
    substr(str) {
        this.query.push({ cmd: 'substr', params: [str] });
        return this;
    }
    len() {
        this.query.push({ cmd: 'length' });
        return this;
    }
    // NUMBER
    add(...values) {
        this.query.push({ cmd: 'add', params: values });
        return this;
    }
    sub(...values) {
        this.query.push({ cmd: 'sub', params: values });
        return this;
    }
    mul(...values) {
        this.query.push({ cmd: 'mul', params: values });
        return this;
    }
    div(...values) {
        this.query.push({ cmd: 'div', params: values });
        return this;
    }
    mod(...values) {
        this.query.push({ cmd: 'mod', params: values });
        return this;
    }
    gt(...values) {
        this.query.push({ cmd: 'gt', params: values });
        return this;
    }
    lt(...values) {
        this.query.push({ cmd: 'lt', params: values });
        return this;
    }
    ge(...values) {
        this.query.push({ cmd: 'ge', params: values });
        return this;
    }
    le(...values) {
        this.query.push({ cmd: 'le', params: values });
        return this;
    }
    // ARRAY
    count() {
        this.query.push({ cmd: 'count' });
        return this;
    }
    difference(value) {
        this.query.push({ cmd: 'difference', params: [value] });
        return this;
    }
    contains(value) {
        this.query.push({ cmd: 'contains', params: [value] });
        return this;
    }
    filter(predicate) {
        this.query.push({ cmd: 'filter', params: [predicate] });
        return this;
    }
    limit(n) {
        this.query.push({ cmd: 'limit', params: [n] });
        return this;
    }
    pluck(...fields) {
        this.query.push({ cmd: 'pluck', params: fields });
        return this;
    }
    map(predicate) {
        this.query.push({ cmd: 'map', params: [predicate] });
        return this;
    }
}
exports.AbstractDatumPartial = AbstractDatumPartial;
//# sourceMappingURL=datum.js.map