/*! Timeline
 *Copyright (C) 2021-2024 Aonghus Storey
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
const svgns = "http://www.w3.org/2000/svg";

/**
 * A class for drawing lines with SVG.
 */
class SvgConnector {
	
	/**
	 * Create an SVG element drawing a line between the specified start and end points, with optional markers at each end.
	 * The SVG returned will be absolutely positioned and should be appended to the document as needed by the caller.
	 *
	 * @static
	 * @param {object} settings
	 * @param {object} settings.start - The x and y coordinates of the start point
	 * @param {number} settings.start.x
	 * @param {number} settings.start.y
	 * @param {object} settings.end - The x and y coordinates of the end point
	 * @param {number} settings.end.x
	 * @param {number} settings.end.y
	 * @param {string} settings.stroke - The stroke width in px of the line
	 * @param {string} settings.colour - The colour of the line. Will be set on the SVG element and inherited, so can be e.g. a CSS var().
	 * @param {array.<string>} [settings.markers] - An array of two string values indicating the start and end markers respectively.
	 * 		Valid values are "circle", "square" and "dots" (the last can only be used for end).
	 * @param {string} [settings.dashes] - A dasharray string for the SVG line. If omitted, a solid line will be used.
	 * 		Must be a valid SVG dasharray (@see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray})
	 * @param {String} [settings.title] - If included, a title element will be included on the line with the given text.
	 * @return {object}
	 */
	static draw({
		start,
		end,
		stroke,
		colour,
		markers = [],
		dashes = "",
		title = ""
	} = {}) {
		const offset = stroke*2;	//This offset makes the canvas larger, allowing for wider end markers
		
		const xDisplacement = end.x - start.x;
		const yDisplacement = end.y - start.y;
		
		//Default positioning, if we are drawing from origin.
		const coords = {
			x1: offset,
			y1: offset,
			x2: xDisplacement + offset,
			y2: yDisplacement + offset
		};
		
		//If X or Y end coords are lower than start, then we need to offset as line is not from origin
		if (end.x < start.x) {
			coords.x1 += Math.abs(xDisplacement);
			coords.x2 += Math.abs(xDisplacement);
		}
		
		if (end.y < start.y) {
			coords.y1 += Math.abs(yDisplacement);
			coords.y2 += Math.abs(yDisplacement);
		}
		
		//Position SVG to account for line thickness overflow from origin
		//E.g. a horizontal line from (0,0) with a thickness of 10 displays from -5 to + 5
		const xpos = Math.min(start.x,end.x) - offset;
		const ypos = Math.min(start.y,end.y) - offset;
		
		let svg = document.createElementNS(svgns, "svg");
		svg.setAttribute("width", Math.abs(xDisplacement) + offset*2);
		svg.setAttribute("height", Math.abs(yDisplacement) + offset*2);
		svg.setAttribute("style", "position: absolute; left: " + xpos + "px; top: " + ypos + "px");
		svg.style.color = colour;

		const line = this.drawLine(coords, stroke, dashes, title);
		//debugging
		line.setAttribute("data-coords", `[ ${start.x}, ${start.y} ], [ ${end.x}, ${end.y} ]`);
		svg.append(line);
		
		svg = this._addMarker(svg, markers[0], "start", coords, stroke);
		svg = this._addMarker(svg, markers[1], "end", coords, stroke);

		return svg;
	}
	
	/**
	 * Add a marker to the svg provided at the end specified.
	 * @param {object} svg
	 * @param {string} type
	 * @param {string} pos
	 * @param {object} coords
	 * @param {number} stroke
	 * @return {object|null}
	 */
	static _addMarker(svg, type, pos, coords, stroke) {
		if (type == "circle") svg.append(this._drawCircleMarker(pos, coords, stroke));
		if (type == "square") svg.append(this._drawSquareMarker(pos, coords, stroke));
		if (type == "dots" && pos == "end") {
			svg.setAttribute("width", parseInt(svg.getAttribute("width")) + stroke*2);
			svg.append(this._drawDotsEnd(coords, stroke));
		}
		return svg;
	}
	
