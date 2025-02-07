/** @type {import("./src/config.js").Config} */
export default {
	labelFilePattern: ".+(en|de)\\.json",
	languagePriority: ["en", "de"],
	mustHaveLabelFiles: ["en", "de"],
	jsonPath: "$.%lang",
};
