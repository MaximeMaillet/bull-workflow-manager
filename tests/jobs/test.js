module.exports = async(job) => {

	const {
		body: {
			content: {
				id
			}
		},
		previous,
		workflow: {
			config: wfConfig,
			data: wfData
		}
	} = job.data;

	if(id === 23) {
		return true;
	} else {
		throw new Error('Fail');
	}
};