	/**
	 * Draw a square marker at the given position of the line represented by the given coords.
	 * @param {string} pos - Either "start" or "end"
	 * @param {object} coords - the four coords of the line
	 * @param {number} stroke - the stroke width
	 * @return {object}
	 */
	static _drawSquareMarker(pos, coords, stroke) {
		let [x, y] = [coords.x1 - stroke, coords.y1 - stroke];
		if (pos == "end") [x, y] = [coords.x2 - stroke, coords.y2 - stroke];
		return this.drawSquare(x, y, stroke * 2.5);
	}
	
	/**
	 * Draw a circle marker at the given position of the line represented by the given coords.
	 * @param {string} pos - Either "start" or "end"
	 * @param {object} coords - the four coords of the line
	 * @param {number} stroke - the stroke width
	 * @return {object}
	 */
	static _drawCircleMarker(pos, coords, stroke) {
		let [x, y] = [coords.x1, coords.y1];
		if (pos == "end") [x, y] = [coords.x2, coords.y2];
		return this.drawCircle(x, y, stroke);
	}
	
	/**
	 * Draw dots marker at the end of the line.
	 * (Note - requires full line coords, because marker has direction)
	 * @param {object} coords - the 4 coords of the line being marked
	 * @param {number} stroke - the stroke width of the line
	 * @return {object}
	 */
	static _drawDotsEnd(coords, stroke) {
		
		let x2 = coords.x2;
		if (coords.x2 < coords.x1) {
			x2 = coords.x2 - stroke*5;
		}
		if (coords.x2 > coords.x1) {
			x2 = coords.x2 + stroke*5;
		}
		
		let y2 = coords.y2;
		if (coords.y2 < coords.y1) {
			y2 = coords.y2 - stroke*2;
		}
		if (coords.y2 > coords.y1) {
			y2 = coords.y2 + stroke*2;
		}
		
		const dotCoords = {
			x1: coords.x2,
			y1: coords.y2,
			x2: x2,
			y2: y2
		};
		return this.drawLine(dotCoords, stroke, `0 ${stroke} ${stroke} ${stroke} ${stroke}`);
	}
	
	/**
	 * Returns an SVG line, which can be appended to an SVG element.
	 * @param {object} coords - the x and y coordinates of the start and end points of the line
	 * @param {number} coords.x1
	 * @param {number} coords.y1
	 * @param {number} coords.x2
	 * @param {number} coords.y2
	 * @param {number} width - The width in px of the line
	 * @param {string} [dashes] - The dasharray pattern of the line. If omitted, it will be solid.
	 * 		Must be a valid SVG dasharray (@see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray})
	 * @param {String} [title] - If included, a title element will be included with the given text.
	 * @return {object}
	 */
	static drawLine(coords, width, dashes = "", title = "") {
		const line = document.createElementNS(svgns, "line");
		line.setAttribute("x1", coords.x1);
		line.setAttribute("y1", coords.y1);
		line.setAttribute("x2", coords.x2);
		line.setAttribute("y2", coords.y2);
		line.setAttribute("stroke-width", width);
		line.setAttribute("stroke-dasharray",dashes);
		line.setAttribute("stroke", "currentColor");
		
		if(title) {
			line.append(this._createTitle(title));
		}
		return line;
	}
	
	/**
	 * Return an SVG circle, which can be appended to an SVG element.
	 * @param {number} cx - The X coordinate of the circle centre
	 * @param {number} cy - The Y coordinate of the circle centre
	 * @param {number} r - The radius in px of the circle
	 * @param {String} [title] - If included, a title element will be included with the given text.
	 * @return {object}
	 */
	static drawCircle(cx, cy, r, title = "") {
		const circle = document.createElementNS(svgns, "circle");
		circle.setAttribute("cx", cx);
		circle.setAttribute("cy", cy);
		circle.setAttribute("r", r);
		circle.setAttribute("fill", "currentColor");
		
		if(title) {
			circle.append(this._createTitle(title));
		}
		
		return circle;
	}
	
