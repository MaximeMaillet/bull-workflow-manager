require('dotenv').config();

const Queue = require('bull');
const {promisify} = require('util');
const fs = require('fs');
const Stage = require('./Stage');

let stageOnSuccess = [];
let stageOnFail = [];
let queue = null;

/**
 * Initialize main queue + process all jobs
 */
module.exports.init = (jobsDirectory, config) => {

	let redisHost = process.env.REDIS_HOST || config['redis_host'];
	let redisPort = process.env.REDIS_PORT || config['redis_port'];

	if(!redisHost) {
		console.warn('Missing environnement REDIS_HOST, default used (127.0.0.1)');
		redisHost = '127.0.0.1';
	}

	if(!redisPort) {
		console.warn('Missing environnement REDIS_PORT, default used (6379)');
		redisPort = 6379;
	}

	queue = new Queue(this.getQueueName(), `redis://${redisHost}:${redisPort}`);
	queue.empty();

	processJobs(jobsDirectory, '');

	queue.on('completed', (job, result) => {
		addChildToQueue(stageOnSuccess, job, result);
	});

	queue.on('failed', (job, err) => {
		addChildToQueue(stageOnFail, job, err);
	});
};

/**
 * Return name of queue
 * @return {*|string}
 */
module.exports.getQueueName = () => {
	return process.env.QUEUE_NAME || 'global-jobs';
};

/**
 * Add job to queue
 * @param confParent
 * @param data
 */
module.exports.processStages = (confParent, data) => {
	for (const stagePosition in confParent.stages) {
		const name = Object.keys(confParent.stages[stagePosition])[0];
		const stageConfig = confParent.stages[stagePosition][name];
		addStage(new Stage(stageConfig, name), data, null, confParent);
	}
};

/**
 * @param stage
 * @param data
 * @param previous
 * @param confParent
 */
function addStage(stage, data, previous, confParent) {
	console.log(`Stage(${stage.getName()}) :: Add job(${stage.getJob()})`);
	queue.add(
		stage.getJob(),
		{
			'body': data,
			'previous': previous,
			'workflow': {
				'config': {
					'name': confParent.name,
					'description': confParent.description,
					'id': confParent.id
				},
				'stage': {
					'name': stage.getName()
				},
				'data': stage.getData()
			}
		},
		{
			jobId: stage.getId(),
			priority: stage.getPriority()
		}
	);

	addChildJob(stage, confParent, data);
}

/**
 * Process all jobs
 * @param dir
 * @param prefix
 */
function processJobs(dir, prefix) {
	promisify(fs.readdir)(dir)
		.then((dirList) => {
			dirList.map((value) => {
				const file = fs.statSync(dir+value);

				if(file.isDirectory()) {
					processJobs(`${dir}${value}/`, `${prefix}${value}/`);
				}
				else {
					console.log(`Job processed : ${prefix}${value.substring(0, value.length - 3)}`);
					queue.process(prefix+value.substring(0, value.length - 3), require(`${dir}${value}`));
				}
			});
		});
}

/**
 * Add child job to queue
 * @param stages
 * @param job
 * @param data
 */
function addChildToQueue(stages, job, data) {
	for (const i in stages) {
		if(stages[i].parent.getId() === job.id) {
			addStage(stages[i].child, stages[i].data, data, stages[i].confParent);
			stages.splice(i, 1);
		}
	}
}

/**
 * @param stage
 * @param confParent
 * @param data
 */
function addChildJob(stage, confParent, data) {
	if(stage.getOnSuccess() !== null) {
		stageOnSuccess.push(Object.assign(stage.getOnSuccess(), {
			'data': data,
			'confParent': confParent
		}));
	}

	if(stage.getOnFail() !== null) {
		stageOnFail.push(Object.assign(stage.getOnFail(), {
			'data': data,
			'confParent': confParent
		}));
	}
}