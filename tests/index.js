const workflow = require('../index');

const config = {};
config['workflows_directory'] = `${__dirname}/workflows/`;
config['jobs_directory'] = `${__dirname}/jobs/`;
config['redis_host'] = '127.0.0.1';
config['redis_port'] = 6379;

const queue = workflow.init(config);

workflow.register('github-all', {
	'meta': {
		'host': 'https://github.com',
		'action': ' added',
		'object': 'issue'
	},
	'content': {
		'id': 23
	}
});
//
// workflow.register('github-all', {
// 	'meta': {
// 		'host': 'https://github.com',
// 		'action': 'added',
// 		'object': 'issue'
// 	},
// 	'content': {
// 		'id': 24
// 	}
// });