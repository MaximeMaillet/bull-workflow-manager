require('dotenv').config();

const yaml = require('js-yaml');
const {promisify} = require('util');
const fs = require('fs');
const queue = require('./src/queue');
const Stage = require('./src/Stage');

let workflowsDirectory = null;
let jobsDirectory = null;

/**
 * Init
 */
module.exports.init = (config) => {
	readConfiguration(config);

	if(workflowsDirectory === null) {
		throw new Error('Workflows directory missing');
	}

	if(jobsDirectory === null) {
		throw new Error('Jobs directory missing');
	}

	queue.init(jobsDirectory);
};

/**
 * Register hook
 * @param req
 * @return {Promise.<void>}
 */
module.exports.register = async(req) => {

	const workflows = await promisify(fs.readdir)(workflowsDirectory);

	for(const i in workflows) {
		try {
			const doc = yaml.safeLoad(fs.readFileSync(`${workflowsDirectory}${workflows[i]}/workflow.yml`, 'utf8'));
			if(req.params.entity === doc.entity && req.params.action === doc.action) {
				checkRequirements(doc, req.body);

				for (const i in doc.stages) {
					queue.add(new Stage(doc.stages[i], req.body));
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

			Object.keys(requirements.data[i]).map((key) => {
				let dataCompare = data;
				if(key.indexOf('.') !== -1) {
					const arrayKeys = key.split('.');
					for(const j in arrayKeys) {
						dataCompare = dataCompare[arrayKeys[j]];
					}
				} else {
					dataCompare = data[key];
				}

				if(dataCompare) {
					if(typeof(requirements.data[i][key]) === 'string') {
						if(dataCompare !== requirements.data[i][key]) {
							throw new Error(`[${doc.name}] Requirements not completed : Require ${requirements.data[i][key]} ; Give ${dataCompare}`);
						}
					} else if(Array.isArray(requirements.data[i][key])) {
						if(requirements.data[i][key].indexOf(dataCompare) === -1) {
							throw new Error(`[${doc.name}] Requirements not completed : Require ${requirements.data[i][key]} ; Give ${dataCompare}`);
						}
					}
				}
			});
		}
	}
}

/**
 * Read config
 * @param config
 */
function readConfiguration(config) {
	if (config.workflows_directory) {
		workflowsDirectory = config.workflows_directory;
	} else {
		workflowsDirectory = process.env.WORKFLOWS_DIRECTORY;
	}

	if (config.jobs_directory) {
		jobsDirectory = config.jobs_directory;
	} else {
		jobsDirectory = process.env.JOBS_DIRECTORY;
	}
}
