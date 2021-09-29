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
		if(conf.hasOwnProperty(prop)) {
			c[prop] = conf[prop];
		} else {
			c[prop] = defaults[prop];
		}
	}
	return c;
}

export {applyConfig}
