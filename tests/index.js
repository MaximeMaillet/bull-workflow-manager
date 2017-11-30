const workflow = require('../index');

const config = {
	'redis_host': '127.0.0.1',
	'redis_port': 6379,
	'parameters': `${__dirname}/parameters.yml`,
	'workflows_directory': `${__dirname}/workflows/`,
	'jobs_directory': `${__dirname}/jobs/`,
};

workflow.init(config);

for(let i=0; i<10; i++) {
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

	workflow.register('github-all', {
		'meta': {
			'host': 'https://github.com',
			'action': 'added',
			'object': 'issue'
		},
		'content': {
			'id': 24
		}
	});
}