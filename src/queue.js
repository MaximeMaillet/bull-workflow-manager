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
		result = {
			"job": result
		};

		addChildToQueue(job.name, stageOnSuccess, result);
	});

	queue.on('failed', (job, err) => {
		err = {
			"job": err
		};

		addChildToQueue(job.name, stageOnFail, err);
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
 * @param conf
 * @param data
 */
module.exports.add = (conf, data) => {
	addToQueue(conf, data);
};

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
					processJobs(dir+value+'/', value+'/');
				}
				else {
					console.log('Job processed : '+prefix+value.substring(0, value.length - 3));
					queue.process(prefix+value.substring(0, value.length - 3), require(`${dir}${value}`));
				}
			});
		});
}

/**
 * Create Stage according to conf + add to queue
 * @param conf
 * @param data
 */
function addToQueue(conf, data) {
	const stage = new Stage(conf, data);
	console.log('Add job : '+stage.getJob());
	addChildJob(stage);
	queue.add(stage.getJob(), stage.getData(), {
		priority: stage.getPriority()
	})
}

/**
 * Add child job to queue
 * @param jobName
 * @param stages
 * @param data
 */
function addChildToQueue(jobName, stages, data) {
	const conf = {};
	for (const i in stages) {
		if(stages[i].parent === jobName) {
			conf[stages[i].name] = stages[i].child;
			addToQueue(conf, data);
			stages.splice(i, 1);
		}
	}
}

/**
 * @param stage
 */
function addChildJob(stage) {
	stageOnSuccess = stageOnSuccess.concat(stage.getStageOnSuccess());
	stageOnFail =	stageOnFail.concat(stage.getStageOnFail());
}