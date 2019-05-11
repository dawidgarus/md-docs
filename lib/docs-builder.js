var bookshelf = require('./bookshelf'),
	fse = require('fs-extra'),
	q = require('q'),
	path = require('path'),
	_ = require('lodash'),
	log = require('./logger'),
	chokidar = require('chokidar'),
	batch = require('./events-batch'),
	sorterFn = require('./sorter')('order', 'title');

var writeFile = fse.writeFile,
	mkdir = fse.mkdirp,
	copy = fse.copy;

function createNotifyReadyFn(cb) {
	var callbackFired = false,
		enabled = false;

	var fn = function() {
		if (enabled && !callbackFired) {
			callbackFired = true;
			cb();
		}
	};
	fn.enable = function() {
		enabled = true;
	};
	return fn;
}

function build(srcPatterns, destDir, options, callback) {
	var b = bookshelf(),
		isWatching = options.watch || false,
		watcher = chokidar.watch(srcPatterns, {ignored: options.ignored}),
		notifyReady = createNotifyReadyFn(function() {
			if (!isWatching) {
				watcher.close();
			} else {
				log.info('Watching changes of', log.colors.green(srcPatterns), 'files');
			}
			callback();
		});

	batch(watcher, function(added, changed, unlinked) {
		var jobs = [];

		function addJob(file, promise) {
			jobs.push(promise.catch(log.error));
		}

		for(var i = 0; i < unlinked.length; i++) {
			b.deleteChapter(unlinked[i]);
		}

		for(var j = 0; j < changed.length; j++) {
			addJob(changed[j], b.updateChapter(changed[j]).then(handleResources));
		}

		for(var k = 0; k < added.length; k++) {
			addJob(added[k], b.addChapter(added[k]).then(handleResources));
		}

		q.allSettled(jobs)
		.then(writeMeta)
		.then(notifyReady)
		.catch(log.error);
	});

	watcher.on('ready', notifyReady.enable);

	function setDestFileData(chapter) {
		var baseFile = path.basename(chapter.meta.fileUrl);
		
		chapter.destDir = path.join(destDir, chapter.meta.bookRef, chapter.meta.ref);
		chapter.destPath = path.join(chapter.destDir, baseFile);

		return q.fcall(function() {
			return chapter;
		});
	}

	function renderChapter(chapter) {
		return mkdir(chapter.destDir)
		.then(function() {
			return writeFile(chapter.destPath, chapter.html)
			.then(function() {
				return chapter;
			});
		});		
	}

	function copyImages(chapter) {
		var copyImagePromises = _.map(chapter.images, function(href) {
			var chapterDir = path.dirname(chapter.path),
				srcImagePath = path.join(chapterDir, href),
				targetPath = path.join(chapter.destDir, 'images', path.basename(href)),
				targetDir = path.dirname(targetPath);

			return mkdir(targetDir)
			.then(function() {
				return copy(srcImagePath, targetPath);
			});
		});
		return q.all(copyImagePromises);
	}

	function writeMeta() {	
		var meta = _.values(b.get());
		
		for(var i = 0; i < meta.length; i++) {
			meta[i].chapters.sort(sorterFn);
		}
		meta.sort(sorterFn);

		var metaJson = JSON.stringify(meta, null, 4);
		log.info('Writing', log.colors.green('books.json'));
		return writeFile(path.join(destDir, 'books.json'), metaJson);
	}

	function handleResources(chapter) {
		return setDestFileData(chapter)
		.then(renderChapter)
		.then(copyImages);
	}
}

module.exports = {
	build: build
}