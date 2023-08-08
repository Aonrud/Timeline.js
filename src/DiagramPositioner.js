/**
 * @typedef {boolean[]} GridRow
 * 
 * @typedef {GridRow[]} DiagramGrid
 * A two-dimensional array of boolean values, used as a grid to represent space in the diagram
 */

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
		this._grid = this._createGrid(entries);
		this._groups = this._listGroups(entries)
		
		let groupGrids = {};
		for (const g of this._groups) {
			groupGrids[g] = this._createGrid();
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
				const overlap = this._getGridOverlap(prevGrid, this._groupGrids[group]);
				increment -= overlap;
			}
			for (const entry of entries) {
				entry.dataset.row = parseInt(entry.dataset.groupRow) + increment;
			}
			this._groupRange[group] = [ increment, increment + this._groupGrids[group].length ];
			
			increment += this._groupGrids[group].length;
		});
		
		const rowCount = this._getRowCount(this._entries);
		this._addGridRowsUntil(this._grid, rowCount);
		
		//Block all spaces used by grouped entries before proceeding. (Separate loop ensures blocks are in place before adjustment checks).
		for (const entry of grouped) {
			this._blockGridSpace(entry.dataset.row, this._yearToGrid(entry.dataset.start), this._yearToGrid(entry.dataset.end), this._grid);
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
	 * Adjust the position of the entry if it splits from or merges with an entry in a different group.
	 * @param {HTMLElement} entry
	 */
	_adjustConnectedEntry(entry) {
		const targetID = ( entry.dataset.split ? entry.dataset.split : entry.dataset.merge );
		const targetEl = document.getElementById(targetID);
		if (targetEl.dataset.group !== entry.dataset.group) {
			console.log(`${entry.id} is in different group from target ${targetID}`);
			let targetRow = ( targetEl.dataset.row - entry.dataset.row > 0 ? this._groupRange[entry.dataset.group][1] : this._groupRange[entry.dataset.group][0] );
			
			const newRow = this._checkGridRange(targetRow, entry.dataset.row, this._yearToGrid(entry.dataset.start), this._yearToGrid(this._calcLineEnd(entry)), this._grid);
			if (newRow !== undefined) {
				this._moveEntry(entry, newRow);
				
				const linked = [...this._entries].filter(e => e.dataset.split == entry.id || e.dataset.merge == entry.id);
				console.log(linked);
				for (const link of linked) {
					if (link.dataset.group == entry.dataset.group) {
						const move = this._checkGridRange(entry.dataset.row, link.dataset.row, this._yearToGrid(link.dataset.start), this._yearToGrid(this._calcLineEnd(link)), this._grid);
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
		console.log(`Moving ${entry.id} from ${entry.dataset.row} to ${row}.`);
		this._freeGridSpace(entry.dataset.row, s, e, this._grid);
		entry.dataset.row = row;
		this._setLineRow(entry, "row", this._grid);
		this._blockGridSpace(entry.dataset.row, s, e, this._grid);
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
		
		const row = this._findGridSpace(start, end, grid, near);
		entry.dataset[rowProp] = row;
		this._setLineRow(entry, rowProp, grid);
		try {
			this._blockGridSpace(row, start, end, grid);
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
			if (entry.dataset.group !== next.dataset.group) {
				console.warn(`${entry.id} and ${next.id} are directly connected but in separate groups. Amending ${next.id} to ${entry.dataset.group}`);
				next.dataset.group = entry.dataset.group;
			}
			
			if(Object.hasOwn(next.dataset, rowProp)) {
				this._freeGridSpace(next.dataset[rowProp], this._yearToGrid(next.dataset.start), this._yearToGrid(next.dataset.end), grid);
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
	
	/****************************************************************
	 * Grid methods.
	 */
	
	/**
	 * Compare the grids to see how much they can overlap without clashing entry positions.
	 * @param {DiagramGrid} grid1
	 * @param {DiagramGrid} grid2
	 * @return {number}
	 */
	_getGridOverlap(grid1, grid2) {
		//Maximum we want to overlap is with 1 row unique to second group.
		let overlap = Math.min(grid1.length, grid2.length) - 1;

		while (overlap > 0) {
			let fits = true;
			for(let i = 0; i < overlap && i < grid1.length; i++) {
				if (!this._compareGridRows(grid1[grid1.length - overlap + i],grid2[i])) {
					fits = false;
					break;
				}
			}
			if (fits == true) return overlap;
			overlap--;
		}
		return overlap;
	}
	
	/**
	 * Create a grid.
	 * If entries is set, the grid will grow to meet the number of fixed rows already set.
	 * @param {NodeList|null} [entries = null] 
	 * @return {DiagramGrid}
	 */
	_createGrid(entries = null) {
		let rows = 1;
		let setRows = [];
		if (entries) {
			rows = this._getRowCount(entries);
		}
		let grid = Array.from(Array(rows), () => new Array(this._xLength).fill(false));
		for (const entry of setRows) {
			grid = this._blockGridSpace(entry.dataset.row, this._yearToGrid(entry.start), this._yearToGrid(entry.end), grid);
		}
		return grid;
	}
	
	/**
	 * Return the number of row needed to accommodate the rows set in the given list of entries.
	 * @param {NodeList} entries
	 * @return {number}
	 */
	_getRowCount(entries) {
		const setRows = [...entries].filter(e => e.dataset.row);
		return ( setRows.length > 0 ? Math.max(...setRows.map(e => parseInt(e.dataset.row))) + 1 : 1);
	}
	
	/**
	 * Find a row with available space between start and end, starting from the centre of the grid.
	 * Otherwise add a new row.
	 * @protected
	 * @param {number} start
	 * @param {number} end
	 * @param {DiagramGrid} grid
	 * @param {number} near Find the nearest row to this row number
	 * @return {number}
	 */
	_findGridSpace(start, end, grid, near = null) {
		let test = ( near ? near : Math.floor(grid.length/2));
		let above = false;
		
		for (let i = 0; i < grid.length; i++) {
			test = ( above ? test - i : test + i );
			if (test < 0 || test > grid.length - 1) {
				continue;
			}
			if (this._checkGridSpace(test, start, end, grid)) {
				return test;
			}
			above = !above;
		}
		this._addGridRow(grid);
		return grid.length - 1;
	}
	
	/**
	 * Provide the grid X number for a given year
	 * @param {number} year
	 * @return {number}
	 */
	_yearToGrid(year) {
		return parseInt(year) - parseInt(this._start);
	}
	
	/**
	 * Increase the grid size until the given row index is set.
	 * @param {number} rows
	 * @return {DiagramGrid}
	 */
	_addGridRowsUntil(grid, rows) {
		while (grid.length - 1 !== rows) {
			this._addGridRow(grid);
		}
		return grid;
	}
	
	/**
	 * Add a row to a grid.
	 * @protected
	 * @param {DiagramGrid} grid
	 * @return {DiagramGrid}
	 */
	_addGridRow(grid) {
		grid.push(new Array(this._xLength).fill(false));
		return grid;
	}
	
	/**
	 * Check for a space between the rows specified, starting with y1.
	 * Return the row number if a space is found, otherwise nothing.
	 * @param {number} y1
	 * @param {number} y2
	 * @param {number} start
	 * @param {number} end
	 * @param {DiagramGrid} grid
	 * @return {number|undefined}
	 */
	_checkGridRange(y1, y2, start, end, grid) {
		console.log(`Checking from ${y1} to ${y2}`);
		while (y1 != y2) {
			if (this._checkGridSpace(y1, start, end, grid)) {
				console.log(`Space found at ${y1}.`);
				return y1;
			}
			y1 = ( y1 > y2 ? parseInt(y1)-1 : parseInt(y1)+1);
		}
	}
	
	/**
	 * Check if the given row y is empty between start and end in the given grid.
	 * @protected
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 * @param {DiagramGrid} grid
	 * @return {boolean}
	 */
	_checkGridSpace(y, start, end, grid) {
		//In most instances, we don't want to extend to the end of the "end" year, but to the start. So that, e.g. we can join with another entry starting on that year and not overlap.  However, entries with the same start and end must take up some space.
		if (start === end) {
			end += 1;
		}
		const part = grid[y].slice(start, end);
		let result = part.every( e => e === false);
		if (y == 9) console.log(part);
		return result;
	}
	
	/**
	 * Set the space in row y from start to end as full in the given grid.
	 * @protected
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 * @param {DiagramGrid} grid
	 */
	_blockGridSpace(y, start, end, grid) {
		this._markGridSpace(y, start, end, grid, true);
		return grid;
	}
	
	/**
	 * Set the space in row y from start to end as empty in the given grid.
	 * @protected
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 * @param {DiagramGrid} grid
	 */
	_freeGridSpace(y, start, end, grid) {
		this._markGridSpace(y, start, end, grid, false);
		return grid;
	}
	
	/**
	 * Set the space in row y from start to end according to the state param.
	 * @protected
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 * @param {DiagramGrid} grid
	 * @param {boolean} state
	 * @return {DiagramGrid}
	 */
	_markGridSpace(y, start, end, grid, state) {
		if (!grid[y]) {
			throw new Error(`Attempt to mark non-existent grid row ${y}. Grid has length ${grid.length}`);
		}
		
		if (y == 9 && grid == this._grid) console.log(`Blocking row 9 between ${start} and ${end}`);
		
		let n = 0;
		while (n < (end - start)) {
			grid[y][start+n] = state;
			n++;
		}
		
		//Mark space either end to keep entries from joining, if available
		if (start > 0) {
			grid[y][start-1] = state;
		}
		if (end < grid[0].length - 1) {
			grid[y][end] = state;
		}
		return grid;
	}
	
	/**
	 * Check if the two grid rows can be fit together without any clashes in used space.
	 * @param {GridRow} row1
	 * @param {GridRow} row2
	 * @return {boolean}
	 */
	_compareGridRows(row1, row2) {
		for (const [i, e] of row1.entries()) {
			if (e && row2[i]) {
				return false;
			}
		}
		return true;
	}
}

export default DiagramPositioner
