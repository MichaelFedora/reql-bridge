"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SQLite3DatumPartial {
    constructor() {
        this.query = [];
    }
    // TRANSFORMATION
    map(predicate) {
        this.query.push({ cmd: 'map', params: [predicate] });
        return this;
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
    // STRING
    startsWith(str) {
        this.query.push({ cmd: 'startsWith', params: [str] });
        return this;
    }
    endsWith(str) {
        this.query.push({ cmd: 'endsWith', params: [str] });
        return this;
    }
    includes(str) {
        this.query.push({ cmd: 'includes', params: [str] });
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
}
exports.SQLite3DatumPartial = SQLite3DatumPartial;
//# sourceMappingURL=datum.js.map