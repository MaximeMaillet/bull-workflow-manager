require('dotenv').config();

const yaml = require('js-yaml');
const fs = require('fs');
const queue = require('./src/queue');

let workflowsDirectory = null;
let jobsDirectory = null;

/**
 * Init
 */
module.exports.init = (config) => {
	readConfiguration(config);
	if(config.hasOwnProperty('parameters')) {
		initParameters(config.parameters);
	}
	return queue.init(jobsDirectory, config);
};

/**
 * Register hook
 * @return {Promise.<void>}
 * @param workflowId
 * @param data
 */
module.exports.register = async(workflowId, data) => {

	const workflowConfigFiles = analyzeWorkflows(workflowsDirectory);

	for(const i in workflowConfigFiles) {
		try {
			if(workflowId === workflowConfigFiles[i].id) {
				checkRequirements(workflowConfigFiles[i], data);
				queue.processStages(workflowConfigFiles[i], data);
			}
		} catch(e) {
			console.log(e.message);
		}
	}
};

/**
 * @param directory
 * @returns {Promise.<Array>}
 */
function analyzeWorkflows(directory) {
	const workflows = fs.readdirSync(directory);
	let configFiles = [];

	for(const i in workflows) {
		try {
			if(fs.existsSync(`${directory}${workflows[i]}/workflow.yml`)) {
				configFiles.push(checkWorkflowFile(`${directory}${workflows[i]}/workflow.yml`, yaml.safeLoad(fs.readFileSync(`${directory}${workflows[i]}/workflow.yml`, 'utf8'))));
			} else {
				configFiles = configFiles.concat(analyzeWorkflows(`${directory}${workflows[i]}/`));
			}
		} catch(e) {
			console.log(e.message);
		}
	}

	return configFiles;
}

/**
 * Check config file workflow.yml
 * @param name
 * @param content
 * @return {*}
 */
function checkWorkflowFile(name, content) {

	if(!content.hasOwnProperty('id')) {
		throw new Error(`'id' missing in ${name}`);
	}

	if(!content.hasOwnProperty('id')) {
		throw new Error(`'stages' missing in ${name}`);
	}

	return content;
}

/**
 * @param doc
 * @param data
 */
function checkRequirements(doc, data) {
	const {requirements} = doc;

	if(!requirements) {
		return true;
	}
	if(requirements.data) {
		for(const i in requirements.data) {
			if(data) {
				Object.keys(requirements.data[i]).map((key) => {
					const dataCompare = getDataCompareFromKey(key, data);
					const dataRequirements = requirements.data[i][key];
					const regex = new RegExp(dataRequirements);

					if(!regex.test(dataCompare)) {
						throw new Error(`[${doc.name}] Requirements not completed : Require ${dataRequirements} ; Give ${dataCompare}`);
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

		if(typeof(dataCompare) === 'object') {
			throw new Error(`Data has no property ${key}`);
		}
	} else {
		if(dataCompare.hasOwnProperty(key)) {
			dataCompare = dataCompare[key];
		} else {
			throw new Error(`Data has no property ${key}`);
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

function initParameters(file) {
	console.log(file);
}