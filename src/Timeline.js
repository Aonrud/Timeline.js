/**
 * @module Timeline
 */
import {defaultDiagramConfig, Diagram} from './Diagram.js';
import {applyConfig} from './util.js';

/**
 * The default configuration object for the Timeline
 */
const defaultTimelineConfig = {
	panzoom: null,
	findForm: "timeline-find",
	zoomIn: "timeline-zoom-in",
	zoomOut: "timeline-zoom-out",
	zoomReset: "timeline-zoom-reset"
}

/**
 * The class representing the Timeline.  This is the point of access to this tool.
 * The simplest usage is to instantiate a new Timeline object, and then call the create() method.
 * @alias Timeline
 */
class Timeline {
	/**
	 * @param {string} [container = diagram] - The ID of the container element for the timeline.
	 * @param {object} [config] - All config for the timeline
	 * @param {(function|null)} [config.panzoom = null] - The Panzoom function to enable panning and zooming, or null to disable
	 * @param {string} [config.findForm = timeline-find] - The ID of the find form
	 * @param {string} [config.zoomIn = timeline-zoom-in] - The ID of the button to zoom in
	 * @param {string} [config.zoomOut = timeline-zoom-out] - The ID of the button to zoom out
	 * @param {string} [config.zoomReset = timeline-zoom-reset] - The ID of the button to reset the zoom level
	 * @param {number} [config.yearStart = 1900] - the starting year for the timeline
	 * @param {number} [config.yearEnd = Current year + 1] - the end year for the timeline
	 * @param {number} [config.strokeWidth = 4] - the width in px of the joining lines
	 * @param {number} [config.yearWidth = 50] - the width in px of diagram used for each year
	 * @param {number} [config.rowHeight = 50] - the height in px of each diagram row
	 * @param {number} [config.padding = 5] - the padding in px between rows
	 * @param {number} [config.boxWidth = 100] - the width in px of each entry
	 * @param {boolean} [config.guides = true] - whether to draw striped guides at regular intervals in the timeline
	 * @param {number} [config.guideInterval = 5] - the interval in years between guides (ignored if 'guides' is false)
	 * @param {string} [config.entrySelector = div] - the CSS selector used for entries
	 * @param {object[]} [entries = []] - The Timeline entries as an array of objects
	 * @param {object[]} [events = []] - Events as an array of objects
	 */
	constructor(container = "diagram", config = {}, entries = [], events = []) {
		this._container = container;
		this._setConfig(config);
		
		for (const entry of entries) {
			this.addEntry(entry);
		}
		for (const event of events) {
			this.addEvent(event);
		}
	}
	
	/**
	 * Create the Timeline. This should be called after instantiation.
	 * @public
	 */
	create() {
		const d = new Diagram(this._container, this._diagramConfig);
		this._diagram = d.create();

		if (typeof this._config.panzoom === "function") {
			this._initPanzoom();
			this._initControls();
			window.addEventListener('hashchange', (e) => this._hashHandler(e));
		}
		if (location.hash) {
			setTimeout(() => {
				this._hashHandler();
			});
		}
	}
	
	/**
	 * Take the provided config, separate config for the Diagram drawing class, and add in defaults for undefined properties.
	 * @protected
	 * @param {object} config
	 */
	_setConfig(config) {
		this._config = applyConfig(defaultTimelineConfig, config);
		this._diagramConfig = applyConfig(defaultDiagramConfig, config);
	}
	
	/**
	 * Add a single entry from an object.
	 * @protected
	 * @param {object} data
	 */
	addEntry(data) {
		if (document.getElementById(data.id)) {
			console.warn(`Invalid entry: ${data.id} already exists.`);
			return;
		}
		if (![ "id", "name", "start" ].every((i) => Object.hasOwn(data, i))) {
			console.warn(`Invalid entry: ${JSON.stringify(data)}. Entries must have at least id, name and start values.`);
			return;
		}
		
		const entry = document.createElement("div");
		entry.id = data.id;
		entry.innerText = data.name;
		for (const k of Object.keys(data)) {
			if (["id", "name"].includes(k)) continue;
			entry.dataset[k] = data[k];
		}
		document.getElementById(this._container).append(entry);
	}
	
	/**
	 * Add a single event from an object.
	 * @protected
	 * @param {object} data
	 */
	addEvent(data) {
		if (!data.year || ! data.content) {
			console.warn(`Invalid event: ${JSON.stringify(data)}. Events must have at least a year and content property.`);
			return;
		}
		
		const event = document.createElement("div");
		event.classList.add("event");
		event.innerText = data.content;
		for (const k of Object.keys(data)) {
			if (k == "content") continue;
			event.dataset[k] = data[k];
		}
		document.getElementById(this._container).append(event);
	}
	
	/**
	 * If Panzoom is enabled, pan to the element with the given ID, and reset the zoom.
	 * @public
	 * @param {string} id - The ID of a timeline entry
	 * @fires Timeline#timelineFind
	 */
	panToEntry(id) {
		if (typeof this._pz === "undefined") {
			throw new Error("Panzoom module missing. Include Panzoom to use the pan-to-entry feature.");
		}
		
		const target = document.getElementById(id);
		const x = window.innerWidth/2 - parseInt(target.style.left) - this._diagramConfig.boxWidth/2;
		const y = window.innerHeight/2 - parseInt(target.style.top) - this._diagramConfig.rowHeight/2;
				
		this._pz.zoom(1);
		this._pz.pan(x, y);
		
		const tlFind = new CustomEvent('timelineFind', { detail: { id: id, name: target.innerText } });
		document.getElementById(this._container).dispatchEvent(tlFind);
		
		setTimeout( () => { target.classList.add("highlight", "hover") }, 500);	
		setTimeout( () => { target.classList.remove("highlight", "hover") }, 2000);
	}
	
