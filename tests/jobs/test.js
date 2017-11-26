module.exports = async(job) => {

	const {content: {id}} = job.data;
	if(id === 23) {
		return true;
	} else {
		throw new Error('Fail');
	}
};