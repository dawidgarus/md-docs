'use strict';

const assert = require('assert');
const createPermalinksStore = require('../lib/permalinks-store');

it('should create permalink', cb => {
	const permalinks = createPermalinksStore();
	const permalink = permalinks.create('/test/some', 'book', 'chapter');
	assert.strictEqual(permalink, '/test/some');
	cb();	
});

it('should fallback to unique permalink', cb => {
	const permalinks = createPermalinksStore();
	permalinks.create('/test/some', 'book1', 'chapter1');
	const permalink = permalinks.create('/test/some', 'book2', 'chapter2');
	assert.strictEqual(permalink, '/book2/chapter2');
	cb();	
});

it('should unlink permalink', cb => {
	const permalinks = createPermalinksStore();
	permalinks.create('/test/some', 'book1', 'chapter1');
	permalinks.unlink('/test/some');
	const permalink = permalinks.create('/test/some', 'book2', 'chapter2');
	assert.strictEqual(permalink, '/test/some');
	cb();	
});
