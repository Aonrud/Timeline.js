/**
 * Calculates an available position for diagram entries which have not had their row (Y-axis position) set manually.
 * This is fairly rudimentary - a row with sufficient empty space for each entry (and any it joins directly with) will be calculated.
 * If the entry splits from or merges with other entries, the nearest row to those entries will be sought.
 * This is most effectively used in a hybrid form, using some manual positioning, allowing simpler cases to be positioned automatically.
 */
class DiagramPositioner {
	
	/**
	 * @param {number} years - Length of the timeline in years.
	 * @param {number} [yearStart=1900] - The first year of the timeline.
	 * @param {number} [rows] - The number of rows currently in the timeline (used for mixed manual and auto positioning).
	 */
	constructor(years, yearStart = 1900, rows = 1) {
		this._years = years;
		this._yearStart = yearStart;
		this._grid = Array.from(Array(rows+1), () => new Array(years).fill(false));
	}
	
	/**
	 * Set the row for the provided entry.
	 * @param {HTMLElement} entry
	 */
	setEntryRow(entry) {
		const start = this._yearToGrid(entry.dataset.start);
		const end = this._yearToGrid(this._calcGroupEnd(entry));
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
		
		if (seek && near === null) {
			if (!seek.dataset.row) {
				this.setEntryRow(seek);
			}
			near = parseInt(seek.dataset.row);
		}
		
		const row = this._calcEntryRow(entry, start, end, near);
		entry.dataset.row = row;
		this._setGroupRow(entry);
		try {
			this._blockGridSpace(row, start, end);
		} catch(e) {
			console.log(`${e}: called for ${entry.id} with row ${row}`);
		}
	}
	
	/**
	 * Provide the grid X number for a given year
	 * @param {number} year
	 * @return {number}
	 */
	_yearToGrid(year) {
		return parseInt(year) - parseInt(this._yearStart);
	}
	
	/**
	 * Get the number of rows in the diagram.
	 * @return {number}
	 */
	get rows() {
		return this._grid.length;
	}
	
	/**
	 * Set the row on entries grouped with the current entry
	 * @protected
	 * @param {HTMLElement} entry
	 */
	_setGroupRow(entry) {
		if (entry.dataset.become) {
			const next = document.getElementById(entry.dataset.become);
			
			if(next.dataset.row) {
				const s = next.dataset.start - this._yearStart;
				const e = next.dataset.end - this._yearStart;
				this._freeGridSpace(next.dataset.row, s, e);
			}
			next.dataset.row = entry.dataset.row;
			this._setGroupRow(next);
		}
	}
	
	/**
	 * Calculate a suitable row for an entry and return it.
	 * @protected
	 * @param {HTMLElement} entry - the entry
	 * @param {number} start - the number of units (years) from the start of the X axis the entry must start
	 * @param {number} end - the number of units (years) from the start of the X axis the entry must end
	 * @param {HTMLElement} near - Another entry this entry should try to be near
	 * @return {number}
	 */
	_calcEntryRow(entry, start, end, near = null) {
		if (entry.dataset.row) {
			return entry.dataset.row;
		}
		if (near) {
			return this._findNearestGridSpace(parseInt(near), start, end);
		}
		return this._findGridSpace(start, end);
	}
	
	/**
	 * Calculate the end year of an entry's group (i.e. the end of the last entry to which it directly joins).
	 * @protected
	 * @param {HTMLElement} entry
	 * @return {number}
	 */
	_calcGroupEnd(entry) {
		let end = entry.dataset.end;
		if (entry.dataset.become) {
			end = this._calcGroupEnd(document.getElementById(entry.dataset.become));			
		}
		return end;
	}
	
	/**
	 * Find a row with available space between start and end, starting from the centre of the grid.
	 * Otherwise add a new row.
	 * @protected
	 * @param {number} start
	 * @param {number} end
	 * @return {number}
	 */
	_findGridSpace(start, end) {
		let test = Math.floor(this.rows / 2);
		let above = false;
		
		for (let i = 0; i < this.rows; i++) {
			test = ( above ? test - i : test + i );
			console.log(`Checking row ${test}`);
			if (this._checkGridSpace(test, start, end)) {
				console.log(`${test} available.`);
				return test;
			}
			above = !above;
		}
		this._addGridRow();
		return this.rows - 1;
	}
	
	/**
	 * Find the nearest row to that provided which is empty between start and end.
	 * @protected
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 */
	_findNearestGridSpace(y, start, end) {
		let before = y, after = y;
		
		if (this._checkGridSpace(y, start, end)) { return y; }
		
		while(before > -1 && !this._checkGridSpace(before, start, end)) { before--; }
		while(after < this.rows && !this._checkGridSpace(after, start, end)) { after++; }
		
		if (before == -1 && after == this.rows) {
			this._addGridRow();
			return this.rows - 1;
		}
		
		if (after == this.rows) { return before; }
		
		if (before == -1) { return after; }
		
		if ((y - before) <= (after - y)) { return before; }
		else { return after; }
	}
	
	/**
	 * Add a row to the grid.
	 * @protected
	 */
	_addGridRow() {
		this._grid.push(new Array(this._years).fill(false));
	}
	
	/**
	 * Check if the given row y is empty between start and end.
	 * @protected
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 * @return {boolean}
	 */
	_checkGridSpace(y, start, end) {
		//Validate y
		if (y > this._grid.length - 1) console.log(this._grid);
		
		//In most instances, we don't want to extend to the end of the "end" year, but to the start. So that, e.g. we can join with another entry starting on that year and not overlap.  However, entries with the same start and end must take up some space.
		if (start === end) {
			end += 1;
		}
		
		const part = this._grid[y].slice(start, end);
		let result = part.every( e => e === false);
		return result;
	}
	
	/**
	 * Set the space in row y from start to end as full.
	 * @protected
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 */
	_blockGridSpace(y, start, end) {
		this._markGridSpace(y, start, end, true);
	}
	
	/**
	 * Set the space in row y from start to end as empty.
	 * @protected
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 */
	_freeGridSpace(y, start, end) {
		this._markGridSpace(y, start, end, false);
	}
	
	/**
	 * Set the space in row y from start to end according to the state param.
	 * @protected
	 * @param {number} y
	 * @param {number} start
	 * @param {number} end
	 * @param {boolean} state
	 */
	_markGridSpace(y, start, end, state) {
		if (!this._grid[y]) {
			throw new Error(`Attempt to mark non-existent grid row ${y}`);
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
	}
}

export default DiagramPositioner
