import SvgConnector from './SvgConnector.js';
import DiagramPositioner from './DiagramPositioner.js';
import {applyConfig} from './util.js';

/**
 * The default configuration object for the Diagram class
 */
const defaultDiagramConfig = {
	yearStart: 1900,
	yearEnd: new Date().getFullYear() + 1,
	strokeWidth: 4,
	yearWidth: 50,
	rowHeight: 50,
	padding: 5,
	boxWidth: 100,
	guides: true,
	guideInterval: 5,
	entrySelector: "div",
	linkDashes: "4",
	irregularDashes: "88 4 4 4"
}

/**
 * Class representing the timeline diagram drawing area. This is used by the main Timeline class.
 * The diagram is drawn by instanciating this class and calling create() on the instance.
 */
class Diagram {
	
	/**
	 * Create a diagram.
	 * @param {string} container - The ID of the container element for the diagram.
	 * @param {object} config - Configuration object for the diagram. Entirely optional.
	 * @param {number} [config.yearStart = 1900] - the starting year for the timeline
	 * @param {number} [config.yearEnd = Current year + 1] - the end year for the timeline
	 * @param {number} [config.strokeWidth = 4] - the width in px of the joining lines
	 * @param {number} [config.yearWidth = 50] - the width in px of diagram used to for each year
	 * @param {number} [config.rowHeight = 50] - the height in px of each diagram row
	 * @param {number} [config.padding = 5] - the padding in px between rows
	 * @param {number} [config.boxWidth = 100] - the width in px of each entry
	 * @param {boolean} [config.guides = true] - whether to draw striped guides at regular intervals in the timeline
	 * @param {number} [config.guideInterval = 5] - the interval in years between guides (ignored if 'guides' is false)
	 * @param {string} [config.entrySelector = "div"] - the CSS selector to match entries
	 * @param {string} [config.linkDashes = "4"] - The svg dasharray for link lines.
	 * 								Must be a valid dasharray. See <https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray>
	 * @param {string} [config.irregularDashes = "20 2"] - The svg dasharray for entries marked as 'irregular' with the data-irregular attribute.
	 * 								Must be a valid dasharray. See <https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray>
	 */
	constructor(container, config = {}) {		
		this._config = this._makeConfig(config);
		this._applyCSSProperties();
		this._container = document.getElementById(container);
		this._entries = document.querySelectorAll("#" + container + " > " + this._config.entrySelector+":not(.timeline-exclude):not(.event)");
		this._events = this._container.querySelectorAll(".event");
	}
	
	/**
	 * Take the given config, apply defaults and return final config object.
	 * @protected
	 * @param {object} config
	 * @return {object}
	 */
	_makeConfig(config) {
		const c = applyConfig(defaultDiagramConfig, config);
		//Derived settings for convenience
		c.boxHeight = c.rowHeight - c.padding*2;
		c.boxMinWidth = c.boxHeight;
		return c;
	}
	
		
	/**
	 * Set a single config property.
	 * @protected
	 * @param {string} prop
	 * @param {string} value
	 */
	_setConfigProp(prop, value) {
		this._config[prop] = value;
	}
	
	/** Create the timeline.
	 * This should be called after creating a class instance.
	 */
	create() {
		this._setup();
		this._draw();
		this._addDates();
		if (this._config.guides === true) {
			this._addGuides();
		}
		return this._container;
	}
	
	/** Setup necessary CSS classes and data for entries.
	 * @protected
	 */
	_setup() {
		this._prepareEntries();
		this._prepareRows();
		
		//Set up container
		this._container.classList.add("timeline-container");
		this._container.style.height = (this._config.rows + 2) * this._config.rowHeight + "px"; //Add 2 rows to total for top and bottom space
		this._container.style.width = (this._config.yearEnd + 1 - this._config.yearStart) * this._config.yearWidth + "px"; //Add 1 year for padding
	
		this._setEntries();
		this._setEvents();
	}
	
