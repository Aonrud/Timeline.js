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

export default DiagramGrid;
