const Guid = require('guid');

/**
 * @param config
 * @return {Stage}
 * @constructor
 */
module.exports = Stage;

function Stage(config, name) {
	this.id = Guid.raw();
	this.name = name;
	this.job = null;
	this.stage_data = null;
	this.on_success = null;
	this.on_fail = null;
	this.priority = 1;
	this.repeat = null;

	if (!config.hasOwnProperty('job')) {
		throw new Error('This stage has no job');
	}

	this.job = config.job;

	if (config.hasOwnProperty('data')) {
		this.stage_data = config.data;
		const data = {};
		if (this.stage_data && this.stage_data.length > 0) {
			for (const i in this.stage_data) {
				data[Object.keys(this.stage_data[i])[0]] = this.stage_data[i][Object.keys(this.stage_data[i])[0]];
			}
		}
		this.stage_data = data;
	}

	if(config.hasOwnProperty('on_success')) {
		this.on_success = {
			'parent': this,
			'child': new Stage(config.on_success, config.on_success.name || `${this.name}-on_success`)
		};
	}

	if (config.hasOwnProperty('on_fail')) {
		this.on_fail = {
			'parent': this,
			'child': new Stage(config.on_fail, config.on_fail.name || `${this.name}-on_fail`)
		};
	}

	if (config.hasOwnProperty('priority')) {
		this.priority = config.priority;
	}

	if(config.hasOwnProperty('repeat')) {
		this.repeat = config.repeat;
	}

	this.getId = () => {
		return this.id;
	};

	this.getJob = () => {
		return this.job;
	};

	this.getName = () => {
		return this.name;
	};

	this.getData = () => {
		return this.stage_data;
	};

	this.getPriority = () => {
		return this.priority;
	};

	this.getRepeat = () => {
		return this.repeat;
	};

	this.getOnSuccess = () => {
		return this.on_success;
	};

	this.getOnFail = () => {
		return this.on_fail;
	};

	return this;
}