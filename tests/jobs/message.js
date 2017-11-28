module.exports = async(job) => {

	const {
		body,
		previous,
		workflow: {
			config: wfConfig,
			data: wfData
		}
	} = job.data;

	console.log(`${wfData.message} from ${previous}`);
	return wfData.message;
};