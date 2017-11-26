module.exports = async(job) => {
	const {workflow: {message}} = job.data;
	console.log(message);
	return message;
};