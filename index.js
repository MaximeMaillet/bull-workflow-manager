require('dotenv').config();

const yaml = require('js-yaml');
const fs = require('fs');
const queue = require('./src/queue');
const Guid = require('guid');

let workflowsDirectory = null;
let jobsDirectory = null;
let globalParameters = null;
const workflows = {};

/**
 * Init
 */
module.exports.init = (config) => {
	readConfiguration(config);
	if(config && config.hasOwnProperty('parameters')) {
		initParameters(config.parameters);
	}

	const workflowConfigFiles = analyzeWorkflows(workflowsDirectory);
	for(const i in workflowConfigFiles) {
		const id = Guid.raw();
		workflows[id] = {
			id: id,
			workflow: workflowConfigFiles[i],
			stages: queue.processStages(workflowConfigFiles[i])
		};
		replaceContentWithGlobalParameters(workflows[id].stages);
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
	Object.keys(workflows).map((value) => {
		try {
			if(workflowId === workflows[value]['workflow']['id']) {
				checkRequirements(workflows[value]['workflow'], data);
				queue.addStages(workflows[value]['stages'], data, workflows[value]['workflow']);
			}
		} catch(e) {
			console.log(e.message);
		}
	});
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
				configFiles.push(getContentWorkflowFile(`${directory}${workflows[i]}/workflow.yml`));
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
 * @param file
 * @returns {*}
 */
function getContentWorkflowFile(file) {
	const content = yaml.safeLoad(fs.readFileSync(file, 'utf8'));
	checkWorkflowFile(file, content);
	console.log(`Workflow added ${content.name} (${content.id})`);
	return content;
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

/**
 * Initialize parameters file
 * @param file
 */
function initParameters(file) {
	if(!fs.existsSync(file)) {
		console.log(`${file} not found`);
	} else {
		globalParameters = yaml.safeLoad(fs.readFileSync(file, 'utf8'))['parameters'];
		const regex = /^%env\(([a-zA-Z0-9-_]+)\)%$/;

		if(globalParameters) {
			Object.keys(globalParameters).map((value) => {
				if(typeof(globalParameters[value]) === 'string' && regex.test(globalParameters[value])) {
					globalParameters[value] = process.env[globalParameters[value].replace(regex, '$1')];
				}
			});
		}
	}
}

function replaceContentWithGlobalParameters(stages) {

	let stage = null;
	const reg = /^%([a-zA-Z0-9-_]+)%$/;

	for(const i in stages) {
		stage = stages[i];
		if(stage.getData() !== null) {
			Object.keys(stage.getData()).map((value) => {
				const data = stage.getData()[value];
				if(reg.test(data)) {
					stage.getData()[value] = globalParameters[data.replace(reg, '$1')];
				}
			});
		}
	}

	// for(const i in workflowContent.stages) {
	// 	stage = workflowContent.stages[i][Object.keys(workflowContent.stages[i])[0]];
	//
	//
	// 	if(stage.hasOwnProperty('on_success')) {
	//
	// 	}
	//
	// 	if(stage.hasOwnProperty('on_fail')) {
	//
	// 	}
	// }
	//
	// Object.keys(globalParameters).map((param) => {
	// 	// console.log(param);
	// });


	// throw new Error('coucouc');
}