/**
 * @param config
 * @param data
 * @return {Stage}
 * @constructor
 */
module.exports = (config, data) => {
	const name = Object.keys(config)[0];
	this.job = config[name]['job'];
	this.data = data;

	this.data['jobs_data'] = {};

	this.stageOnSuccess = [];
	this.stageOnFail = [];

	if (config[name]['on_success']) {
		stageOnSuccess.push({
			'name': config[name]['on_success']['name'] || `${name}_on_success`,
			'parent': job,
			'child': config[name]['on_success']
		});
	}

	if (config[name]['on_fail']) {
		stageOnFail.push({
			'name': config[name]['on_fail']['name'] || `${name}_on_fail`,
			'parent': job,
			'child': config[name]['on_fail']
		});
	}

	const jobsData = config[name]['data'];
	if(jobsData && jobsData.length > 0) {
		for(let i in jobsData) {
			this.data['jobs_data'][Object.keys(jobsData[i])[0]] = jobsData[i][Object.keys(jobsData[i])[0]];
		}
	}

	this.getData = () => {
		return this.data;
	};

	this.getJob = () => {
		return this.job;
	};

	this.getStageOnFail = () => {
		return this.stageOnFail;
	};

	this.getStageOnSuccess = () => {
		return this.stageOnSuccess;
	};

	return this;
};