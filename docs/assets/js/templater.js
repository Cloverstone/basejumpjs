class Compiler {
    constructor(template) {
        this.attributes = {};
        this.values = {};
        this.template = template;
        this.fragment = this.template.generate();
        this.id = 0;
        this.compile(this.fragment);
    }
    createId() {
        const id = String(this.id);
        this.id++;
        return id;
    }
    compile(node) {
        if (node instanceof Element) {
            this.compileAttributes(node);
        }
        this.compileValues(node);
        for (const child of node.childNodes) {
            this.compile(child);
        }
    }
    compileAttributes(element) {
        let elementId;
        element.id;
        for (const attribute of element.getAttributeNames()) {
            const value = element.getAttribute(attribute) ?? "";
            const matches = value.match(/^<!--([0-9]+)-->$/);
            if (matches !== null) {
                if (typeof elementId === "undefined") {
                    elementId = this.createId();
                    element.setAttribute("data-fluid-id", elementId);
                }
                const index = Number(matches[1]);
                this.attributes[index] = { elementId, attribute };
                element.removeAttribute(attribute);
            }
        }
    }
    findComments(node) {
        const result = [];
        for (const child of node.childNodes) {
            if (child instanceof Comment) {
                result.push(child);
            }
        }
        return result;
    }
    compileValues(node) {
        for (const comment of this.findComments(node)) {
            const value = comment.nodeValue ?? "";
            const matches = value.match(/^([0-9]+)$/);
            if (matches !== null) {
                const index = Number(matches[1]);
                this.template.values[index];
                const nodeId = this.createId();
                const node = document.createElement("span");
                node.setAttribute("data-fluid-id", nodeId);
                this.values[index] = { nodeId };
                comment.replaceWith(node);
            }
        }
    }
}

class Template {
    constructor(strings, values) {
        this.strings = strings;
        this.values = values;
    }
    equalStrings(template) {
        if (this.strings.length !== template.strings.length) {
            return false;
        }
        for (let index = 0; index < this.strings.length; index++) {
            if (this.strings[index] !== template.strings[index]) {
                return false;
            }
        }
        return true;
    }
    generate() {
        let result = this.strings[0];
        for (let index = 1; index < this.strings.length; index++) {
            result += `<!--${index - 1}-->`;
            result += this.strings[index];
        }
        const template = document.createElement("template");
        template.innerHTML = result;
        return template.content;
    }
}
function html(strings, ...values) {
    return new Template(strings, values);
}

const compilers = [];
class Instance {
    constructor(template) {
        this.attributes = {};
        this.values = {};
        this.template = template;
        this.compiler = this.getCompiler(this.template);
        this.fragment = this.compiler.fragment.cloneNode(true);
        this.instantiateAttributes();
        this.instantiateValues();
    }
    getCompiler(template) {
        for (const compiler of compilers) {
            if (compiler.template.equalStrings(template)) {
                return compiler;
            }
        }
        const compiler = new Compiler(template);
        compilers.unshift(compiler);
        return compiler;
    }
    matchAttribute(attribute) {
        const eventMatches = attribute.match(/^@(.+)$/);
        const toggleMatches = attribute.match(/^(.+)\?$/);
        if (eventMatches !== null && toggleMatches !== null) {
            throw new Error("attribute kind cannot be both event and toggle");
        }
        if (eventMatches !== null) {
            return { kind: "event", name: eventMatches[1] };
        }
        else if (toggleMatches !== null) {
            return { kind: "toggle", name: toggleMatches[1] };
        }
        else {
            return { kind: "value", name: attribute };
        }
    }
    instantiateAttributes() {
        for (const key in this.compiler.attributes) {
            const { elementId, attribute } = this.compiler.attributes[key];
            const { kind, name } = this.matchAttribute(attribute);
            const element = this.fragment.querySelector(`[data-fluid-id="${elementId}"]`);
            if (element === null) {
                throw new Error("cached fragment missing element");
            }
            this.attributes[key] = { kind, element, name };
        }
        for (const { element } of Object.values(this.attributes)) {
            element.removeAttribute("data-fluid-id");
        }
    }
    matchValue(value) {
        if (Array.isArray(value)) {
            return "sequence";
        }
        else if (value instanceof Template) {
            return "template";
        }
        else {
            return "text";
        }
    }
    instantiateValues() {
        for (const key in this.compiler.values) {
            const { nodeId } = this.compiler.values[key];
            const kind = this.matchValue(this.template.values[key]);
            const start = new Comment();
            const end = new Comment();
            this.fragment
                .querySelector(`[data-fluid-id="${nodeId}"`)
                ?.replaceWith(start, end);
            this.values[key] = { kind, start, end };
        }
    }
}

