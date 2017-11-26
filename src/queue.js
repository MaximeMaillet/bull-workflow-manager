require('dotenv').config();

const Queue = require('bull');
const {promisify} = require('util');
const fs = require('fs');
const Stage = require('./Stage');

const stageOnSuccess = [];
const stageOnFail = [];
let queue = null;

/**
 * Initialize main queue + process all jobs
 */
module.exports.init = (jobsDirectory) => {

	queue = new Queue(this.getQueueName(), `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

	processJobs(jobsDirectory, '');

	queue.on('completed', (job, result) => {
		// Fix for waiting update UI for dont display [Object object]
		if(result === undefined) {
			result = {};
		} else if(typeof(result) === 'string') {
			result = JSON.parse(result)
		}

		addChildToQueue(job.name, stageOnSuccess, result);
	});

	queue.on('failed', (job, err) => {
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
 * @param stage
 */
module.exports.add = (stage) => {
	console.log('Add job : '+stage.getJob());
	addChildJob(stage);
	queue.add(stage.getJob(), stage.getData());
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
					queue.process(prefix+value.substring(0, value.length - 3), function(job) {
						if(process.env.APP_ENV === 'prod') {
							return require(`${dir}${value}`)(job);
						} else if(process.env.APP_ENV === 'test') {
							throw new Error('Test environment, no jobs executed');
						} else {
							throw new Error(`Environment variable is uncorrect : ${process.env.APP_ENV}`);
						}
					});
				}
			});
		});
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
			queue.add(new Stage(conf, data));
			stages.splice(i, 1);
		}
	}
}

/**
 * @param stage
 */
function addChildJob(stage) {
	stageOnSuccess.concat(stage.getStageOnSuccess());
	stageOnFail.concat(stage.getStageOnFail());
}