	/**
	 * Returns an SVG square, which can be appended to an SVG element.
	 * @param {number} x - The X coordinate
	 * @param {number} y - The y coordinate
	 * @param {number} w - The width of the square
	 * @param {String} [title] - If included, a title element will be included with the given text.
	 * @return {object}
	 */
	static drawSquare(x, y, w, title = "") {
		const square = document.createElementNS(svgns, "rect");
		square.setAttribute("x", x);
		square.setAttribute("y", y);
		square.setAttribute("width", w);
		square.setAttribute("height", w);
		square.setAttribute("fill", "currentColor");
		
		if(title) {
			square.append(this._createTitle(title));
		}
		
		return square;
	}
	
	/**
	 * Create a title element with the given title
	 * @param {string} title
	 * @return {object}
	 */
	static _createTitle(title) {
		
		const t = document.createElementNS(svgns, "title");
		t.append(document.createTextNode(title));
		t.dataset.title = title;
		return t;
	}
}

/**
 * @typedef {boolean[]} GridRow
 */

class DiagramGrid {
		
	/**
	 * Create a this._grid.
	 * If entries is set, the this._grid will grow to meet the number of fixed rows already set.
	 * @param {NodeList|null} [entries = null] 
	 * @return {DiagramGrid}
	 */
	constructor(xlength) {
		this._xlength = xlength;
		this._grid = [];
		// this._addGridRow;
	}
	
	/**
	 * Find a row with available space between start and end, starting from the centre of the this._grid.
	 * Otherwise add a new row.
	 * @param {number} start
	 * @param {number} end
	 * @param {number} near Find the nearest row to this row number
	 * @return {number}
	 */
	findGridSpace(start, end, near = null) {
		let test = ( near ? near : Math.floor(this._grid.length/2));
		let above = false;
		
		for (let i = 0; i < this._grid.length; i++) {
			test = ( above ? test - i : test + i );
			if (test < 0 || test > this._grid.length - 1) {
				continue;
			}
			if (this.checkGridSpace(test, start, end)) {
				return test;
			}
			above = !above;
		}
		this.addGridRow();
		return this._grid.length - 1;
	}
		
	/**
	 * Increase the this._grid size until the given row index is set.
	 * @param {number} rows
	 * @return {DiagramGrid}
	 */
	addGridRowsUntil(rows) {
		while (this._grid.length - 1 !== rows) {
			this.addGridRow();
		}
		return this;
	}
	
	/**
	 * Add a row to a this._grid.
	 * @return {DiagramGrid}
	 */
	addGridRow() {
		this._grid.push(new Array(this._xlength).fill(false));
		return this;
	}
	
	/**
	 * Check for a space between the rows specified, starting with y1.
	 * Return the row number if a space is found, otherwise nothing.
	 * @param {number} y1
	 * @param {number} y2
	 * @param {number} start
	 * @param {number} end
	 * @return {number|undefined}
	 */
	checkGridRange(y1, y2, start, end) {
		while (y1 != y2) {
			if (this.checkGridSpace(y1, start, end)) {
				return y1;
			}
			y1 = ( y1 > y2 ? parseInt(y1)-1 : parseInt(y1)+1);
		}
	}
	
	/**
	 * Check if the given row y is empty between start and end in the given this._grid.
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 * @return {boolean}
	 */
	checkGridSpace(y, start, end) {
		//In most instances, we don't want to extend to the end of the "end" year, but to the start. So that, e.g. we can join with another entry starting on that year and not overlap.  However, entries with the same start and end must take up some space.
		if (start === end) {
			end += 1;
		}
		const part = this._grid[y].slice(start, end);
		let result = part.every( e => e === false);
		return result;
	}
	
	/**
	 * Set the space in row y from start to end as full in the given this._grid.
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 */
	blockGridSpace(y, start, end) {
		this._markGridSpace(y, start, end, this._grid, true);
		return this._grid;
	}
	
	/**
	 * Set the space in row y from start to end as empty in the given this._grid.
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 * @param {DiagramGrid} this._grid
	 */
	freeGridSpace(y, start, end) {
		this._markGridSpace(y, start, end, this._grid, false);
		return this._grid;
	}
	
