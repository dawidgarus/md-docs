'use strict';

const docs = require('./../lib/docs-builder');

it('should find all files', cb => {
	docs.build('test/**/*.md', 'test/fixtures/rendered', { watch: false }, cb);
});