	/** Prepare all entries with initial classes and data
	 * @protected
	 */
	_prepareEntries() {
		for (const entry of this._entries) {
			entry.classList.add("entry");
			entry.dataset.end = this._calcEnd(entry);
			
			//If start is before Timeline start, then move it and add a class.
			if (parseInt(entry.dataset.start) < this._config.yearStart) {
				entry.classList.add("preexists");
				entry.dataset.start = this._config.yearStart;
			}
			
			//Validate all referenced IDs and warn if missing.
			for (const attrib of [ "become", "split", "merge", "links" ]) {
				if (Object.hasOwn(entry.dataset, attrib)) {
					for (const id of entry.dataset[attrib].split(" ")) {
						if (!document.getElementById(id)) {
							console.warn(`${entry.id}: Given ${attrib} ID "${id}" doesn't exist. Ignoring.`);
							delete entry.dataset[attrib];
						}
					}
				}
			}
		}
	}
	
	/**
	 * Set the row for all entries using automatic diagramPositioner
	 * @protected
	 */
	_prepareRows() {
		let rows = 1;
		
		//Find the highest manual row number
		for (const entry of this._entries) {
			if (parseInt(entry.dataset.row) > rows) {
				rows = parseInt(entry.dataset.row);
			}
		}

		const dp = new DiagramPositioner(this._entries, this._config.yearStart, this._config.yearEnd);
		dp.calculate();
		rows = dp.rows;
		this._setConfigProp("rows", rows);
	}
	
	/**
	 * Set styles for each entry to position them according to calculated row and entry size
	 * @protected
	 */
	_setEntries() {
		//Position entries and add additional data
		for (const entry of this._entries) {
			entry.style.left = this._yearToWidth(entry.dataset.start) + "px";
			entry.style.top = this._calcTop(entry) + "px";
			if (entry.dataset.colour) {
				entry.style.borderColor = entry.dataset.colour;
			}
			
			//Style short entries (lasting less time than the box size)
			if(this._checkSmallEntry(entry) === true) {
				entry.classList.add("min");
			}
		}
		
		//Adjust spacing for entries that overlap
		//Accommodates entries that are both the same year
		//Width needs to be known before nudging, so this has to be separated
		for (const entry of this._container.querySelectorAll(this._config.entrySelector + '[data-become]')) {
			if (entry.dataset.start == document.getElementById(entry.dataset.become).dataset.start) {
				entry.style.left = parseFloat(entry.style.left) - this._config.boxMinWidth/2 + "px";
				document.getElementById(entry.dataset.become).style.left = parseFloat(document.getElementById(entry.dataset.become).style.left) + this._config.boxMinWidth/2 + "px";
			}
		}
	}
	
	/**
	 * Set styles for each event to correctly position them.
	 * @protected
	 */
	_setEvents() {
		for (const event of this._events) {
			if (event.dataset.target && !document.getElementById(event.dataset.target)) {
				console.warn(`Event has an invalid target – skipping: ${JSON.stringify(event)}`);
				continue;
			}
			
			let top = this._config.rowHeight - event.offsetHeight;
			let left = this._yearToWidth(event.dataset.year);
			
			//If events overlap
			const yearEvents = [...this._events].filter(e => {return !e.dataset.target && e.dataset.year == event.dataset.year})
			if (yearEvents.length > 1 && yearEvents.indexOf(event) !== 0) {
				top -= event.offsetHeight * 0.5 * yearEvents.indexOf(event);
			}
			
			//Wrap content in a span for easier styling
			const span = document.createElement("span");
			span.dataset.year = event.dataset.year; //Allows using value in CSS content on span.
			span.innerText = event.innerText;
			event.innerText = "";
			event.append(span);
			
			let colour = null;
			if (event.dataset.colour) {
				colour = event.dataset.colour;
			}
			if (event.dataset.target) {
				const target = document.getElementById(event.dataset.target);
				top = this._calcTop(target) + ((this._config.boxHeight - event.offsetHeight) * 0.5);
				left = left - (event.offsetWidth * 0.5);
				if (target.dataset.colour) {
					colour = target.dataset.colour;
				}
			}
			
			if (colour) {
				const classSafe = `colour-${colour.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '')}`;
				event.classList.add(classSafe);
				let c = `.event.${classSafe}:after { color: ${colour}; border-color: ${colour} }`;
				c += `.event.${classSafe}:hover { color: ${colour} }`;
				this._addCss(c);
			}
			
			event.style.left = left + "px";
			event.style.top = top + "px";
		}
	}
	