	/**
	 * Set the space in row y from start to end according to the state param.
	 * @protected
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 * @param {DiagramGrid} this._grid
	 * @param {boolean} state
	 * @return {DiagramGrid}
	 */
	_markGridSpace(y, start, end, state) {
		if (!this._grid[y]) {
			throw new Error(`Attempt to mark non-existent this._grid row ${y}. Grid has length ${this._grid.length}`);
		}
		
		let n = 0;
		while (n < (end - start)) {
			this._grid[y][start+n] = state;
			n++;
		}
		
		//Mark space either end to keep entries from joining, if available
		if (start > 0) {
			this._grid[y][start-1] = state;
		}
		if (end < this._grid[0].length - 1) {
			this._grid[y][end] = state;
		}
		return this._grid;
	}
		
	/**
	 * Check if two rows can be fit together without any clashes in used space.
	 * @param {GridRow} row1
	 * @param {GridRow} row2
	 * @return {boolean}
	 */
	static compareGridRows(row1, row2) {
		for (const [i, e] of row1.entries()) {
			if (e && row2[i]) {
				return false;
			}
		}
		return true;
	}
	
	/**
	 * Get the current number of rows.
	 * @return {number}
	 */
	get length() {
		return this._grid.length;
	}
	
	getRow(index) {
		return this._grid[index];
	}
	
	/**
	 * Compare two grids to see how much they can overlap without clashing entry positions.
	 * @param {DiagramGrid} this._grid1
	 * @param {DiagramGrid} this._grid2
	 * @return {number}
	 */
	static getGridOverlap(grid1, grid2) {
		//Maximum we want to overlap is with 1 row unique to second group.
		let overlap = Math.min(grid1.length, grid2.length) - 1;
		
		while (overlap > 0) {
			let fits = true;
			for(let i = 0; i < overlap && i < grid1.length; i++) {
				if (!DiagramGrid.compareGridRows(grid1.getRow(grid1.length - overlap + i),grid2.getRow(i))) {
					fits = false;
					break;
				}
			}
			if (fits == true) return overlap;
			overlap--;
		}
		return overlap;
	}
}

class DiagramPositioner {
	
	/**
	 * @param {NodeList} entries - The timeline entries.
	 * @param {number} start - The first year of the timeline.
	 * @param {number} end - The last year of the timeline.
	 */
	constructor(entries, start, end) {
		this._entries = entries;
		this._start = start;
		this._end = end;
		this._xLength = end - start;
		this._grid = new DiagramGrid();
		this._groups = this._listGroups(entries);
		
		this._grid.addGridRowsUntil(this._getEntriesRowCount(entries));
		
		let groupGrids = {};
		for (const g of this._groups) {
			groupGrids[g] = new DiagramGrid();
		}
		this._groupGrids = groupGrids;
	}
	
	/**
	 * Calculate the entry rows.
	 */
	calculate() {
		const grouped = [...this._entries].filter(e => e.dataset.group);
		const ungrouped = [...this._entries].filter(e => !e.dataset.group);
		this._groupRange = {};
		for (const entry of grouped) {
			this._setEntryRow(entry, true);
		}
		
		let increment = 0;
		this._groups.forEach((group, i) => {
			const entries = [...this._entries].filter(e => e.dataset.group == group);
			if (i != 0) {
				const prevGrid = this._groupGrids[this._groups[i-1]];
				const overlap = DiagramGrid.getGridOverlap(prevGrid, this._groupGrids[group]);
				increment -= overlap;
			}
			for (const entry of entries) {
				entry.dataset.row = parseInt(entry.dataset.groupRow) + increment;
			}
			this._groupRange[group] = [ increment, increment + this._groupGrids[group].length ];
			
			increment += this._groupGrids[group].length;
		});
		
		const rowCount = this._getEntriesRowCount(this._entries);
		this._grid.addGridRowsUntil(rowCount);
		
		//Block all used spaces before proceeding.
		for (const entry of [...this._entries].filter(e => e.dataset.row)) {
			this._grid.blockGridSpace(entry.dataset.row, this._yearToGrid(entry.dataset.start), this._yearToGrid(entry.dataset.end), this._grid);
		}
		
		for (const entry of grouped) {
			//Adjust connections that cross between groups
			if (entry.dataset.split || entry.dataset.merge) {
				this._adjustConnectedEntry(entry);
			}
		}
		
		//Position remaining entries
		for (const entry of ungrouped) {
			this._setEntryRow(entry);
		}
	}
	
	/**
	 * Get the number of rows in the diagram.
	 * @return {number}
	 */
	get rows() {
		return this._grid.length;
	}
	
