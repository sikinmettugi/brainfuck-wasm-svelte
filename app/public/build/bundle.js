
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\BfMachineState.svelte generated by Svelte v3.29.0 */

    const file = "src\\BfMachineState.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (11:12) {#each tapes as tp}
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*tp*/ ctx[3] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "svelte-1orhb5n");
    			add_location(li, file, 11, 12, 360);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tapes*/ 1 && t_value !== (t_value = /*tp*/ ctx[3] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(11:12) {#each tapes as tp}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let section;
    	let div1;
    	let ul;
    	let t0;
    	let li;
    	let t2;
    	let div0;
    	let em;
    	let each_value = /*tapes*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			div1 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			li = element("li");
    			li.textContent = "(...)";
    			t2 = space();
    			div0 = element("div");
    			em = element("em");
    			attr_dev(li, "class", "tape-elem-rightmost svelte-1orhb5n");
    			add_location(li, file, 15, 12, 440);
    			attr_dev(ul, "class", "tape svelte-1orhb5n");
    			add_location(ul, file, 9, 8, 296);
    			attr_dev(em, "class", "svelte-1orhb5n");
    			add_location(em, file, 18, 12, 574);
    			attr_dev(div0, "class", "tape-pointer svelte-1orhb5n");
    			attr_dev(div0, "style", /*indexPositionStyle*/ ctx[1]);
    			add_location(div0, file, 17, 8, 507);
    			attr_dev(div1, "id", "bf-interface-state-block");
    			set_style(div1, "display", "inline-block");
    			attr_dev(div1, "class", "svelte-1orhb5n");
    			add_location(div1, file, 8, 4, 221);
    			attr_dev(section, "id", "bf-interface-machine-state");
    			attr_dev(section, "class", "svelte-1orhb5n");
    			add_location(section, file, 7, 0, 174);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div1);
    			append_dev(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(ul, t0);
    			append_dev(ul, li);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, em);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*tapes*/ 1) {
    				each_value = /*tapes*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*indexPositionStyle*/ 2) {
    				attr_dev(div0, "style", /*indexPositionStyle*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const tapeSize = 32;

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("BfMachineState", slots, []);
    	let { tapes } = $$props;
    	let { tapeIndex } = $$props;
    	const writable_props = ["tapes", "tapeIndex"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<BfMachineState> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("tapes" in $$props) $$invalidate(0, tapes = $$props.tapes);
    		if ("tapeIndex" in $$props) $$invalidate(2, tapeIndex = $$props.tapeIndex);
    	};

    	$$self.$capture_state = () => ({
    		tapes,
    		tapeIndex,
    		tapeSize,
    		indexPositionStyle
    	});

    	$$self.$inject_state = $$props => {
    		if ("tapes" in $$props) $$invalidate(0, tapes = $$props.tapes);
    		if ("tapeIndex" in $$props) $$invalidate(2, tapeIndex = $$props.tapeIndex);
    		if ("indexPositionStyle" in $$props) $$invalidate(1, indexPositionStyle = $$props.indexPositionStyle);
    	};

    	let indexPositionStyle;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*tapeIndex*/ 4) {
    			 $$invalidate(1, indexPositionStyle = `margin-left: ${6 + tapeIndex * tapeSize}px`);
    		}
    	};

    	return [tapes, indexPositionStyle, tapeIndex];
    }

    class BfMachineState extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { tapes: 0, tapeIndex: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BfMachineState",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tapes*/ ctx[0] === undefined && !("tapes" in props)) {
    			console.warn("<BfMachineState> was created without expected prop 'tapes'");
    		}

    		if (/*tapeIndex*/ ctx[2] === undefined && !("tapeIndex" in props)) {
    			console.warn("<BfMachineState> was created without expected prop 'tapeIndex'");
    		}
    	}

    	get tapes() {
    		throw new Error("<BfMachineState>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tapes(value) {
    		throw new Error("<BfMachineState>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tapeIndex() {
    		throw new Error("<BfMachineState>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tapeIndex(value) {
    		throw new Error("<BfMachineState>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\BfProgramInputBox.svelte generated by Svelte v3.29.0 */

    const file$1 = "src\\BfProgramInputBox.svelte";

    // (18:4) {:else}
    function create_else_block(ctx) {
    	let div;
    	let t;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = space();
    			span = element("span");
    			attr_dev(div, "id", "bf-interface-program-preview");
    			attr_dev(div, "class", "svelte-1vgfd9x");
    			add_location(div, file$1, 18, 4, 640);
    			attr_dev(span, "id", "bf-program-caret");
    			attr_dev(span, "class", "caret");
    			set_style(span, "display", "none");
    			add_location(span, file$1, 21, 4, 726);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = /*displayElem*/ ctx[2];
    			insert_dev(target, t, anchor);
    			insert_dev(target, span, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*displayElem*/ 4) div.innerHTML = /*displayElem*/ ctx[2];		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(18:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (16:4) {#if !isRunning}
    function create_if_block(ctx) {
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "id", "bf-input-program");
    			attr_dev(textarea, "name", "bf-program-input");
    			attr_dev(textarea, "class", "svelte-1vgfd9x");
    			add_location(textarea, file$1, 16, 4, 530);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*inputText*/ ctx[0]);

    			if (!mounted) {
    				dispose = listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*inputText*/ 1) {
    				set_input_value(textarea, /*inputText*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(16:4) {#if !isRunning}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (!/*isRunning*/ ctx[1]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "id", "bf-interface-input-area");
    			add_location(div, file$1, 14, 0, 468);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("BfProgramInputBox", slots, []);
    	let { inputText = "" } = $$props;
    	let { isRunning } = $$props;
    	let { curIndex } = $$props;
    	let displayElem = "";
    	const writable_props = ["inputText", "isRunning", "curIndex"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<BfProgramInputBox> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		inputText = this.value;
    		$$invalidate(0, inputText);
    	}

    	$$self.$$set = $$props => {
    		if ("inputText" in $$props) $$invalidate(0, inputText = $$props.inputText);
    		if ("isRunning" in $$props) $$invalidate(1, isRunning = $$props.isRunning);
    		if ("curIndex" in $$props) $$invalidate(3, curIndex = $$props.curIndex);
    	};

    	$$self.$capture_state = () => ({
    		inputText,
    		isRunning,
    		curIndex,
    		displayElem
    	});

    	$$self.$inject_state = $$props => {
    		if ("inputText" in $$props) $$invalidate(0, inputText = $$props.inputText);
    		if ("isRunning" in $$props) $$invalidate(1, isRunning = $$props.isRunning);
    		if ("curIndex" in $$props) $$invalidate(3, curIndex = $$props.curIndex);
    		if ("displayElem" in $$props) $$invalidate(2, displayElem = $$props.displayElem);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isRunning, curIndex, inputText*/ 11) {
    			 if (isRunning && (curIndex >= 0 && curIndex < inputText.length)) {
    				let head = inputText.slice(0, curIndex);
    				let caratChar = inputText[curIndex];
    				let tail = inputText.slice(curIndex + 1);
    				$$invalidate(2, displayElem = head + `<span id="bf-program-caret" class="carat">${caratChar}</span>` + tail);
    			}
    		}
    	};

    	return [inputText, isRunning, displayElem, curIndex, textarea_input_handler];
    }

    class BfProgramInputBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { inputText: 0, isRunning: 1, curIndex: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BfProgramInputBox",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*isRunning*/ ctx[1] === undefined && !("isRunning" in props)) {
    			console.warn("<BfProgramInputBox> was created without expected prop 'isRunning'");
    		}

    		if (/*curIndex*/ ctx[3] === undefined && !("curIndex" in props)) {
    			console.warn("<BfProgramInputBox> was created without expected prop 'curIndex'");
    		}
    	}

    	get inputText() {
    		throw new Error("<BfProgramInputBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inputText(value) {
    		throw new Error("<BfProgramInputBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isRunning() {
    		throw new Error("<BfProgramInputBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isRunning(value) {
    		throw new Error("<BfProgramInputBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get curIndex() {
    		throw new Error("<BfProgramInputBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curIndex(value) {
    		throw new Error("<BfProgramInputBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\BfInterface.svelte generated by Svelte v3.29.0 */

    const { Error: Error_1, console: console_1 } = globals;
    const file$2 = "src\\BfInterface.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    // (155:12) {#if errorStr}
    function create_if_block$1(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*errorStr*/ ctx[5]);
    			attr_dev(div, "id", "bf-interface-error-box");
    			attr_dev(div, "class", "svelte-wkoo8r");
    			add_location(div, file$2, 155, 12, 4727);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*errorStr*/ 32) set_data_dev(t, /*errorStr*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(155:12) {#if errorStr}",
    		ctx
    	});

    	return block;
    }

    // (163:16) {#each presets as ps}
    function create_each_block$1(ctx) {
    	let li;
    	let button;
    	let t0_value = /*ps*/ ctx[21].description + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(button, file$2, 164, 24, 5036);
    			attr_dev(li, "class", "svelte-wkoo8r");
    			add_location(li, file$2, 163, 20, 5006);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, button);
    			append_dev(button, t0);
    			append_dev(li, t1);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*runPresets*/ ctx[11](/*ps*/ ctx[21]))) /*runPresets*/ ctx[11](/*ps*/ ctx[21]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*presets*/ 1 && t0_value !== (t0_value = /*ps*/ ctx[21].description + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(163:16) {#each presets as ps}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div4;
    	let bfprograminputbox;
    	let t0;
    	let button0;
    	let t2;
    	let button1;
    	let t4;
    	let bfmachinestate;
    	let t5;
    	let section0;
    	let div0;
    	let t6;
    	let textarea0;
    	let t7;
    	let div1;
    	let t8;
    	let textarea1;
    	let t9;
    	let br;
    	let t10;
    	let input;
    	let label;
    	let t12;
    	let div2;
    	let t13;
    	let section1;
    	let div3;
    	let ul;
    	let current;
    	let mounted;
    	let dispose;

    	bfprograminputbox = new BfProgramInputBox({
    			props: {
    				inputText: /*programStr*/ ctx[4],
    				isRunning: !/*paused*/ ctx[7],
    				curIndex: /*programIndex*/ ctx[6]
    			},
    			$$inline: true
    		});

    	bfmachinestate = new BfMachineState({
    			props: {
    				tapes: /*tapes*/ ctx[8],
    				tapeIndex: /*tapeIndex*/ ctx[9]
    			},
    			$$inline: true
    		});

    	let if_block = /*errorStr*/ ctx[5] && create_if_block$1(ctx);
    	let each_value = /*presets*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			create_component(bfprograminputbox.$$.fragment);
    			t0 = space();
    			button0 = element("button");
    			button0.textContent = "Run";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Reset";
    			t4 = space();
    			create_component(bfmachinestate.$$.fragment);
    			t5 = space();
    			section0 = element("section");
    			div0 = element("div");
    			t6 = text("Input:\r\n            ");
    			textarea0 = element("textarea");
    			t7 = space();
    			div1 = element("div");
    			t8 = text("Output:\r\n            ");
    			textarea1 = element("textarea");
    			t9 = space();
    			br = element("br");
    			t10 = space();
    			input = element("input");
    			label = element("label");
    			label.textContent = "Print in dec";
    			t12 = space();
    			div2 = element("div");
    			if (if_block) if_block.c();
    			t13 = space();
    			section1 = element("section");
    			div3 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(button0, "class", "bf-button-input");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$2, 136, 4, 3868);
    			attr_dev(button1, "class", "bf-button-input");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$2, 137, 4, 3947);
    			attr_dev(textarea0, "id", "bf-input-stream");
    			add_location(textarea0, file$2, 145, 12, 4225);
    			attr_dev(div0, "id", "bf-interface-input-area");
    			add_location(div0, file$2, 143, 8, 4157);
    			attr_dev(textarea1, "id", "bf-output-stream");
    			attr_dev(textarea1, "name", "bf-output-stream");
    			textarea1.readOnly = true;
    			textarea1.value = /*outputStr*/ ctx[2];
    			add_location(textarea1, file$2, 149, 12, 4385);
    			add_location(br, file$2, 150, 12, 4486);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "bf-output-print-hex");
    			add_location(input, file$2, 151, 12, 4504);
    			attr_dev(label, "for", "bf-output-print-hex");
    			add_location(label, file$2, 151, 84, 4576);
    			attr_dev(div1, "id", "bf-interface-output-area");
    			add_location(div1, file$2, 147, 8, 4315);
    			attr_dev(div2, "id", "bf-interface-errors");
    			add_location(div2, file$2, 153, 8, 4655);
    			attr_dev(section0, "class", "bf-interface-io svelte-wkoo8r");
    			add_location(section0, file$2, 142, 4, 4114);
    			attr_dev(ul, "class", "presets svelte-wkoo8r");
    			add_location(ul, file$2, 161, 12, 4925);
    			attr_dev(div3, "id", "bf-interface-presets");
    			add_location(div3, file$2, 160, 8, 4880);
    			attr_dev(section1, "class", "bf-interface-preset svelte-wkoo8r");
    			add_location(section1, file$2, 159, 4, 4833);
    			attr_dev(div4, "id", "bf-interface");
    			attr_dev(div4, "class", "svelte-wkoo8r");
    			add_location(div4, file$2, 125, 0, 3375);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			mount_component(bfprograminputbox, div4, null);
    			append_dev(div4, t0);
    			append_dev(div4, button0);
    			append_dev(div4, t2);
    			append_dev(div4, button1);
    			append_dev(div4, t4);
    			mount_component(bfmachinestate, div4, null);
    			append_dev(div4, t5);
    			append_dev(div4, section0);
    			append_dev(section0, div0);
    			append_dev(div0, t6);
    			append_dev(div0, textarea0);
    			set_input_value(textarea0, /*inputStr*/ ctx[1]);
    			append_dev(section0, t7);
    			append_dev(section0, div1);
    			append_dev(div1, t8);
    			append_dev(div1, textarea1);
    			append_dev(div1, t9);
    			append_dev(div1, br);
    			append_dev(div1, t10);
    			append_dev(div1, input);
    			input.checked = /*showDec*/ ctx[3];
    			append_dev(div1, label);
    			append_dev(section0, t12);
    			append_dev(section0, div2);
    			if (if_block) if_block.m(div2, null);
    			append_dev(div4, t13);
    			append_dev(div4, section1);
    			append_dev(section1, div3);
    			append_dev(div3, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*run*/ ctx[10], false, false, false),
    					listen_dev(button1, "click", /*reset*/ ctx[12], false, false, false),
    					listen_dev(textarea0, "input", /*textarea0_input_handler*/ ctx[16]),
    					listen_dev(input, "change", /*input_change_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const bfprograminputbox_changes = {};
    			if (dirty & /*programStr*/ 16) bfprograminputbox_changes.inputText = /*programStr*/ ctx[4];
    			if (dirty & /*paused*/ 128) bfprograminputbox_changes.isRunning = !/*paused*/ ctx[7];
    			if (dirty & /*programIndex*/ 64) bfprograminputbox_changes.curIndex = /*programIndex*/ ctx[6];
    			bfprograminputbox.$set(bfprograminputbox_changes);
    			const bfmachinestate_changes = {};
    			if (dirty & /*tapes*/ 256) bfmachinestate_changes.tapes = /*tapes*/ ctx[8];
    			if (dirty & /*tapeIndex*/ 512) bfmachinestate_changes.tapeIndex = /*tapeIndex*/ ctx[9];
    			bfmachinestate.$set(bfmachinestate_changes);

    			if (dirty & /*inputStr*/ 2) {
    				set_input_value(textarea0, /*inputStr*/ ctx[1]);
    			}

    			if (!current || dirty & /*outputStr*/ 4) {
    				prop_dev(textarea1, "value", /*outputStr*/ ctx[2]);
    			}

    			if (dirty & /*showDec*/ 8) {
    				input.checked = /*showDec*/ ctx[3];
    			}

    			if (/*errorStr*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*runPresets, presets*/ 2049) {
    				each_value = /*presets*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bfprograminputbox.$$.fragment, local);
    			transition_in(bfmachinestate.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bfprograminputbox.$$.fragment, local);
    			transition_out(bfmachinestate.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(bfprograminputbox);
    			destroy_component(bfmachinestate);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const outputPlaceholder = "(stream output shows here)";

    // let tickCount = 0;
    const STEP_INTERVAL_MS = 125;

    // $: programIndex = !paused && machineInstance ? machineInstance.get_index() : 0;
    function sleep(ms) {
    	return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isU8(ch) {
    	return !isNaN(ch) && !isNaN(parseFloat(ch)) && parseInt(ch) >= 0 && parseInt(ch) < 256;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("BfInterface", slots, []);
    	let { state } = $$props;
    	let { program } = $$props;
    	let { newState } = $$props;
    	let { presets } = $$props;
    	let inputStr = "";
    	let outputStr = outputPlaceholder;
    	let showDec = false;
    	let programStr = "";
    	let machineInstance = {};
    	let errorStr = "";
    	let programIndex = 0;
    	let paused = true;

    	function pushInput(machine) {
    		let splitted = inputStr.split(/[\s,]+/);
    		console.log(splitted);

    		if (!splitted.every(n => isU8(n))) {
    			return false;
    		}

    		machine.push_input(splitted.map(n => parseInt(n)));
    		return true;
    	}

    	async function step() {
    		try {
    			machineInstance.step(state);
    			$$invalidate(2, outputStr = showDec ? state.output_dec() : state.output());
    			$$invalidate(5, errorStr = "");
    			$$invalidate(13, state);
    			$$invalidate(6, programIndex = machineInstance.get_index());
    			await sleep(STEP_INTERVAL_MS);
    		} catch(ex) {
    			console.error(ex);
    			$$invalidate(5, errorStr = ex.toString());
    		}
    	}

    	async function run() {
    		if (!programStr) {
    			$$invalidate(5, errorStr = "The program is empty!");
    			return;
    		}

    		try {
    			$$invalidate(7, paused = false);
    			$$invalidate(13, state = newState());
    			machineInstance = program.parse(programStr);
    			console.log(typeof machineInstance, machineInstance);

    			if (machineInstance.needs_input()) {
    				if (!inputStr) {
    					throw new Error("The input is empty!");
    				}

    				if (!pushInput(state)) {
    					throw new Error("Invalid input: should be a space/comma separated unsigned 8-bit integers!");
    				}
    			}

    			// push input box update first
    			$$invalidate(13, state);

    			await sleep(STEP_INTERVAL_MS);

    			while (!paused && machineInstance.can_execute(state)) {
    				await step();
    			}

    			$$invalidate(7, paused = true);
    			$$invalidate(6, programIndex = 0);
    		} catch(ex) {
    			console.error(ex);
    			$$invalidate(5, errorStr = ex.toString());
    		}
    	}

    	function runPresets(preset) {
    		if (!preset) {
    			return;
    		}

    		console.log("running preset", preset);
    		$$invalidate(4, programStr = preset.program);
    		$$invalidate(3, showDec = preset.outputAsDec);

    		if (preset.inputs) {
    			$$invalidate(1, inputStr = preset.inputs);
    		}
    	}

    	function reset() {
    		$$invalidate(7, paused = true);
    		machineInstance.reset();
    		state.reset();
    		$$invalidate(13, state);
    	}

    	const writable_props = ["state", "program", "newState", "presets"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<BfInterface> was created with unknown prop '${key}'`);
    	});

    	function textarea0_input_handler() {
    		inputStr = this.value;
    		$$invalidate(1, inputStr);
    	}

    	function input_change_handler() {
    		showDec = this.checked;
    		$$invalidate(3, showDec);
    	}

    	$$self.$$set = $$props => {
    		if ("state" in $$props) $$invalidate(13, state = $$props.state);
    		if ("program" in $$props) $$invalidate(14, program = $$props.program);
    		if ("newState" in $$props) $$invalidate(15, newState = $$props.newState);
    		if ("presets" in $$props) $$invalidate(0, presets = $$props.presets);
    	};

    	$$self.$capture_state = () => ({
    		onDestroy,
    		BfMachineState,
    		BfProgramInputBox,
    		state,
    		program,
    		newState,
    		presets,
    		inputStr,
    		outputPlaceholder,
    		outputStr,
    		showDec,
    		programStr,
    		machineInstance,
    		errorStr,
    		programIndex,
    		paused,
    		STEP_INTERVAL_MS,
    		sleep,
    		isU8,
    		pushInput,
    		step,
    		run,
    		runPresets,
    		reset,
    		tapes,
    		tapeIndex
    	});

    	$$self.$inject_state = $$props => {
    		if ("state" in $$props) $$invalidate(13, state = $$props.state);
    		if ("program" in $$props) $$invalidate(14, program = $$props.program);
    		if ("newState" in $$props) $$invalidate(15, newState = $$props.newState);
    		if ("presets" in $$props) $$invalidate(0, presets = $$props.presets);
    		if ("inputStr" in $$props) $$invalidate(1, inputStr = $$props.inputStr);
    		if ("outputStr" in $$props) $$invalidate(2, outputStr = $$props.outputStr);
    		if ("showDec" in $$props) $$invalidate(3, showDec = $$props.showDec);
    		if ("programStr" in $$props) $$invalidate(4, programStr = $$props.programStr);
    		if ("machineInstance" in $$props) machineInstance = $$props.machineInstance;
    		if ("errorStr" in $$props) $$invalidate(5, errorStr = $$props.errorStr);
    		if ("programIndex" in $$props) $$invalidate(6, programIndex = $$props.programIndex);
    		if ("paused" in $$props) $$invalidate(7, paused = $$props.paused);
    		if ("tapes" in $$props) $$invalidate(8, tapes = $$props.tapes);
    		if ("tapeIndex" in $$props) $$invalidate(9, tapeIndex = $$props.tapeIndex);
    	};

    	let tapes;
    	let tapeIndex;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*state*/ 8192) {
    			 $$invalidate(8, tapes = state.get_display_tapes(32));
    		}

    		if ($$self.$$.dirty & /*state*/ 8192) {
    			 $$invalidate(9, tapeIndex = state.get_index());
    		}
    	};

    	return [
    		presets,
    		inputStr,
    		outputStr,
    		showDec,
    		programStr,
    		errorStr,
    		programIndex,
    		paused,
    		tapes,
    		tapeIndex,
    		run,
    		runPresets,
    		reset,
    		state,
    		program,
    		newState,
    		textarea0_input_handler,
    		input_change_handler
    	];
    }

    class BfInterface extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			state: 13,
    			program: 14,
    			newState: 15,
    			presets: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BfInterface",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*state*/ ctx[13] === undefined && !("state" in props)) {
    			console_1.warn("<BfInterface> was created without expected prop 'state'");
    		}

    		if (/*program*/ ctx[14] === undefined && !("program" in props)) {
    			console_1.warn("<BfInterface> was created without expected prop 'program'");
    		}

    		if (/*newState*/ ctx[15] === undefined && !("newState" in props)) {
    			console_1.warn("<BfInterface> was created without expected prop 'newState'");
    		}

    		if (/*presets*/ ctx[0] === undefined && !("presets" in props)) {
    			console_1.warn("<BfInterface> was created without expected prop 'presets'");
    		}
    	}

    	get state() {
    		throw new Error_1("<BfInterface>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error_1("<BfInterface>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get program() {
    		throw new Error_1("<BfInterface>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set program(value) {
    		throw new Error_1("<BfInterface>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get newState() {
    		throw new Error_1("<BfInterface>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set newState(value) {
    		throw new Error_1("<BfInterface>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get presets() {
    		throw new Error_1("<BfInterface>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set presets(value) {
    		throw new Error_1("<BfInterface>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.29.0 */
    const file$3 = "src\\App.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let t4;
    	let a;
    	let t6;
    	let t7;
    	let bfinterface;
    	let current;

    	bfinterface = new BfInterface({
    			props: {
    				state: /*state*/ ctx[0],
    				program: /*program*/ ctx[1],
    				newState: /*newState*/ ctx[2],
    				presets: /*presets*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "brainf-wasm";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "A BrainF*ck Interpreter compiled into WASM loaded on Svelte";
    			t3 = space();
    			p1 = element("p");
    			t4 = text("Visit the ");
    			a = element("a");
    			a.textContent = "Svelte tutorial";
    			t6 = text(" to learn how to build Svelte apps.");
    			t7 = space();
    			create_component(bfinterface.$$.fragment);
    			attr_dev(h1, "class", "svelte-1vzax5j");
    			add_location(h1, file$3, 9, 1, 169);
    			add_location(p0, file$3, 10, 1, 192);
    			attr_dev(a, "href", "https://svelte.dev/tutorial");
    			add_location(a, file$3, 11, 14, 274);
    			add_location(p1, file$3, 11, 1, 261);
    			attr_dev(main, "class", "svelte-1vzax5j");
    			add_location(main, file$3, 8, 0, 160);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, p0);
    			append_dev(main, t3);
    			append_dev(main, p1);
    			append_dev(p1, t4);
    			append_dev(p1, a);
    			append_dev(p1, t6);
    			append_dev(main, t7);
    			mount_component(bfinterface, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const bfinterface_changes = {};
    			if (dirty & /*state*/ 1) bfinterface_changes.state = /*state*/ ctx[0];
    			if (dirty & /*program*/ 2) bfinterface_changes.program = /*program*/ ctx[1];
    			if (dirty & /*newState*/ 4) bfinterface_changes.newState = /*newState*/ ctx[2];
    			if (dirty & /*presets*/ 8) bfinterface_changes.presets = /*presets*/ ctx[3];
    			bfinterface.$set(bfinterface_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bfinterface.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bfinterface.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(bfinterface);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let { state } = $$props;
    	let { program } = $$props;
    	let { newState } = $$props;
    	let { presets } = $$props;
    	const writable_props = ["state", "program", "newState", "presets"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("state" in $$props) $$invalidate(0, state = $$props.state);
    		if ("program" in $$props) $$invalidate(1, program = $$props.program);
    		if ("newState" in $$props) $$invalidate(2, newState = $$props.newState);
    		if ("presets" in $$props) $$invalidate(3, presets = $$props.presets);
    	};

    	$$self.$capture_state = () => ({
    		BfInterface,
    		state,
    		program,
    		newState,
    		presets
    	});

    	$$self.$inject_state = $$props => {
    		if ("state" in $$props) $$invalidate(0, state = $$props.state);
    		if ("program" in $$props) $$invalidate(1, program = $$props.program);
    		if ("newState" in $$props) $$invalidate(2, newState = $$props.newState);
    		if ("presets" in $$props) $$invalidate(3, presets = $$props.presets);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [state, program, newState, presets];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			state: 0,
    			program: 1,
    			newState: 2,
    			presets: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*state*/ ctx[0] === undefined && !("state" in props)) {
    			console.warn("<App> was created without expected prop 'state'");
    		}

    		if (/*program*/ ctx[1] === undefined && !("program" in props)) {
    			console.warn("<App> was created without expected prop 'program'");
    		}

    		if (/*newState*/ ctx[2] === undefined && !("newState" in props)) {
    			console.warn("<App> was created without expected prop 'newState'");
    		}

    		if (/*presets*/ ctx[3] === undefined && !("presets" in props)) {
    			console.warn("<App> was created without expected prop 'presets'");
    		}
    	}

    	get state() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get program() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set program(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get newState() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set newState(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get presets() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set presets(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    let wasm;

    let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

    cachedTextDecoder.decode();

    let cachegetUint8Memory0 = null;
    function getUint8Memory0() {
        if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
            cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachegetUint8Memory0;
    }

    function getStringFromWasm0(ptr, len) {
        return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
    }

    const heap = new Array(32).fill(undefined);

    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');

        heap[idx] = obj;
        return idx;
    }

    function getObject(idx) { return heap[idx]; }

    function dropObject(idx) {
        if (idx < 36) return;
        heap[idx] = heap_next;
        heap_next = idx;
    }

    function takeObject(idx) {
        const ret = getObject(idx);
        dropObject(idx);
        return ret;
    }

    let cachegetInt32Memory0 = null;
    function getInt32Memory0() {
        if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
            cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
        }
        return cachegetInt32Memory0;
    }
    /**
    * @returns {string}
    */
    function greet() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.greet(retptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }

    function _assertNum(n) {
        if (typeof(n) !== 'number') throw new Error('expected a number argument');
    }

    let WASM_VECTOR_LEN = 0;

    function passArray8ToWasm0(arg, malloc) {
        const ptr = malloc(arg.length * 1);
        getUint8Memory0().set(arg, ptr / 1);
        WASM_VECTOR_LEN = arg.length;
        return ptr;
    }

    function getArrayU8FromWasm0(ptr, len) {
        return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
    }

    let cachedTextEncoder = new TextEncoder('utf-8');

    const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
        ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
    }
        : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    });

    function passStringToWasm0(arg, malloc, realloc) {

        if (typeof(arg) !== 'string') throw new Error('expected a string argument');

        if (realloc === undefined) {
            const buf = cachedTextEncoder.encode(arg);
            const ptr = malloc(buf.length);
            getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        }

        let len = arg.length;
        let ptr = malloc(len);

        const mem = getUint8Memory0();

        let offset = 0;

        for (; offset < len; offset++) {
            const code = arg.charCodeAt(offset);
            if (code > 0x7F) break;
            mem[ptr + offset] = code;
        }

        if (offset !== len) {
            if (offset !== 0) {
                arg = arg.slice(offset);
            }
            ptr = realloc(ptr, len, len = offset + arg.length * 3);
            const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
            const ret = encodeString(arg, view);
            if (ret.read !== arg.length) throw new Error('failed to pass whole string');
            offset += ret.written;
        }

        WASM_VECTOR_LEN = offset;
        return ptr;
    }

    function _assertClass(instance, klass) {
        if (!(instance instanceof klass)) {
            throw new Error(`expected instance of ${klass.name}`);
        }
        return instance.ptr;
    }

    function logError(f) {
        return function () {
            try {
                return f.apply(this, arguments);

            } catch (e) {
                let error = (function () {
                    try {
                        return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
                    } catch(_) {
                        return "<failed to stringify thrown value>";
                    }
                }());
                console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
                throw e;
            }
        };
    }
    /**
    */
    class BfMachineState$1 {

        constructor() {
            throw new Error('cannot invoke `new` directly');
        }

        static __wrap(ptr) {
            const obj = Object.create(BfMachineState$1.prototype);
            obj.ptr = ptr;

            return obj;
        }

        __destroy_into_raw() {
            const ptr = this.ptr;
            this.ptr = 0;

            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_bfmachinestate_free(ptr);
        }
        /**
        * @returns {BfMachineState}
        */
        static new() {
            var ret = wasm.bfmachinestate_new();
            return BfMachineState$1.__wrap(ret);
        }
        /**
        */
        reset() {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            wasm.bfmachinestate_reset(this.ptr);
        }
        /**
        * @returns {string}
        */
        output() {
            try {
                if (this.ptr == 0) throw new Error('Attempt to use a moved value');
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                _assertNum(this.ptr);
                wasm.bfmachinestate_output(retptr, this.ptr);
                var r0 = getInt32Memory0()[retptr / 4 + 0];
                var r1 = getInt32Memory0()[retptr / 4 + 1];
                return getStringFromWasm0(r0, r1);
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
                wasm.__wbindgen_free(r0, r1);
            }
        }
        /**
        * @returns {string}
        */
        output_dec() {
            try {
                if (this.ptr == 0) throw new Error('Attempt to use a moved value');
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                _assertNum(this.ptr);
                wasm.bfmachinestate_output_dec(retptr, this.ptr);
                var r0 = getInt32Memory0()[retptr / 4 + 0];
                var r1 = getInt32Memory0()[retptr / 4 + 1];
                return getStringFromWasm0(r0, r1);
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
                wasm.__wbindgen_free(r0, r1);
            }
        }
        /**
        * @returns {number}
        */
        get_index() {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            var ret = wasm.bfmachinestate_get_index(this.ptr);
            return ret >>> 0;
        }
        /**
        * @param {Uint8Array} inputs
        */
        push_input(inputs) {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            var ptr0 = passArray8ToWasm0(inputs, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.bfmachinestate_push_input(this.ptr, ptr0, len0);
        }
        /**
        * @returns {number | undefined}
        */
        get_input() {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            var ret = wasm.bfmachinestate_get_input(this.ptr);
            return ret === 0xFFFFFF ? undefined : ret;
        }
        /**
        * @returns {number | undefined}
        */
        log_input() {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            var ret = wasm.bfmachinestate_log_input(this.ptr);
            return ret === 0xFFFFFF ? undefined : ret;
        }
        /**
        * @param {number} i
        * @returns {number | undefined}
        */
        get_tape_value(i) {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            _assertNum(i);
            var ret = wasm.bfmachinestate_get_tape_value(this.ptr, i);
            return ret === 0xFFFFFF ? undefined : ret;
        }
        /**
        * @param {number} i
        * @returns {Uint8Array}
        */
        get_display_tapes(i) {
            try {
                if (this.ptr == 0) throw new Error('Attempt to use a moved value');
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                _assertNum(this.ptr);
                _assertNum(i);
                wasm.bfmachinestate_get_display_tapes(retptr, this.ptr, i);
                var r0 = getInt32Memory0()[retptr / 4 + 0];
                var r1 = getInt32Memory0()[retptr / 4 + 1];
                var v0 = getArrayU8FromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
                return v0;
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
            }
        }
    }
    /**
    */
    class BfProgram {

        constructor() {
            throw new Error('cannot invoke `new` directly');
        }

        static __wrap(ptr) {
            const obj = Object.create(BfProgram.prototype);
            obj.ptr = ptr;

            return obj;
        }

        __destroy_into_raw() {
            const ptr = this.ptr;
            this.ptr = 0;

            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_bfprogram_free(ptr);
        }
        /**
        * @param {string} prg
        * @returns {BfProgram}
        */
        static parse(prg) {
            var ptr0 = passStringToWasm0(prg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            var ret = wasm.bfprogram_parse(ptr0, len0);
            return BfProgram.__wrap(ret);
        }
        /**
        * @param {BfMachineState} state
        */
        step(state) {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            _assertClass(state, BfMachineState$1);
            if (state.ptr === 0) {
                throw new Error('Attempt to use a moved value');
            }
            wasm.bfprogram_step(this.ptr, state.ptr);
        }
        /**
        * @param {BfMachineState} state
        */
        execute(state) {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            _assertClass(state, BfMachineState$1);
            if (state.ptr === 0) {
                throw new Error('Attempt to use a moved value');
            }
            wasm.bfprogram_execute(this.ptr, state.ptr);
        }
        /**
        */
        reset() {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            wasm.bfprogram_reset(this.ptr);
        }
        /**
        * @returns {boolean}
        */
        needs_input() {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            var ret = wasm.bfprogram_needs_input(this.ptr);
            return ret !== 0;
        }
        /**
        * @returns {number}
        */
        get_index() {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            var ret = wasm.bfprogram_get_index(this.ptr);
            return ret >>> 0;
        }
        /**
        * @param {BfMachineState} state
        * @returns {boolean}
        */
        can_execute(state) {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            _assertClass(state, BfMachineState$1);
            if (state.ptr === 0) {
                throw new Error('Attempt to use a moved value');
            }
            var ret = wasm.bfprogram_can_execute(this.ptr, state.ptr);
            return ret !== 0;
        }
    }

    async function load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);

                } catch (e) {
                    if (module.headers.get('Content-Type') != 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else {
                        throw e;
                    }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);

        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };

            } else {
                return instance;
            }
        }
    }

    async function init$1(input) {
        if (typeof input === 'undefined') {
            input = new URL('index_bg.wasm', (document.currentScript && document.currentScript.src || new URL('bundle.js', document.baseURI).href));
        }
        const imports = {};
        imports.wbg = {};
        imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
            var ret = getStringFromWasm0(arg0, arg1);
            return addHeapObject(ret);
        };
        imports.wbg.__wbg_error_4bb6c2a97407129a = logError(function(arg0, arg1) {
            try {
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(arg0, arg1);
            }
        });
        imports.wbg.__wbg_new_59cb74e423758ede = logError(function() {
            var ret = new Error();
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_stack_558ba5917b466edd = logError(function(arg0, arg1) {
            var ret = getObject(arg1).stack;
            var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        });
        imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
            takeObject(arg0);
        };
        imports.wbg.__wbg_log_386a8115a84a780d = logError(function(arg0) {
            console.log(getObject(arg0));
        });
        imports.wbg.__wbindgen_throw = function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        };
        imports.wbg.__wbindgen_rethrow = function(arg0) {
            throw takeObject(arg0);
        };

        if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
            input = fetch(input);
        }



        const { instance, module } = await load(await input, imports);

        wasm = instance.exports;
        init$1.__wbindgen_wasm_module = module;

        return wasm;
    }

    var exports$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        greet: greet,
        BfMachineState: BfMachineState$1,
        BfProgram: BfProgram,
        'default': init$1
    });

    var wasm$1 = async () => {
                            await init$1("/build/assets/svelte-wasm-brainf-greeting-b153993d.wasm");
                            return exports$1;
                        };

    const presets = [
        {
            name: "print-zero",
            description: "Print \'0\'",
            program: "++++++++[>++++++<-]>.",
            inputs: "",
            outputAsDec: false,
        },
        {
            name: "hello-world",
            description: "Hello World!",
            program: "++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++.>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.>.",
            inputs: "",
            outputAsDec: false,
        },
        {
            name: "sum-to-n",
            description: "Sum 1 to n (n < 23)",
            program: ",[[>+>+<<-]>-[<+>-]<]>>.",
            inputs: "5",
            outputAsDec: true,
        },

    ];

    const init$2 = async() => {
    	const greet = await wasm$1();

    	console.log(greet);
    	const bfState = greet.BfMachineState;
    	const initialState = bfState.new();
    	const app = new App({
    		target: document.body,
    		props: {
    			newState: bfState.new,
    			state: initialState,
    			program: greet.BfProgram,
    			presets: presets,
    		}
    	});
    };

    init$2();

}());
//# sourceMappingURL=bundle.js.map
