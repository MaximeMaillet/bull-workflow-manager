require('dotenv').config();

const yaml = require('js-yaml');
const {promisify} = require('util');
const fs = require('fs');
const queue = require('./src/queue');

let workflowsDirectory = null;
let jobsDirectory = null;

/**
 * Init
 */
module.exports.init = (config) => {
	readConfiguration(config);
	queue.init(jobsDirectory);
};

/**
 * Register hook
 * @return {Promise.<void>}
 * @param workflowId
 * @param data
 */
module.exports.register = async(workflowId, data) => {

	const workflows = await promisify(fs.readdir)(workflowsDirectory);

	for(const i in workflows) {
		try {
			const doc = yaml.safeLoad(fs.readFileSync(`${workflowsDirectory}${workflows[i]}/workflow.yml`, 'utf8'));
			if(workflowId === doc.id) {
				checkRequirements(doc, data);

				for (const i in doc.stages) {
					queue.add(doc.stages[i], data);
				}
			}
		} catch(e) {
			console.log(e.message);
		}
	}
};

/**
 * @param doc
 * @param data
 */
function checkRequirements(doc, data) {
	const requirements = doc.requirements;

	if(!requirements) {
		return true;
	}

	if(requirements.data) {
		for(const i in requirements.data) {
			if(data) {
				Object.keys(requirements.data[i]).map((key) => {

					const dataCompare = getDataCompareFromKey(key, data);

					if(typeof(requirements.data[i][key]) === 'string') {
						if(dataCompare !== requirements.data[i][key]) {
							throw new Error(`[${doc.name}] Requirements not completed : Require ${requirements.data[i][key]} ; Give ${dataCompare}`);
						}
					} else if(Array.isArray(requirements.data[i][key])) {
						if(requirements.data[i][key].indexOf(dataCompare) === -1) {
							throw new Error(`[${doc.name}] Requirements not completed : Require ${requirements.data[i][key]} ; Give ${dataCompare}`);
						}
					}

				});
			} else {
				throw new Error(`[${doc.name}] Requirements not completed : no data given`);
			}
		}
	}
}

/**
 * Get data according to key
 * @param key
 * @param data
 * @return {*}
 */
function getDataCompareFromKey(key, data) {
	let dataCompare = data;

	if(key.indexOf('.') !== -1) {
		const arrayKeys = key.split('.');
		for(const j in arrayKeys) {
			if(dataCompare.hasOwnProperty(arrayKeys[j])) {
				dataCompare = dataCompare[arrayKeys[j]];
			}
		}
	} else {
		if(dataCompare.hasOwnProperty(key)) {
			dataCompare = dataCompare[key];
		}
	}

	return dataCompare;
}

/**
 * Read config
 * @param config
 */
function readConfiguration(config) {
	if (config && config.workflows_directory) {
		workflowsDirectory = config.workflows_directory;
	} else {
		workflowsDirectory = process.env.WORKFLOWS_DIRECTORY;
	}

	if (config && config.jobs_directory) {
		jobsDirectory = config.jobs_directory;
	} else {
		jobsDirectory = process.env.JOBS_DIRECTORY;
	}

	if(!workflowsDirectory) {
		throw new Error('Workflows directory missing');
	}

	if(!jobsDirectory) {
		throw new Error('Jobs directory missing');
	}

	if(workflowsDirectory.substr(workflowsDirectory.length -1) !== '/') {
		workflowsDirectory = `${workflowsDirectory}/`;
	}

	if(jobsDirectory.substr(jobsDirectory.length -1) !== '/') {
		jobsDirectory = `${jobsDirectory}/`;
	}
}