	/****************************************************************
	 * Entry methods.
	 */
	
	/**
	 * Get a list of all groups in the given entries.
	 * @param {NodeList} entries
	 * @return {Object}
	 */
	_listGroups(entries) {
		return [...entries].reduce( (result, e) => { 
			if (e.dataset.group && !result.includes(e.dataset.group)) {
				result.push(e.dataset.group);
			}
			return result },
			[]);
	}
	
	/**
	 * Return the number of rows needed to accommodate the rows set in the given list of entries.
	 * @param {NodeList} entries
	 * @return {number}
	 */
	_getEntriesRowCount(entries) {
		const setRows = [...entries].filter(e => e.dataset.row);
		return ( setRows.length > 0 ? Math.max(...setRows.map(e => parseInt(e.dataset.row))) + 1 : 1);
	}
	
	/**
	 * Adjust the position of the entry if it splits from or merges with an entry in a different group.
	 * @param {HTMLElement} entry
	 */
	_adjustConnectedEntry(entry) {
		const targetID = ( entry.dataset.split ? entry.dataset.split : entry.dataset.merge );
		const targetEl = document.getElementById(targetID);
		if (targetEl.dataset.group !== entry.dataset.group) {
			let targetRow = ( targetEl.dataset.row - entry.dataset.row > 0 ? this._groupRange[entry.dataset.group][1] : this._groupRange[entry.dataset.group][0] );
			
			const newRow = this._grid.checkGridRange(targetRow, entry.dataset.row, this._yearToGrid(entry.dataset.start), this._yearToGrid(this._calcLineEnd(entry)));
			if (newRow !== undefined) {
				this._moveEntry(entry, newRow);
				
				const linked = [...this._entries].filter(e => e.dataset.split == entry.id || e.dataset.merge == entry.id);
				for (const link of linked) {
					if (link.dataset.group == entry.dataset.group) {
						const move = this._grid.checkGridRange(entry.dataset.row, link.dataset.row, this._yearToGrid(link.dataset.start), this._yearToGrid(this._calcLineEnd(link)));
						if (move !== undefined) {
							this._moveEntry(link, move);
						}
					}
				}
				return;
			}
		}
	}
	
	/**
	 * Move an entry to a new row.
	 * @param {HTMLElement} entry
	 * @param {number} row
	 */
	_moveEntry(entry, row) {
		const s = this._yearToGrid(entry.dataset.start);
		const e = this._yearToGrid(this._calcLineEnd(entry));
		this._grid.freeGridSpace(entry.dataset.row, s, e);
		entry.dataset.row = row;
		this._setLineRow(entry, "row", this._grid);
		this._grid.blockGridSpace(entry.dataset.row, s, e);
	}
	
	/**
	 * Set a row for the provided entry in the given grid.
	 * @param {HTMLElement} entry
	 * @param {boolean} [group = false] If true, the entry's position within it's group section will be set.
	 */
	_setEntryRow(entry, group = false) {
		let grid = this._grid;
		let rowProp = "row";
		if (group) {
			if (!entry.dataset.group) return;
			grid = this._groupGrids[entry.dataset.group];
			rowProp = "groupRow";
		}
		
		if (entry.dataset[rowProp]) return;
		
		const start = this._yearToGrid(entry.dataset.start);
		const end = this._yearToGrid(this._calcLineEnd(entry));
		let seek = null, near = null;
		
		if (entry.dataset.split) {
			seek = document.getElementById(entry.dataset.split);
		}
		
		if (entry.dataset.merge) {
			const mergeEl = document.getElementById(entry.dataset.merge);
			
			//Prevent infinite recursion if merging with an entry which split from this one
			if(mergeEl.dataset.split !== entry.id) {
				seek = mergeEl;
			}
		}
		
		if (seek && (!group || seek.dataset.group == entry.dataset.group)) {
			if (!Object.hasOwn(seek.dataset, rowProp)) {
				this._setEntryRow(seek, group);
			}
			near = parseInt(seek.dataset[rowProp]);
		}
		
		const row = grid.findGridSpace(start, end, near);
		entry.dataset[rowProp] = row;
		this._setLineRow(entry, rowProp, grid);
		try {
			grid.blockGridSpace(row, start, end);
		} catch(e) {
			console.warn(`${e}: called for ${entry.id} with row ${row}`);
		}
	}
	
