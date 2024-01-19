import DiagramGrid from './DiagramGrid.js';

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
			
			if (entry.dataset.group !== next.dataset.group) {
				console.warn(`${entry.id} and ${next.id} are directly connected but in separate groups. Amending ${next.id} to ${entry.dataset.group}`);
				next.dataset.group = entry.dataset.group;
			}
			
			//If the 'becomes' entry has a row set, remove it.
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
	 * Provide the grid x number for a given year
	 * @param {number} year
	 * @return {number}
	 */
	_yearToGrid(year) {
		return parseInt(year) - parseInt(this._start);
	}
	
	
}

export default DiagramPositioner
