require('dotenv').config();

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const queue = require('./src/queue');
const Guid = require('guid');
const _get = require('lodash.get');

let workflowsDirectory = null;
let jobsDirectory = null;
let globalParameters = null;
const workflows = {};

/**
 * Init
 */
module.exports.init = (_config) => {
	initialize(_config);
};

module.exports.addDependencies = (dependancies) => {
	try {
		const stat = fs.statSync(dependancies);
		if(stat.isDirectory()) {
			const statParameters = fs.statSync(`${dependancies}/parameters.yml`);
			if(statParameters.isFile()) {
				initParameters({
					parameters: `${dependancies}/parameters.yml`
				});
			}

			const statWorkflows = fs.statSync(`${dependancies}/workflows`);
			if(statWorkflows.isDirectory()) {
				hydrateWorkflow(`${dependancies}/workflows/`);
			}

		}
	} catch(e) {
		const module = require(dependancies);
		const module_path = path.dirname(require.resolve(dependancies));
		Object.keys(module).map((val) => {
			if(module[val].substr(0,1) === '.') {
				module[val] = `${module_path}${module[val].substr(1)}`;
			}
		});
		module.fromDependencies = true;
		initialize(module);
	}
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

function initialize(config) {
	config = readConfiguration(config);
	initParameters(config.parameters);

	if(config.workflows_directory) {
		hydrateWorkflow(config.workflows_directory);
	}

	queue.init(config.jobs_directory, config);
}

/**
 * @param directory
 */
function hydrateWorkflow(directory) {
	const workflowConfigFiles = analyzeWorkflows(directory);
	for(const i in workflowConfigFiles) {
		const id = Guid.raw();
		workflows[id] = {
			id: id,
			workflow: workflowConfigFiles[i],
			stages: queue.processStages(workflowConfigFiles[i])
		};
		replaceContentWithGlobalParameters(workflows[id].stages);
	}
}

/**
 * @param directory
 * @returns {Promise.<Array>}
 */
function analyzeWorkflows(directory) {
	const workflows = fs.readdirSync(directory);
	let configFiles = [];

	for(const i in workflows) {
		try {
			if(workflows[i] === 'workflow.yml') {
				configFiles.push(getContentWorkflowFile(`${directory}/workflow.yml`));
			} else {
				if(fs.existsSync(`${directory}${workflows[i]}/workflow.yml`)) {
					configFiles.push(getContentWorkflowFile(`${directory}${workflows[i]}/workflow.yml`));
				} else {
					configFiles = configFiles.concat(analyzeWorkflows(`${directory}${workflows[i]}/`));
				}
			}
		} catch(e) {
			throw e;
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
		try {
			for(const i in requirements.data) {
				if(data) {
					Object.keys(requirements.data[i]).map((key) => {
						const dataRequirements = requirements.data[i][key];
						const dataCompare = _get(data, key);
						const regex = new RegExp(formatRegex(dataRequirements, data));

						if(!dataCompare) {
							throw new Error(`Requirements not completed : no data given for ${key}`);
						}

						if(!regex.test(dataCompare)) {
							throw new Error(`Requirements not completed : Require ${regex} ; Give ${dataCompare}`);
						}
					});
				} else {
					throw new Error('Requirements not completed : no data given');
				}
			}
		} catch(e) {
			throw new Error(`[${doc.name}] ${e.message}`);
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
			if(dataCompare && dataCompare.hasOwnProperty(arrayKeys[j])) {
				dataCompare = dataCompare[arrayKeys[j]];
			}
		}

		if(typeof(dataCompare) === 'object') {
			throw new Error(`Data has no property ${key}`);
		}
	} else {
		if(dataCompare && dataCompare.hasOwnProperty(key)) {
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
 * @param fromDependencies
 */
function readConfiguration(config) {

	if(!config.fromDependencies) {
		config.fromDependencies = false;
	}

	if (config && config.parameters && config.parameters.substr(-3) !== 'yml') {
		throw new Error(`Parameters file is not YAML : ${config.parameters}`);
	}

	if (!config.fromDependencies && (!config || !config.workflows_directory)) {
		throw new Error('Workflows directory missing');
	}

	if (!config || !config.jobs_directory) {
		throw new Error('Jobs directory missing');
	}

	if(config.workflows_directory && config.workflows_directory.substr(config.workflows_directory.length -1) !== '/') {
		config.workflows_directory = `${config.workflows_directory}/`;
	}

	if(config.jobs_directory.substr(config.jobs_directory.length -1) !== '/') {
		config.jobs_directory = `${config.jobs_directory}/`;
	}

	return config;
}

/**
 * Initialize parameters file
 * @param parameters_file
 */
function initParameters(parameters_file) {
	const file = parameters_file || null;

	if(!file || !fs.existsSync(file)) {
		console.log(`Parameters not found at ${file}`);
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

/**
 * @param stages
 */
function replaceContentWithGlobalParameters(stages) {
	let stage = null;
	const reg = /^%([a-zA-Z0-9-_]+)%$/;

	for(const i in stages) {
		stage = stages[i];
		if(stage.getData() !== null) {
			Object.keys(stage.getData()).map((value) => {
				stage.getData()[value] = replaceDataWithParameters(stage.getData()[value], globalParameters);
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

/**
 * @param regex
 * @param parameters
 * @returns {*}
 */
function formatRegex(regex, parameters) {
	const reg = /(.*)%([a-zA-Z0-9-_.]+)%(.*)/;
	if(reg.test(regex)) {
		return regex.replace(reg, `$1${_get(parameters, regex.replace(reg, '$2'))}$3`);
	}
	return regex;
}

/**
 * @param data
 * @param parameters
 * @returns {*}
 */
function replaceDataWithParameters(data, parameters) {
	const reg = /^%([a-zA-Z0-9-_]+)%$/;
	if(reg.test(data)) {
		return data.replace(reg, _get(parameters, data.replace(reg, '$1')));
	}
	return data;
}