	/**
	 * Set the row on entries in line with the current entry.
	 * @protected
	 * @param {HTMLElement} entry
	 * @param {string} rowProp
	 * @param {DiagramGrid} grid
	 */
	_setLineRow(entry, rowProp, grid) {	
		if (entry.dataset.become) {
			const next = document.getElementById(entry.dataset.become);
			
			//TODO: Change this approach. It shouldn't be necessary for a split to be in the same group…
			if (entry.dataset.group !== next.dataset.group) {
				console.warn(`${entry.id} and ${next.id} are directly connected but in separate groups. Amending ${next.id} to ${entry.dataset.group}`);
				next.dataset.group = entry.dataset.group;
			}
			
			if(Object.hasOwn(next.dataset, rowProp)) {
				grid.freeGridSpace(next.dataset[rowProp], this._yearToGrid(next.dataset.start), this._yearToGrid(next.dataset.end));
			}
			next.dataset[rowProp] = entry.dataset[rowProp];
			this._setLineRow(next, rowProp, grid);
		}
	}
		
	/**
	 * Calculate the end year of an entry's line (i.e. the end of the last entry to which it directly joins).
	 * @protected
	 * @param {HTMLElement} entry
	 * @return {number}
	 */
	_calcLineEnd(entry) {
		let end = entry.dataset.end;
		if (entry.dataset.become) {
			end = this._calcLineEnd(document.getElementById(entry.dataset.become));			
		}
		return end;
	}
	
	/**
	 * Provide the this._grid X number for a given year
	 * @param {number} year
	 * @return {number}
	 */
	_yearToGrid(year) {
		return parseInt(year) - parseInt(this._start);
	}
	
	
}

/**
 * Takes a config object and a default config object and returns a final config with all config modifcations applied.
 * Ensures no unwanted properties are passed in config.
 * @param {object} defaults - The default config object with all allowed properties
 * @param {object} conf - The config object to apply
 * @return {object}
 */
function applyConfig(defaults, conf) {
	let c = {};
	
	for (const prop in defaults) {
		if(Object.hasOwn(conf, prop)) {
			c[prop] = conf[prop];
		} else {
			c[prop] = defaults[prop];
		}
	}
	return c;
}

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
};

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
			const yearEvents = [...this._events].filter(e => {return !e.dataset.target && e.dataset.year == event.dataset.year});
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
				};
				
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
		};
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
		};
		
		for (const link of links) {
			const target = document.getElementById(link);
			let sourceSide, targetSide, start = { x: 0, y: 0}, end = { x: 0, y: 0};
			
			const eRow = parseInt(entry.dataset.row);
			const tRow = parseInt(target.dataset.row);
			
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
			start = this._getJoinCoords(entry, sourceSide, indices[sourceSide]);
			
			//Start with vertical line to line case
			end = {
				x: start.x,
				y: this._getYCentre(target)
			};
			
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

/**
 * @module Timeline
 */

/**
 * The default configuration object for the Timeline
 */
const defaultTimelineConfig = {
	panzoom: null,
	findForm: "timeline-find",
	zoomIn: "timeline-zoom-in",
	zoomOut: "timeline-zoom-out",
	zoomReset: "timeline-zoom-reset"
};

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
		
		setTimeout( () => { target.classList.add("highlight", "hover"); }, 500);	
		setTimeout( () => { target.classList.remove("highlight", "hover"); }, 2000);
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
		
		if(zoomIn) { zoomIn.addEventListener("click", this._pz.zoomIn); }
		if(zoomOut) { zoomOut.addEventListener("click", this._pz.zoomOut); }
		if(reset) { reset.addEventListener("click", () => this._pz.zoom(1)); }
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
			
		};
		this._findConfig = findConfig;
		
		//Stop refresh keeping a previous value (which won't be valid without corresponding ID)
		findConfig.finder.value = "";
		
		form.addEventListener('input', (e) => this._showEntryOptions(e));
		form.addEventListener('submit', (e) => this._findSubmit(e));
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
				event.preventDefault();
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

export { Timeline as default };