	/**
	 * Add CSS to inserted header styles. Create the style element if not extant.
	 * @protected
	 * @param {string} css
	 */
	_addCss(css) {
		if (!document.getElementById("tl-styles")) {
			const s = document.createElement("style");
			s.id = "tl-styles";
			s.setAttribute('type', 'text/css');
			document.head.append(s);
		}
		document.getElementById("tl-styles").append(document.createTextNode(css));
	}
	
	/**
	 * Add the date timelines to top and bottom of the diagram
	 * @protected
	 */
	_addDates() {
		const tl = document.createElement("div");
		tl.classList.add("dates");
		
		let y = this._config.yearStart;
		while(y < this._config.yearEnd) {
			const d = document.createElement("date");
			d.style.left = this._yearToWidth(y) + "px";
			const t = document.createTextNode(y);
			d.append(t);
			tl.append(d);
			y = y+5;
		}
		this._container.prepend(tl);
		
		const tl2 = tl.cloneNode(true);
		tl2.style.top = (this._config.rows) * this._config.rowHeight + "px";
		this._container.append(tl2);
	}
	
	/**
	 * Add striped guides to the diagram.
	 * @protected
	 */
	_addGuides() {
		let y = this._config.yearStart;

		//Round the end up to the nearest multiple of guideInterval to ensure last guide is placed.
		while(y < Math.ceil(this._config.yearEnd/this._config.guideInterval)*this._config.guideInterval) {
			const guide = document.createElement("div");
			guide.classList.add("guide");
			guide.style.left = this._yearToWidth(y) + "px";
			guide.style.width = this._config.yearWidth * this._config.guideInterval + "px";
			
			if(((y - this._config.yearStart) / this._config.guideInterval) % 2 == 1) {
				guide.classList.add("odd");
			}
			
			this._container.append(guide);
			y = y + this._config.guideInterval;
		}
	}
		
	/** Draw all lines in the timeline between entries.
	 * @protected
	 */
	_draw() {
		for (const entry of this._entries) {
			
			const colour = (entry.dataset.colour ? entry.dataset.colour : "var(--tl-colour-stroke)");
			const dasharray = (entry.dataset.irregular == "true" ? this._config.irregularDashes : "");
			
			let endMarker = "";
			let cssClass = "end";
			let start = this._getJoinCoords(entry, "right");
			let end = {
				x: this._yearToWidth(entry.dataset.end),
				y: start.y
			};
			
			//Ends without joining another entry
			if (!Object.hasOwn(entry.dataset, "merge") &&
				!Object.hasOwn(entry.dataset, "become")
			) {
				endMarker = (entry.dataset.endEstimate ? "dots" : "circle");
			}
			
			if (Object.hasOwn(entry.dataset, "become")) { 
				end = this._getJoinCoords(document.getElementById(entry.dataset.become), 'left');
				cssClass = "become";
			}
			
			if (Object.hasOwn(entry.dataset, "merge")) {
				//Special case of one year length and then merging. We need to bump the merge eventnt forward by 1 year to meet an 'end of year' eventnt. Otherwise, it's indistinguishable from a split.
				if (entry.dataset.start == entry.dataset.end) {
					end.x += this._config.yearWidth;
				}
				
				const mergePoint = {
					x: end.x,
					y: this._getYCentre(document.getElementById(entry.dataset.merge))
				}
				
				//Merged entry's line ends a bit earlier, so as to go diagonally to meet the other entry at the year mark.
				end.x = end.x - this._config.yearWidth;
				const merge = SvgConnector.draw({ start: end, end: mergePoint, stroke: this._config.strokeWidth, colour: colour });
				merge.classList.add("merge");
				this._container.append(merge);
				cssClass = "merge";
			}
				
			//Nothing to draw here if entry starts and ends on the same year
			if (entry.dataset.start !== entry.dataset.end) {
				const line = SvgConnector.draw({ start: start, end: end, stroke: this._config.strokeWidth, colour: colour, markers: ["", endMarker], dashes: dasharray });
				line.classList.add(cssClass);
				this._container.append(line);
			}

			if (Object.hasOwn(entry.dataset, "split")) {
				this._drawSplit(entry, colour);
			}
			if (Object.hasOwn(entry.dataset, "links")) {
				this._drawLinks(entry, colour);
			}
		}
	}
	
