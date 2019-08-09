"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const sqlite3_wrapper_1 = require("./sqlite3-wrapper");
// =========================
// ===== UTIL FUNCTIONS ====
// =========================
function createQuery(run) {
    return { run };
}
async function resolveHValue(value) {
    if (typeof value['run'] === 'function')
        return await value.run();
    return value;
}
function _dptpRecurse(doc, obj) {
    let statement;
    for (const k in obj)
        if (obj[k] != null) {
            if (typeof obj[k] === 'object')
                statement = statement ? statement.and(_dptpRecurse(doc(k), obj[k])) : _dptpRecurse(doc(k), obj[k]);
            else
                statement = statement ? statement.and(doc(k).eq(obj[k])) : doc(k).eq(obj[k]);
        }
    return statement;
}
function deepPartialToPredicate(obj) {
    return (doc) => _dptpRecurse(doc, obj);
}
function safen(value) {
    switch (typeof (value)) {
        case 'number':
            return value;
        case 'string':
        case 'object':
        default:
            let str = JSON.stringify(value).replace(/'/g, `''`).replace(/\\"/g, '"').replace(/^"|"$/g, `'`);
            if (str[0] !== `'`)
                str = `'` + str;
            if (str[str.length - 1] !== `'`)
                str += `'`;
            return str;
    }
}
function coerceCorrectReturn(obj, types) {
    const boop = {}; // make boop[key] null or skip?
    for (const key in obj)
        if (obj[key] == null) {
            boop[key] = null;
        }
        else {
            const entry = types.find(a => a.name === key);
            switch (entry && entry.type) {
                case 'string':
                    boop[key] = obj[key];
                    break;
                case 'number':
                    boop[key] = Number(obj[key]);
                    break;
                case 'bool':
                    boop[key] = Boolean(obj[key]);
                    break;
                case 'object':
                    boop[key] = JSON.parse(obj[key]);
                    break;
                default:
                    throw new Error('Unknown type for key "' + key + '"!');
            }
        }
    return boop;
}
function makeSelector(datum) {
    const sqliteDatum = function (attribute) {
        return makeSelector(datum._sel(attribute));
    };
    sqliteDatum.__proto__ = datum;
    return sqliteDatum;
}
// =========================
// ===== ABSTRACT DATUM ====
// =========================
class SQLite3DatumPartial {
    constructor() {
        this.query = [];
    }
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
// =========================
// ====== QUERY DATUM ======
// =========================
class SQLite3QueryDatumPartial extends SQLite3DatumPartial {
    constructor() { super(); }
    _sel(attribute) {
        const child = new SQLite3QueryDatumPartial();
        child.query = this.query.slice();
        child.query.push({ cmd: 'sel', params: [attribute] });
        return child;
    }
    async run() {
        if (this.query.length)
            this.query = [];
        return null;
    }
    async compile() {
        let query = '';
        let sel = '';
        let sel2 = '';
        for (const q of this.query) {
            const params = q.params && q.params.slice();
            if (params) { // reduce parameters
                for (let i = 0; i < q.params.length; i++) {
                    if (params[i].compile)
                        params[i] = safen(await params[i].compile());
                    else
                        params[i] = safen(await resolveHValue(params[i]));
                }
            }
            switch (q.cmd) {
                case 'sel':
                    if (sel2)
                        throw new Error('Cannot filter via sub-objects in SQLite3!');
                    else if (sel)
                        sel2 = params[0].slice(1, -1); // get rid of the double quotes
                    else
                        sel = params[0].slice(1, -1);
                    break;
                case 'not':
                    if (query)
                        query = 'NOT (' + query + ')';
                    else
                        query += 'NOT ';
                    break;
                case 'eq':
                    if (!sel)
                        throw new Error('Cannot start a filter with "eq"!');
                    if (query)
                        query += ` AND `;
                    if (sel2)
                        query += `${sel} LIKE '%"${sel2}":${params[0].replace(/^'|'$/g, '"')}%'`;
                    else
                        query += `${sel} = ${params[0]}`;
                    sel = sel2 = '';
                    break;
                case 'ne':
                    if (!sel)
                        throw new Error('Cannot start a filter with "ne"!');
                    if (query)
                        query += ` AND `;
                    if (sel2)
                        query += `${sel} NOT LIKE '%"${sel2}":${params[0]}%`;
                    else
                        query += `${sel} != ${params[0]}`;
                    sel = sel2 = '';
                    break;
                case 'startsWith':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    sel = `(${sel} LIKE ${'"%' + params[0].slice(1)})`;
                    break;
                case 'endsWith':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    sel = `(${sel} LIKE ${params[0].slice(0, -1) + '%"'})`;
                    break;
                case 'includes':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    sel = `(${sel} LIKE ${'"%' + params[0].slice(1, -1) + '%"'})`;
                    break;
                case 'length':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    sel = `LENGTH(${sel})`;
                    break;
                case 'or':
                    if (!query)
                        throw new Error('Cannot start a filter with "or"!');
                    else
                        query += ' OR (' + params[0] + ')';
                    break;
                case 'and':
                    if (!query)
                        throw new Error('Cannot start a filter with "and"!');
                    else
                        query += ' AND (' + params[0] + ')';
                    break;
                case 'add':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} + ${params[0]})`;
                    else
                        throw new Error('Cannot use "add" without something selected!');
                    break;
                case 'sub':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} - ${params[0]})`;
                    else
                        throw new Error('Cannot use "sub" without something selected!');
                    break;
                case 'mul':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} * ${params[0]})`;
                    else
                        throw new Error('Cannot use "mul" without something selected!');
                    break;
                case 'div':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} / ${params[0]})`;
                    else
                        throw new Error('Cannot use "div" without something selected!');
                    break;
                case 'div':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} % ${params[0]})`;
                    else
                        throw new Error('Cannot use "mod" without something selected!');
                    break;
                case 'gt':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} > ${params[0]})`;
                    else
                        throw new Error('Cannot use "gt" without something selected!');
                    break;
                case 'lt':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} < ${params[0]})`;
                    else
                        throw new Error('Cannot use "lt" without something selected!');
                    break;
                case 'ge':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} >= ${params[0]})`;
                    else
                        throw new Error('Cannot use "ge" without something selected!');
                    break;
                case 'le':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} <= ${params[0]})`;
                    else
                        throw new Error('Cannot use "le" without something selected!');
                    break;
                default:
                    throw new Error(`Cannot perform command "${q.cmd}" on this (query) datum!`);
            }
        }
        if (query && sel)
            return query + ' AND ' + sel;
        else if (sel)
            return sel;
        else
            return query;
    }
}
function createQueryDatum() {
    return makeSelector(new SQLite3QueryDatumPartial());
}
// =========================
// ====== STATIC DATUM =====
// =========================
class SQLite3StaticDatumPartial extends SQLite3DatumPartial {
    constructor(initialValue) {
        super();
        this.initialValue = initialValue;
    }
    _sel(attribute) {
        const child = new SQLite3StaticDatumPartial(this.initialValue);
        child.query = this.query.slice();
        child.query.push({ cmd: 'sel', params: [attribute] });
        return child;
    }
    // QUERY execute
    static async run(query, initialValue) {
        let value = await resolveHValue(initialValue);
        for (const q of query) {
            const params = q.params.slice();
            if (params) { // reduce parameters
                for (let i = 0; i < q.params.length; i++)
                    params[i] = await resolveHValue(params[i]);
            }
            switch (q.cmd) {
                case 'sel':
                    value = value[q.params[0]];
                    break;
                case 'eq':
                    value = !q.params.find(a => a !== value);
                    break;
                case 'ne':
                    value = Boolean(q.params.find(a => a !== value));
                    break;
                case 'or':
                    value = Boolean(q.params.reduce((acc, v) => acc || v, value));
                    break;
                case 'and':
                    value = Boolean(q.params.reduce((acc, v) => acc && v, value));
                    break;
                case 'add':
                    value = q.params.reduce((acc, v) => acc + value, value);
                    break;
                case 'sub':
                    value = q.params.reduce((acc, v) => acc - value, value);
                    break;
                case 'mul':
                    value = q.params.reduce((acc, v) => acc * v, value);
                    break;
                case 'div':
                    value = q.params.reduce((acc, v) => acc / v, value);
                    break;
                case 'mod':
                    value = q.params.reduce((acc, v) => acc % v, value);
                    break;
                case 'gt':
                    value = !q.params.find((v, i, arr) => {
                        if (i === 0)
                            return value <= v;
                        else
                            return arr[i - 1] <= v;
                    });
                    break;
                case 'lt':
                    value = !q.params.find((v, i, arr) => {
                        if (i === 0)
                            return value >= v;
                        else
                            return arr[i - 1] >= v;
                    });
                    break;
                case 'ge':
                    value = !q.params.find((v, i, arr) => {
                        if (i === 0)
                            return value < v;
                        else
                            return arr[i - 1] < v;
                    });
                    break;
                case 'le':
                    value = !q.params.find((v, i, arr) => {
                        if (i === 0)
                            return value > v;
                        else
                            return arr[i - 1] > v;
                    });
                    break;
                default:
                    throw new Error(`Cannot perform query "${q.cmd}" on this (static) datum!`);
            }
        }
        return value;
    }
    async run() {
        const ret = await SQLite3StaticDatumPartial.run(this.query, this.initialValue);
        this.query = [];
        return ret;
    }
}
function createStaticDatum(initialValue) {
    return makeSelector(new SQLite3StaticDatumPartial(initialValue));
}
// =========================
// ==== SINGLE SELECTION ===
// =========================
class SQLite3SingleSelectionPartial extends SQLite3DatumPartial {
    constructor(db, tableName, key, index, types) {
        super();
        this.db = db;
        this.tableName = tableName;
        this.key = key;
        this.index = index;
        this.types = types;
        this.cmds = ['sel', 'update', 'replace', 'delete'];
    }
    _sel(attribute) {
        const child = new SQLite3SingleSelectionPartial(this.db, this.tableName, this.key, this.index, this.types);
        child.query = this.query.slice();
        child.query.push({ cmd: 'sel', params: [attribute] });
        return child;
    }
    // Selection
    update(obj) {
        this.query.push({ cmd: 'update', params: [obj] });
        return this;
    }
    replace(obj) {
        this.query.push({ cmd: 'replace', params: [obj] });
        return this;
    }
    delete() {
        this.query.push({ cmd: 'delete' });
        return this;
    }
    // Query
    async run() {
        const key = await resolveHValue(this.key);
        const index = await resolveHValue(this.index);
        const tableName = await resolveHValue(this.tableName);
        if (!this.query || !this.query.length) {
            return this.db.get(`SELECT * FROM [${tableName}] WHERE [${index}]=${safen(key)}`)
                .then(async (r) => coerceCorrectReturn(r, await resolveHValue(this.types)));
        }
        let cmd = '';
        const params = [];
        if (this.cmds.includes(this.query[0].cmd)) {
            const q = this.query.shift();
            cmd = q.cmd;
            for (const p of q.params)
                params.push(await resolveHValue(p));
            if ((cmd === 'update' || cmd === 'replace') && !Object.keys(params[0]).filter(k => params[0][k]).length) {
                cmd = 'delete';
            }
        }
        let query = '';
        let sel = '';
        switch (cmd) {
            case 'sel':
                query = `SELECT ${params[0]} FROM [${tableName}] WHERE [${index}]=${safen(key)}`;
                sel = params[0];
                break;
            case 'update':
                let set = '';
                for (const k in params[0])
                    if (params[0][k] != null) {
                        if (!set)
                            set = `[${k}]=${params[0][k]}`;
                        else
                            set += `, [${k}]=${params[0][k]}`;
                    }
                query = `UPDATE [${tableName}] SET ${set} WHERE [${index}]=${safen(key)}`;
                break;
            case 'replace':
                let repKeys = '';
                let repValues = '';
                for (const k in params[0])
                    if (params[0][k] != null) {
                        if (!repKeys) {
                            repKeys = `[${k}]`;
                            repValues = `${params[0][k]}`;
                        }
                        else {
                            repKeys += `, [${k}]`;
                            repValues += `, ${params[0][k]}`;
                        }
                    }
                query = `REPLACE INTO [${tableName}] (${repKeys}) VALUES (${repValues}) WHERE ${[index]}=${safen(key)}`;
                break;
            case 'delete':
                query = `DELETE FROM [${tableName}] WHERE ${[index]}=${safen(key)}`;
                break;
            default:
                query = `SELECT * FROM [${tableName}] WHERE ${[index]}=${safen(key)}`;
        }
        const value = await this.db.get(query).then(async (r) => coerceCorrectReturn(r, await resolveHValue(this.types)))
            .then(a => sel ? a[sel] : a);
        if (this.query.length > 0) {
            const ret = await SQLite3StaticDatumPartial.run(this.query, value);
            this.query = [];
            return ret;
        }
        else {
            return value;
        }
    }
}
function createSingleSelection(db, tableName, key, index, types) {
    return makeSelector(new SQLite3SingleSelectionPartial(db, tableName, key, index, types));
}
// =========================
// ======= STREAM ==========
// =========================
class SQLite3Stream {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
        this.query = [];
    }
    filter(predicate) {
        this.query.push({ cmd: 'filter', params: [predicate] });
        return this;
    }
    distinct() {
        if (!this.query.find(q => q.cmd === 'distinct'))
            this.query.push({ cmd: 'distinct' });
        return this;
    }
    limit(n) {
        this.query.push({ cmd: 'limit', params: [n] });
        return createQuery(() => this.run());
    }
    pluck(...fields) {
        const idx = this.query.findIndex(q => q.cmd === 'pluck');
        if (idx >= 0) {
            this.query[idx].params = this.query[idx].params.concat(fields.filter(a => !this.query[idx].params.includes(a)));
        }
        else {
            this.query.push({ cmd: 'pluck', params: fields });
        }
        return this;
    }
    async computeQuery() {
        if (!this.query.length)
            return { select: '*' };
        const tableName = await resolveHValue(this.tableName);
        const primaryKey = await this.db.getPrimaryKey(tableName);
        const distinct = Boolean(this.query.find(q => q.cmd === 'distinct'));
        const pluck = this.query.find(q => q.cmd === 'pluck');
        const select = (distinct ? 'DISTINCT ' : '') + (pluck ? pluck.params.map(a => `[${a}]`).join(', ') : '*');
        let post = ``;
        let cmdsApplied = 0;
        for (const q of this.query) {
            switch (q.cmd) {
                case 'filter':
                    const pred = q.params[0];
                    let predfoo;
                    if (typeof pred === 'function')
                        predfoo = pred;
                    else if (typeof pred === 'object')
                        predfoo = deepPartialToPredicate(pred);
                    else
                        predfoo = () => Boolean(pred);
                    const res = predfoo(createQueryDatum());
                    if (typeof res['compile'] === 'function') {
                        const query = await res.compile();
                        if (!post)
                            post = `[${primaryKey}] in (SELECT [${primaryKey}] FROM [${tableName}] WHERE ${query})`;
                        else
                            post += ` AND (${query})`;
                    }
                    else if (!res) {
                        return { kill: true };
                    } // if it's true, we're g2g anyways
                    cmdsApplied++;
                    break;
                case 'distinct':
                case 'pluck':
                    break;
                case 'limit':
                    return { select, post: post ? post + `)` : '', limit: q.params[0] };
                default:
                    if (cmdsApplied)
                        return { select, post: post + ')' };
                    else
                        return { select };
            }
        }
        if (cmdsApplied)
            return { select, post };
        else
            return { select };
    }
}
// =========================
// ======= SELECTION =======
// =========================
class SQLite3Selection extends SQLite3Stream {
    constructor(db, tableName, keys, index, types) {
        super(db, tableName);
        this.keys = keys;
        this.index = index;
        this.types = types;
    }
    async makeSelection() {
        const keys = await resolveHValue(this.keys);
        const index = await resolveHValue(this.index);
        let selection = '';
        for (const key of keys) {
            if (!selection) {
                selection = `[${index}]=${safen(key)}`;
            }
            else {
                selection += `OR [${index}]=${safen(key)}`;
            }
        }
        return selection;
    }
    count() {
        return createStaticDatum(createQuery(async () => {
            const tableName = await resolveHValue(this.tableName);
            const selection = await this.makeSelection();
            if (this.query.length) {
                const { post, kill, limit } = await this.computeQuery();
                if (kill)
                    return 0;
                const poost = (post ? ' AND ' + post : '') + (limit ? ' LIMIT ' + limit : '');
                return this.db.get(`SELECT COUNT(*) FROM [${tableName}] WHERE ${selection}${poost}`).then(a => a['COUNT(*)']);
            }
            return this.db.get(`SELECT COUNT(*) FROM [${tableName}] WHERE ${selection}`).then(a => a['COUNT(*)']);
        }));
    }
    delete() {
        return createStaticDatum(createQuery(async () => {
            const tableName = await resolveHValue(this.tableName);
            const selection = await this.makeSelection();
            if (this.query.length) {
                const { post, kill, limit } = await this.computeQuery();
                if (kill)
                    return { deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 1 };
                const poost = (post ? ' AND ' + post : '') + (limit ? ' LIMIT ' + limit : '');
                return this.db.exec(`DELETE FROM [${tableName}] WHERE ${selection}${poost}`).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
            }
            return this.db.exec(`DELETE FROM [${tableName}] WHERE ${selection}`).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
        }));
    }
    async run() {
        const tableName = await resolveHValue(this.tableName);
        const selection = await this.makeSelection();
        if (this.query.length) {
            const { select, post, kill, limit } = await this.computeQuery();
            this.query = [];
            if (kill)
                return [];
            const poost = (post ? ' AND ' + post : '') + (limit ? ' LIMIT ' + limit : '');
            return this.db.all(`SELECT ${select} FROM [${tableName}] WHERE ${selection}${poost}`).then(async (rs) => {
                const types = await resolveHValue(this.types);
                return rs.map(r => coerceCorrectReturn(r, types));
            });
        }
        return this.db.all(`SELECT * FROM [${tableName}] WHERE ${selection}`).then(async (rs) => {
            const types = await resolveHValue(this.types);
            return rs.map(r => coerceCorrectReturn(r, types));
        });
    }
}
// =========================
// ========= TABLE =========
// =========================
class SQLite3Table extends SQLite3Stream {
    constructor(db, tableName, types) {
        super(db, tableName);
        this.types = types;
    }
    filter(predicate) {
        this.query.push({ cmd: 'filter', params: [predicate] });
        return this;
    }
    count() {
        return createStaticDatum(createQuery(async () => {
            const tableName = await resolveHValue(this.tableName);
            if (this.query.length) {
                const { post, kill, limit } = await this.computeQuery();
                if (kill)
                    return 0;
                const poost = (post ? ` WHERE ${post}` : '') + (limit ? `LIMIT ${limit}` : '');
                return this.db.get(`SELECT COUNT(*) FROM [${tableName}]${poost}`).then(a => a['COUNT(*)']);
            }
            return this.db.get(`SELECT COUNT(*) FROM [${tableName}]`).then(a => a['COUNT(*)']);
        }));
    }
    delete() {
        return createStaticDatum(createQuery(async () => {
            const tableName = await resolveHValue(this.tableName);
            if (this.query.length) {
                const { post, kill, limit } = await this.computeQuery();
                if (kill)
                    return { deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 1 };
                const poost = (post ? ` WHERE ${post}` : '') + (limit ? `LIMIT ${limit}` : '');
                return this.db.exec(`DELETE FROM [${tableName}]${poost}`).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
            }
            return this.db.exec(`DELETE TABLE IF EXISTS [${tableName}]`).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
        }));
    }
    get(key) {
        return createSingleSelection(this.db, this.tableName, key, createQuery(async () => {
            const tableName = await resolveHValue(this.tableName);
            return this.db.getPrimaryKey(tableName);
        }), this.types);
    }
    getAll(...values) {
        let index;
        if (typeof values[values.length - 1] === 'object') {
            index = values.pop().index;
        }
        else {
            index = createQuery(async () => {
                const tableName = await resolveHValue(this.tableName);
                return this.db.getPrimaryKey(tableName);
            });
        }
        return new SQLite3Selection(this.db, this.tableName, values, index, this.types);
    }
    insert(obj, options) {
        return createStaticDatum(createQuery(async () => {
            const tableName = await resolveHValue(this.tableName);
            let repKeys = '';
            let repValues = '';
            for (const k in obj)
                if (obj[k] != null) {
                    if (!repKeys) {
                        repKeys = `[${k}]`;
                        repValues = `${safen(obj[k])}`;
                    }
                    else {
                        repKeys += `, [${k}]`;
                        repValues += `, ${safen(obj[k])}`;
                    }
                }
            let query = `INSERT`;
            if (options && options.conflict === 'replace')
                query += ' OR REPLACE';
            query += ` INTO [${tableName}] (${repKeys}) VALUES (${repValues})`;
            if (options && options.conflict === 'update') {
                const primaryKey = await this.db.getPrimaryKey(tableName);
                let set = '';
                for (const k in obj)
                    if (obj[k] != null) {
                        if (!set)
                            set = `[${k}]=excluded.[${k}]`;
                        else
                            set += `, [${k}]=excluded.[${k}]`;
                    }
                query += ` ON CONFLICT([${primaryKey}]) DO UPDATE SET ${set}`;
            }
            const ret = await this.db.exec(query).then(() => ({ deleted: 0, skipped: 0, errors: 0, inserted: 1, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
            return ret;
        }));
    }
    async run() {
        const tableName = await resolveHValue(this.tableName);
        if (this.query.length) {
            const { select, post, kill, limit } = await this.computeQuery();
            this.query = [];
            if (kill)
                return [];
            const poost = (post ? ' WHERE ' + post : '') + (limit ? ' LIMIT ' + limit : '');
            return this.db.all(`SELECT ${select} FROM [${tableName}]${poost}`).then(async (rs) => {
                const types = await resolveHValue(this.types);
                return rs.map(r => coerceCorrectReturn(r, types));
            });
        }
        return this.db.all(`SELECT * FROM [${tableName}]`).then(async (rs) => {
            const types = await resolveHValue(this.types);
            return rs.map(r => coerceCorrectReturn(r, types));
        });
    }
}
// =========================
// ======== DATABASE =======
// =========================
class SQLite3ReQLDatabase {
    constructor() {
        this.typemapsType = Object.freeze([
            { name: 'table', type: 'string' },
            { name: 'types', type: 'string' },
        ]);
        this.typemapsTableName = '__reql_typemap__';
        this.valueTypeMap = {
            string: 'text',
            bool: 'numeric',
            number: 'numeric',
            object: 'text',
        };
    }
    async init(options) {
        options = Object.assign({ logger: 'sqlite3' }, options);
        this.db = await sqlite3_wrapper_1.create(Object.assign(options, { logger: options.logger + '.raw' }));
        const tableList = await this.tableList().run();
        if (!tableList.find(a => a === this.typemapsTableName)) {
            await this.tableCreate(this.typemapsTableName, this.typemapsType).run();
        }
    }
    get typemaps() {
        return this.table(this.typemapsTableName);
    }
    tableCreate(tableName, schema) {
        const indexes = [];
        let keys = '';
        for (const key of schema) {
            if (!keys) { // primary key
                keys = `[${key.name}] ${this.valueTypeMap[key.type] || 'text'} primary key`;
            }
            else {
                keys += `, [${key.name}] ${this.valueTypeMap[key.type] || 'text'}`;
            }
            if (key.index)
                indexes.push(key.name);
        }
        if (keys.length === 0)
            throw new Error('Must have a schema of at least one entry!');
        return createStaticDatum(createQuery(async () => {
            if (typeof tableName !== 'string')
                tableName = await tableName.run();
            await this.db.exec(`CREATE TABLE IF NOT EXISTS [${tableName}] (${keys})`);
            await this.typemaps.insert({ table: tableName, types: JSON.stringify(schema) }, { conflict: 'replace' }).run();
            for (const index of indexes)
                await this.db.exec(`CREATE INDEX [${tableName}_${index}] ON [${tableName}]([${index}])`);
            return { tables_created: 1 };
        }));
    }
    tableDrop(tableName) {
        return createStaticDatum(createQuery(async () => {
            if (typeof tableName !== 'string')
                tableName = await tableName.run();
            await this.db.exec(`DROP TABLE IF EXISTS [${tableName}]`);
            return { tables_dropped: 1 };
        }));
    }
    tableList() {
        return createStaticDatum(createQuery(async () => {
            const result = await this.db.all(`SELECT name FROM sqlite_master WHERE type='table'`);
            return result.map(a => a.name);
        }));
    }
    table(tableName) {
        return new SQLite3Table(this.db, tableName, createQuery(async () => tableName !== this.typemapsTableName
            ? await this.typemaps.get(tableName)('types').run().then(a => JSON.parse(a))
            : this.typemapsType));
    }
}
exports.SQLite3ReQLDatabase = SQLite3ReQLDatabase;
async function create(options) {
    const db = new SQLite3ReQLDatabase();
    await db.init(options);
    return db;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=reql-sqlite3.js.map