const templates = new WeakMap();
const caches = new WeakMap();
const sequences = new WeakMap();
function clearElement(element) {
    while (element.firstChild) {
        element.firstChild.remove();
    }
}
function clearNodes(start, end) {
    let current = start.nextSibling;
    while (current !== null && current !== end) {
        current.remove();
        current = start.nextSibling;
    }
}
function renderSequence(startMarker, endMarker, oldTemplates, newTemplates) {
    if (typeof oldTemplates === "undefined" || oldTemplates.length === 0) {
        clearNodes(startMarker, endMarker);
        const sequence = [];
        for (const template of newTemplates) {
            const start = new Comment();
            const end = new Comment();
            endMarker.before(start, end);
            renderTemplate(start, end, undefined, template);
            sequence.push({ start, end });
        }
        sequences.set(startMarker, sequence);
        return;
    }
    if (newTemplates.length === 0) {
        clearNodes(startMarker, endMarker);
        sequences.set(startMarker, []);
        return;
    }
    const sequence = sequences.get(startMarker);
    if (typeof sequence === "undefined") {
        throw new Error("sequence missing");
    }
    while (newTemplates.length < sequence.length) {
        const popped = sequence.pop();
        if (typeof popped === "undefined") {
            throw new Error("cannot align sequence length");
        }
        const { start, end } = popped;
        clearNodes(start, end);
        start.remove();
        end.remove();
    }
    while (newTemplates.length > sequence.length) {
        const start = new Comment();
        const end = new Comment();
        endMarker.before(start, end);
        renderTemplate(start, end, undefined, newTemplates[sequence.length]);
        sequence.push({ start, end });
    }
    for (let index = 0; index < sequence.length; index++) {
        const { start, end } = sequence[index];
        const oldTemplate = oldTemplates[index];
        const newTemplate = newTemplates[index];
        renderTemplate(start, end, oldTemplate, newTemplate);
    }
    sequences.set(startMarker, sequence);
}
function renderTemplate(start, end, oldTemplate, newTemplate) {
    if (typeof oldTemplate === "undefined" ||
        !oldTemplate.equalStrings(newTemplate)) {
        clearNodes(start, end);
        const instance = new Instance(newTemplate);
        const cache = {
            attributes: instance.attributes,
            values: instance.values,
        };
        start.after(instance.fragment);
        for (let index = 0; index < newTemplate.values.length; index++) {
            const value = newTemplate.values[index];
            if (index in cache.attributes) {
                renderAttribute(cache.attributes[index], undefined, value);
            }
            else if (index in cache.values) {
                renderValue(cache.values[index], undefined, value);
            }
        }
        caches.set(start, cache);
        return;
    }
    const cache = caches.get(start);
    if (typeof cache === "undefined") {
        throw new Error("render cache is missing");
    }
    for (let index = 0; index < newTemplate.values.length; index++) {
        const oldValue = oldTemplate.values[index];
        const newValue = newTemplate.values[index];
        if (oldValue !== newValue) {
            if (index in cache.attributes) {
                renderAttribute(cache.attributes[index], oldValue, newValue);
            }
            else if (index in cache.values) {
                renderValue(cache.values[index], oldValue, newValue);
            }
        }
    }
}
function renderText(start, end, value) {
    const next = start.nextSibling;
    if (next instanceof Text && next.nextSibling === end) {
        next.nodeValue = value;
    }
    else {
        clearNodes(start, end);
        start.after(new Text(value));
    }
}
function renderValue({ kind, start, end }, oldValue, newValue) {
    if (kind === "sequence") {
        renderSequence(start, end, oldValue, newValue);
    }
    else if (kind === "template") {
        renderTemplate(start, end, oldValue, newValue);
    }
    else if (kind === "text") {
        renderText(start, end, String(newValue));
    }
}
function renderAttribute({ kind, name, element }, oldValue, newValue) {
    if (kind === "event") {
        if (typeof oldValue !== "undefined") {
            element.removeEventListener(name, oldValue);
        }
        element.addEventListener(name, newValue);
    }
    else if (kind === "toggle") {
        if (newValue) {
            element.setAttribute(name, "");
        }
        else {
            element.removeAttribute(name);
        }
    }
    else if (kind === "value") {
        element.setAttribute(name, String(newValue));
    }
}
function render(target, template) {
    if (!templates.has(target)) {
        clearElement(target);
        target.append(new Comment(), new Comment());
    }
    const start = target.firstChild;
    const end = target.lastChild;
    if (start instanceof Comment && end instanceof Comment) {
        renderTemplate(start, end, templates.get(target), template);
    }
    else {
        throw new Error("start or end markers missing");
    }
    templates.set(target, template);
}

export { Template, html, render };
