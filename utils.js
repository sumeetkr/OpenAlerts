module.exports = {
	mandatoryPayloadKeys: function (req, res, mandatoryKeys) {
		for (var i in mandatoryKeys) {
			//noinspection JSUnfilteredForInLoop
			if (req.body[mandatoryKeys[i]] === undefined) {
				this.sendError(res, 400,
					'Object missing keys.',
					'Object must contain the following: \'' + mandatoryKeys.join(', ') + '\'');
				return true;
			}
		}
		return false;
	},

	sendError: function (res, status, message, description) {
		return res.json(status, {
			message: message,
			description: description
		});
	}
};