	/**
	 * Draw splits.
	 * @protected
	 * @param {HTMLElement} entry
	 * @param {string} colour
	 */
	_drawSplit(entry, colour) {
		const source = document.getElementById(entry.dataset.split);
		
		let direction = "top";
		if (parseInt(entry.dataset.row) < parseInt(source.dataset.row)) {
			direction = "bottom";			
		}
		
		const start = {
			x: this._yearToWidth(entry.dataset.start),
			y: this._getYCentre(source)
		}
		const end = this._getJoinCoords(entry, direction);
		
		const line = SvgConnector.draw( { start: start, end: end, stroke: this._config.strokeWidth, colour: colour });
		
		line.classList.add("split");
		this._container.append(line);
	}
	
	/**
	 * Draw links.
	 * @protected
	 * @param {HTMLElement} entry
	 * @param {string} colour
	 */
	_drawLinks(entry, colour) {
		const links = entry.dataset.links.split(" ");
		
		//Count links drawn on each side, so additional ones can be offset to avoid overlap.
		let indices = {
			top: -1,
			bottom: -1,
			left: -1,
			right: -1
		}
		
		for (const link of links) {
			const target = document.getElementById(link);
			let sourceSide, targetSide, start = { x: 0, y: 0}, end = { x: 0, y: 0};
			
			const eRow = parseInt(entry.dataset.row);
			const tRow = parseInt(target.dataset.row);
						
			if (eRow === tRow) continue;
			
			//Find the direction of the link
			if (eRow === tRow && entry.dataset.start < target.dataset.start) {
				indices["right"] = indices["right"]+1;
				sourceSide = "right";
				targetSide = "left";
			}
			if (eRow === tRow && entry.dataset.start > target.dataset.start) {
				indices["left"] = indices["left"]+1;
				sourceSide = "left";
				targetSide = "right";
			}
			if (eRow > tRow) {
				indices["top"] = indices["top"]+1;
				sourceSide = "top";
				targetSide = "bottom";
			}
			if (eRow < tRow) {
				indices["bottom"] = indices["bottom"]+1;
				sourceSide = "bottom";
				targetSide = "top";
			}
			
			try {
				start = this._getJoinCoords(entry, sourceSide, indices[sourceSide]);
			} catch {
				throw new Error(`${entry.id}: tried to calc with ${sourceSide} and ${indices[sourceSide]}`);
			}
			
			//Start with vertical line to line case
			end = {
				x: start.x,
				y: this._getYCentre(target)
			}
			
			//If the target doesn't overlap in time with the source (can't be after, as link would be vice versa then)
			if(entry.dataset.start >= target.dataset.end) {
				end.x = this._yearToWidth(target.dataset.end);
			}
			
			//If the year is the same, link the entry box, not the line
			if(entry.dataset.start == target.dataset.start) {
				end = this._getJoinCoords(target, targetSide);
			}
			
			const connector = SvgConnector.draw({
				start: start,
				end: end,
				stroke: this._config.strokeWidth/2,
				colour: colour,
				markers: ["square", "square"],
				dashes: this._config.linkDashes
			});
			connector.classList.add("link");
			this._container.append(connector);
		}
	}
	
