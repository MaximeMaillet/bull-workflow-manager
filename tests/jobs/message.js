module.exports = async(job) => {

	const {
		body,
		previous,
		workflow: {
			config: wfConfig,
			data: wfData
		}
	} = job.data;

	setTimeout(() => {
			console.log(`${wfData.message} from ${previous}`);
		},
		500);

	return wfData.message;
};