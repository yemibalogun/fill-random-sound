
$.runScript = {
	serialize : function (obj) {
		var str = '';
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				var value = obj[key];
				if (value && typeof value === 'object') {
					str += key + ': ' + this.serialize(value) + ', ';
				} else {
					str += key + ': ' + value + ', ';
				}
			}
		}
		return str.slice(0, -2); // Remove the last comma and space
	},
	

	importFiles : function () {
		var filterString = "";
		if (Folder.fs === 'Windows') {
			filterString = "All files:*.*";
		}
		if (app.project) {
			var fileOrFilesToImport = File.openDialog(	"Choose files to import", // title
														filterString, // filter available files?
														true); // allow multiple?
			if (fileOrFilesToImport) {
				// We have an array of File objects; importFiles() takes an array of paths.
				var importThese = [];
				if (importThese) {
					for (var i = 0; i < fileOrFilesToImport.length; i++) {
						importThese[i] = fileOrFilesToImport[i].fsName;
					}
					var suppressWarnings 	= true;
					var importAsStills		= false;
					app.project.importFiles(importThese,
											suppressWarnings,
											app.project.getInsertionBin(),
											importAsStills);
				}
			} else {
				$._PPP_.updateEventPanel("No files to import.");
			}
		}
	},
	
	findOrCreateMainFolder: function() {
        var projectRoot = app.project.rootItem;
        var mainFolder = null;

        // Search for "Main folder" in the project
        for (var i = 0; i < projectRoot.children.numItems; i++) {
            var child = projectRoot.children[i];
            if (child.type === ProjectItemType.BIN && child.name === "Main folder") {
                mainFolder = child;
				// Clear the contents if it already exists
				this.clearBinContents(mainFolder);
                break;
            }
        }

        // If "Main folder" doesn't exist, create it
        if (!mainFolder) {
            mainFolder = projectRoot.createBin("Main folder");
        }

        return mainFolder;
    },

	clearBinContents: function(bin) {
		for (var i = bin.children.numItems - 1; i >= 0; i--) {
			try {
				var child = bin.children[i];
				$.writeln("Removing item: " + child.name);
				child.deleteBin(); // If it is a bin
			} catch (e) {
				try {
					child.deleteFile(); //If it is a file
				} catch (e) {
					$.writeln("Error removing item: " + child.name + " " + e);
				}
			}
		}

	},

    
    replaceTitleInSequence: function(sequenceName, newTitle) {
        var sequence = this.findSequenceByName(sequenceName);
        if (sequence) {
            var titleItem = this.findTitleItemInSequence(sequence);
            if (titleItem) {
                // Assuming titleItem has a method to change the text
                titleItem.setText(newTitle);
            }
        }
    },

    replaceScreenshotInSequence: function(sequenceName, screenshotPath) {
		var sequence = this.findSequenceByName(sequenceName);
		if (sequence) {
			var screenshotItem = this.findScreenshotItemInSequence(sequence);
			if (screenshotItem) {
				var screenshotFile = new File(screenshotPath);
				if (screenshotFile.exists) {
					screenshotItem.setFile(screenshotFile);
					this.resizeItem(screenshotItem, 1920, 1080);
					$.writeln('Screenshot replaced and resized in sequence: ' + sequenceName);
				} else {
					$.writeln('Screenshot file does not exist: ' + screenshotPath);
				}
			} else {
				$.writeln('Screenshot item not found in sequence: ' + sequenceName);
			}
		} else {
			$.writeln('Sequence not found: ' + sequenceName);
		}
	},
	

    replaceVideoInSequence: function(sequenceName, videoPath) {
        var sequence = this.findSequenceByName(sequenceName);
        if (sequence) {
            var videoItem = this.findVideoItemInSequence(sequence);
            if (videoItem) {
                videoItem.replaceWith(videoPath);
            }
        }
    },

    resizeItem: function(item, width, height) {
        // Assuming item has methods to set the scale
        item.setScaleToFit(width, height);
    },	

    importFolderStructure: function() {
		$.writeln('Starting importFolderStructure');
        var rootFolder = Folder.selectDialog("Select the root folder to import");

        if (rootFolder != null) {
            var mainFolder = this.findOrCreateMainFolder();
            var importedFolders = [];

			// Add debug statement before importFoder call
			$.writeln('Calling importFolder with rootFolder: ' + rootFolder.fsName);
            this.importFolder(rootFolder.fsName, mainFolder, importedFolders);

			// Debug: Log the imported folders array
			$.writeln('imported Folders: ' + this.serialize(importedFolders));

            this.importedFolders = importedFolders;

			// Debug: Log the this.importedFolders to ensure it's assigned
			$.writeln('this.importedFolders: ' + this.serialize(this.importedFolders));
		}

		$.writeln('Finished importFolderStructure');
			
	},

	importFolder: function(folderPath, parentItem, importedFolders) {
		$.writeln('Importing folder: ' + folderPath);
		var folder = new Folder(folderPath);
		var files = folder.getFiles();
		var mp4File = null;
		var pngFile = null;
	
		$.writeln('Number of files and folders in ' + folderPath + ': ' + files.length);
	
		for (var i = 0; i < files.length; i++) {
			var file = files[i];
	
			if (file instanceof Folder) {
				$.writeln('Found subfolder: ' + file.name);
				// If it's a subfolder, create a new bin for the subfolder's contents
				var subFolderBin = parentItem.createBin(file.name);
	
				// Recursively import contents of the subfolder
				this.importFolder(file.fsName, subFolderBin, importedFolders);
			} else {
				$.writeln('Found file: ' + file.name);
				// Determine file type
				if (file.name.match(/\.mp4$/i)) {
					mp4File = file;
				} else if (file.name.match(/\.png$/i)) {
					pngFile = file;
				}
	
				// Import the file into the current bin
				app.project.importFiles([file.fsName], false, parentItem, false);
			}
		}
	
		// If both files are found, proceed with the next steps
		if (mp4File && pngFile) {
			importedFolders.push({
				folderName: folder.name,
				mp4File: mp4File,
				pngFile: pngFile
			});
	
			// Debug: Log the folder details
			$.writeln('Imported folder details: ' + this.serialize(importedFolders[importedFolders.length - 1]));
		}
	},
	
    processImportedFolders: function() {
		$.writeln('Starting processImportedFolders');

		// Check if this.importedFolders is defined and has items
		if (this.importedFolders && this.importedFolders.length > 0) {
			$.writeln('Number of imported folders: ' + this.importedFolders.length);

			// Iterate over each imported folder
			for (var i = 0; i < this.importedFolders.length; i++) {
				var importedFolder = this.importedFolders[i];

				// Debug: Log the details of the folder being processed
				$.writeln('Processing folder: ' + this.serialize(importedFolder));

				// Process the folder
				this.processFolder(importedFolder);
			}
		} else {
			$.writeln('No imported folders found or importedFolders array is empty.');
		}

		$.writeln('Finished processImportedFolders');
	},

	processFolder: function(folder) {
		var folderName = folder.folderName;
		var mp4File = folder.mp4File;
		var pngFile = folder.pngFile;
	
		try {
			// Find sequences and update items
			var sequenceNames = ["Add Name Company", "Add Screenshot indeed", "Add Facebook Recording"];
			for (var i = 0; i < sequenceNames.length; i++) {
				var sequenceName = sequenceNames[i];
				var sequence = this.findSequenceByName(sequenceName);
	
				if (sequence) {
					switch (sequenceName) {
						case "Add Name Company":
							var titleItem = this.findTitleItemInSequence(sequence);
							if (titleItem) {
								titleItem.setText(folderName);
								$.writeln('Title updated in sequence: ' + sequenceName);
							} else {
								$.writeln('Title item not found in sequence: ' + sequenceName);
							}
							break;
						case "Add Screenshot indeed":
							var screenshotItem = this.findScreenshotItemInSequence(sequence);
							if (screenshotItem && pngFile) {
								screenshotItem.projectItem.replaceWith(pngFile.fsName);
								this.resizeItem(screenshotItem, 1920, 1080);
								$.writeln('Screenshot replaced and resized in sequence: ' + sequenceName);
							} else {
								if (!screenshotItem) {
									$.writeln('Screenshot item not found in sequence: ' + sequenceName);
								}
								if (!pngFile) {
									$.writeln('PNG file not provided for sequence: ' + sequenceName);
								}
							}
							break;
						case "Add Facebook Recording":
							var videoItem = this.findVideoItemInSequence(sequence);
							if (videoItem && mp4File) {
								videoItem.projectItem.replaceWith(mp4File.fsName);
								$.writeln('Video replaced in sequence: ' + sequenceName);
							} else {
								if (!videoItem) {
									$.writeln('Video item not found in sequence: ' + sequenceName);
								}
								if (!mp4File) {
									$.writeln('MP4 file not provided for sequence: ' + sequenceName);
								}
							}
							break;
						default:
							break;
					}
				} else {
					$.writeln('Sequence not found: ' + sequenceName);
				}
			}
		} catch (error) {
			$.writeln('Error processing folder: ' + error);
		}
	},

    findSequenceByName: function(name) {
        for (var i = 0; i < app.project.sequences.numSequences; i++) {
            if (app.project.sequences[i].name === name) {
                return app.project.sequences[i];
            }
        }
        return null;
    },

    findTitleItemInSequence: function(sequence) {
        for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
            var track = sequence.videoTracks[i];
            for (var j = 0; j < track.clips.numItems; j++) {
                var clip = track.clips[j];
                if (clip.name.match(/Title/i)) {
                    return clip;
                }
            }
        }
        return null;
    },

    findScreenshotItemInSequence: function(sequence) {
        for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
            var track = sequence.videoTracks[i];
            for (var j = 0; j < track.clips.numItems; j++) {
                var clip = track.clips[j];
                if (clip.projectItem && clip.projectItem.getMediaPath().match(/\.png$/i)) {
                    return clip;
                }
            }
        }
        return null;
    },

    findVideoItemInSequence: function(sequence) {
        for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
            var track = sequence.videoTracks[i];
            for (var j = 0; j < track.clips.numItems; j++) {
                var clip = track.clips[j];
                if (clip.projectItem && clip.projectItem.getMediaPath().match(/\.mp4$/i)) {
                    return clip;
                }
            }
        }
        return null;
	},	
    
}