	/** Add CSS properties to document root, based on config.
	 * @protected
	 */
	_applyCSSProperties() {
		const root = document.documentElement;
		root.style.setProperty('--tl-width-year', this._config.yearWidth + "px");
		root.style.setProperty('--tl-height-row', this._config.rowHeight + "px");
		root.style.setProperty('--tl-width-box', this._config.boxWidth + "px");
		root.style.setProperty('--tl-height-box', this._config.boxHeight + "px");
		root.style.setProperty('--tl-width-box-min', this._config.boxHeight + "px");
		root.style.setProperty('--tl-padding', this._config.padding + "px");
	}
	
	/**
	 * Find and return the coordinates where lines should join an element on each side.
	 * Where multiple lines are meeting an element on one side, specifying the offest number
	 * allows these to join at different eventnts.
	 * @protected
	 * @param {HTMLElement} entry
	 * @param {string} side - Must be "top", "bottom", "left" or "right"
	 * @param {number} offset - the number of steps to offset the eventnt (use if multiple lines join an entry on the same side).
	 * @return {object}
	 */
	_getJoinCoords(entry, side, offset = 0) {
		
		const offsetIncrement = 5;
		
		const status = window.getComputedStyle(entry);
		
		const l = parseFloat(entry.style.left);
		const t = parseFloat(entry.style.top);
		const w = parseFloat(status.getPropertyValue('width'));
		const h = parseFloat(status.getPropertyValue('height'));
		
		switch(side) {
			case 'left':
				return {
					x: l,
					y: t + h/2 + (offset * offsetIncrement)
				};
			case 'right':
				return {
					x: l + w,
					y: t + h/2 + (offset * offsetIncrement)
				};
			case 'top':
				return {
					x: l + w/2 + (offset * offsetIncrement),
					y: t
				};
			case 'bottom':
				return {
					x: l + w/2 + (offset * offsetIncrement),
					y: t + h
				};
			default:
				throw `Invalid element side specified: Called with ${side}. Entry: ${entry}`;
		}
	}
	
	/**
	 * Return the end date for an entry, whether explicitly set or not.
	 * @protected
	 * @param {HTMLElement} entry
	 * @return {number}
	 */
	_calcEnd(entry) {
		if (entry.dataset.end) {
			return parseInt(entry.dataset.end);
		}
		
		if (entry.dataset.become) {
			return parseInt(document.getElementById(entry.dataset.become).dataset.start);
		}
		
		return parseInt(this._config.yearEnd);
	}
	
	/**
	 * Calculate the absolute top position in px.
	 * @protected
	 * @param {HTMLElement} entry
	 * @return {number}
	 */
	_calcTop(entry) {
		//Add 1 to row due to 0 index.
		return parseInt((parseInt(entry.dataset.row) +1) * this._config.rowHeight + this._config.padding)
	}

	/**
	 * Check if an entry should be small on the graph (too brief to fit full box size)
	 * @protected
	 * @param {HTMLElement} entry
	 * @return {boolean}
	 */
	_checkSmallEntry(entry) {
		const start = entry.dataset.start;
		const end = entry.dataset.end;
		
		if ((end - start) < (this._config.boxWidth/this._config.yearWidth)) {
			return true;
		} else {
			return false;
		}
	}
	
	/**
	 * Get the X-axis centre of an entry box.
	 * @protected
	 * @param {HTMLElement} entry
	 * @return {number}
	 */
	_getXCentre(entry) {
		return parseFloat(entry.style.left) + (this._config.boxWidth/2);
	}
	
	/**
	 * Get the Y-axis centre of an entry box.
	 * @protected
	 * @param {HTMLElement} entry
	 * @return {number}
	 */
	_getYCentre(entry) {
		return parseFloat(entry.style.top) + (this._config.boxHeight/2);
	}
	
	/**
	 * Get the width in px of the diagram at the eventnt sepecified by a particular year.
	 * @param {number} year
	 * @protected
	 * @return {number}
	 */
	_yearToWidth(year) {
		return parseInt((year - this._config.yearStart) * this._config.yearWidth);
	}
}

export {defaultDiagramConfig, Diagram}