	/**
	 * The timelineFind event is fired when panToEntry() is called. (Only applicable if Panzoom is enabled).
	 * @event Timeline#timelineFind
	 * @type {object}
	 * @public
	 * @property {object} details
	 * @property {string} details.id - the ID of the entry
	 * @property {string} details.name - the name of the entry
	 */
	
	/**
	 * Bind the zoom controls to the configured element IDs, if present in the document.
	 * Prepare empty container for entry filter if find form is present.
	 * @protected
	 */
	_initControls() {
		const zoomIn = document.getElementById(this._config.zoomIn);
		const zoomOut = document.getElementById(this._config.zoomOut);
		const reset = document.getElementById(this._config.zoomReset);
		const find = document.getElementById(this._config.findForm);
		
		if(zoomIn) { zoomIn.addEventListener("click", this._pz.zoomIn) }
		if(zoomOut) { zoomOut.addEventListener("click", this._pz.zoomOut) }
		if(reset) { reset.addEventListener("click", () => this._pz.zoom(1)) }
		if(find) {
			this._initFindForm(find);
		}
	}
	
	/**
	 * Set up the find form
	 * @protected
	 */
	_initFindForm(form) {
		//Add the ID input
		const idInput = document.createElement("input");
		idInput.name = "find-id";
		idInput.style.display = "none";
		form.append(idInput);
		
		//Add the wrappers and container for the filtering results
		const finder = form.querySelector("input[name=finder]");
		const wrap = document.createElement("div");
		const inner = document.createElement("div");
		const results = document.createElement("ul");
		wrap.classList.add("filtered-entries");
		wrap.appendChild(inner);
		inner.appendChild(results);
		finder.parentNode.insertBefore(wrap, finder);
		wrap.appendChild(finder);
		
		//Get rid of browser suggestions
		finder.autocomplete = "off";
		
		//Set results container width to match the input
		inner.style.width = finder.offsetWidth + "px";
		
		//Set config for convenience of other methods
		const findConfig = {
			form: form,
			finder: finder,
			id: idInput,
			results: results
			
		}
		this._findConfig = findConfig;
		
		//Stop refresh keeping a previous value (which won't be valid without corresponding ID)
		findConfig.finder.value = "";
		
		form.addEventListener('input', (e) => this._showEntryOptions(e));
		form.addEventListener('submit', (e) => this._findSubmit(e))
		results.addEventListener('click', (e) => this._selectFilteredEntry(e) );
	}
	
	/**
	 * Add entries to the "#filtered-entries", filtered by the value of the event-triggering input.
	 * @protected
	 * @param {object} e
	 */
	_showEntryOptions(e) {
		const val = e.target.value;
		if (val.trim() === "") {
			this._findConfig.results.innerHTML = "";
			return null;
		}
		
		const filtered = this._filterEntries(val);
		const results = this._findConfig.results;
		results.innerHTML = "";
		
		for (const entry of filtered) {
			const item = document.createElement("li");
			item.dataset.id = entry.id;
			item.innerText = entry.name;
			results.append(item);
		}
	}
	
	/**
	 * Filter the list of entries to match the provided search string.
	 * @protected
	 * @param {string} search
	 * @return {array}
	 */
	_filterEntries(search) {
		const filtered = [...document.querySelectorAll(".entry")]
		.map(entry => {
			return { "id": entry.id, "name": entry.innerText }
		})
		.filter(entry => {
			return entry.name.toLowerCase().includes(search.toLowerCase());
		});
		return filtered;
	}
	
	/**
	 * Submit the clicked entry in the filtered list.
	 * @protected
	 * @param {object} e
	 */
	_selectFilteredEntry(e) {
		if(e.target.localName !== "li") return null;
		
		const form = this._findConfig.form;
		const finder = this._findConfig.finder;
		const id = this._findConfig.id;
		
		finder.value = e.target.innerText;
		id.value = e.target.dataset.id;
		
		form.requestSubmit();
	}
	
	/**
	 * The submit action of the find form.
	 * Pan to the entry with submitted ID, if it exists.
	 * @protected
	 * @param {object} e
	 * @fires Timeline#timelineFind
	 */
	_findSubmit(e) {
		e.preventDefault();
		
		const find = e.target.querySelector("input[name=find-id]").value;
		
		if(document.getElementById(find)) this.panToEntry(find);

		this._findConfig.results.innerHTML = "";
		this._findConfig.finder.value = "";
	}
	
	/** 
	 * Initialised Panzoom on the diagram.
	 * @protected
	 */
	_initPanzoom() {
		const wrap = document.createElement("div");
		wrap.classList.add("pz-wrap");
		this._diagram.parentNode.insertBefore(wrap, this._diagram);
		wrap.appendChild(this._diagram);
		
		this._pz = this._config.panzoom(this._diagram, {
			contain: 'outside',
			maxScale: 3,
			minScale: 0.5,
			step: 0.1,
			
			//This option removes the default 'stopPropagation', which blocks touch events on clickable nodes.
			handleStartEvent: (event) => {
				event.preventDefault()
			}
		});
		this._diagram.parentElement.addEventListener('wheel', this._pz.zoomWithWheel);
	}
	
	/**
	 * Handle URL hash. Hash of format '#find-{ID}' will pan to the given entry ID, if it exists.
	 * @protected
	 * @param {object} e
	 */
	_hashHandler() {
		const id = location.hash.replace('#find-', '');
		if(document.getElementById(id) && this._pz) this.panToEntry(id);
	}
}

export default Timeline;

