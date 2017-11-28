/**
 * @param config
 * @param data
 * @return {Stage}
 * @constructor
 */
module.exports = Stage;

function Stage(config, data) {
	const name = Object.keys(config)[0];
	this.job = config[name]['job'];
	this.priority = config[name]['priority'];
	this.data = JSON.parse(JSON.stringify(data));
	this.data['workflow'] = {};
	this.stageOnSuccess = [];
	this.stageOnFail = [];

	if (config[name]['on_success']) {
		this.stageOnSuccess.push({
			'name': config[name]['on_success']['name'] || `${name}_on_success`,
			'parent': this.job,
			'child': config[name]['on_success']
		});
	}

	if (config[name]['on_fail']) {
		this.stageOnFail.push({
			'name': config[name]['on_fail']['name'] || `${name}_on_fail`,
			'parent': this.job,
			'child': config[name]['on_fail']
		});
	}

	const jobsData = config[name]['data'];
	if(jobsData && jobsData.length > 0) {
		for(const i in jobsData) {
			this.data['workflow'][Object.keys(jobsData[i])[0]] = jobsData[i][Object.keys(jobsData[i])[0]];
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

	this.getPriority = () => {
		return this.priority;
	};

	return this;
}