
$.runScript = {
	// Utility function to serialize objects into string representations
	serialize: function (obj) {
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

	// Function to save the current project
	saveProject: function () {
		app.project.save();
	},

	// Function to handle file imports through a dialog
	importFiles: function () {
		var filterString = "";
		if (Folder.fs === 'Windows') {
			filterString = "All files:*.*";
		}
		if (app.project) {
			var fileOrFilesToImport = File.openDialog("Choose files to import", filterString, true);
			if (fileOrFilesToImport) {
				var importThese = [];
				if (importThese) {
					for (var i = 0; i < fileOrFilesToImport.length; i++) {
						importThese[i] = fileOrFilesToImport[i].fsName;
					}
					var suppressWarnings = true;
					var importAsStills = false;
					app.project.importFiles(importThese, suppressWarnings, app.project.getInsertionBin(), importAsStills);
				}
			} else {
				$.runScript.updateEventPanel("No files to import.");
			}
		}
	},

	// Function to find or create the "Main folder" in the project
	findOrCreateMainFolder: function() {
		var projectRoot = app.project.rootItem;
		var mainFolder = null;

		// Search for "Main folder" in the project
		for (var i = 0; i < projectRoot.children.numItems; i++) {
			var child = projectRoot.children[i];
			if (child.type === ProjectItemType.BIN && child.name === "Main folder") {
				mainFolder = child;
				// Delete Main folder if it exists
				child.remove();
				break;
			}
		}

		// If "Main folder" doesn't exist, create it
		if (!mainFolder) {
			mainFolder = projectRoot.createBin("Main folder");
		}

		return mainFolder;
	},

	// Function to clear all contents of a bin
	// clearBinContents: function(bin) {
	// 	for (var i = bin.children.numItems - 1; i >= 0; i--) {
	// 		try {
	// 			var child = bin.children[i];
	// 			$.writeln("Removing item: " + child.name);
	// 			child.remove(); // If it is a bin
	// 		} catch (e) {
	// 			try {
	// 				child.remove(); // If it is a file
	// 			} catch (e) {
	// 				$.writeln("Error removing item: " + child.name + " " + e);
	// 			}
	// 		}
	// 	}
	// },

	// Function to replace a title in a specific sequence
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

	// Function to replace a screenshot in a specific sequence
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

	// Function to replace a video in a specific sequence
	replaceVideoInSequence: function(sequenceName, videoPath) {
		var sequence = this.findSequenceByName(sequenceName);
		if (sequence) {
			var videoItem = this.findVideoItemInSequence(sequence);
			if (videoItem) {
				videoItem.replaceWith(videoPath);
			}
		}
	},

	// Function to resize an item to specified width and height
	resizeItem: function(item, width, height) {
		// Assuming item has methods to set the scale
		item.setScaleToFit(width, height);
	},

	// Function to import folder structure into the project
	importFolderStructure: function() {
		$.writeln('Starting importFolderStructure');
		var rootFolder = Folder.selectDialog("Select the root folder to import");

		if (rootFolder != null) {
			var mainFolder = this.findOrCreateMainFolder();
			var importedFolders = [];

			// Add debug statement before importFolder call
			$.writeln('Calling importFolder with rootFolder: ' + rootFolder.fsName);
			this.importFolder(rootFolder.fsName, mainFolder, importedFolders);

			// Debug: Log the imported folders array
			$.writeln('Imported folders: ' + this.serialize(importedFolders));

			this.importedFolders = importedFolders;

			// Debug: Log the this.importedFolders to ensure it's assigned
			$.writeln('this.importedFolders: ' + this.serialize(this.importedFolders));
		}
		$.writeln('Saving project');
		this.saveProject();

		$.writeln('Finished importFolderStructure');
	},

	deleteFolderContents: function(folder) {
		// First, delete all items in the root of the folder (files and subfolders)
		for (var i = folder.children.numItems - 1; i >= 0; i--) {
			var child = folder.children[i];
			try {
				// Check if the item is a bin (subfolder) and recursively delete its contents
				if (child.type === ProjectItemType.BIN) {
					this.deleteFolderContents(child); // Recursively delete contents of the subfolder
					child.remove(); // Remove the empty subfolder
				} else {
					child.remove(); // Remove the file
				}
			} catch (e) {
				$.writeln("Error removing item: " + child.name + " " + e);
			}
		}
	},
	

	importFolder: function(folderPath, parentItem, importedFolders) {
		$.writeln('Importing folder: ' + folderPath);
		var folder = new Folder(folderPath);
		var files = folder.getFiles();
		var mp4File = null;
		var pngFile = null;
	
		// Find or create "Main folder"
		var mainFolder = this.findOrCreateMainFolder();
		if (mainFolder) {
			$.writeln('Main folder found. Deleting its contents...');
			this.deleteFolderContents(mainFolder);
		} else {
			$.writeln('Main folder not found. Creating a new one...');
			mainFolder = this.createFolder(parentItem, "Main folder");
		}
	
		$.writeln('Number of files and folders in ' + folderPath + ': ' + files.length);
	
		for (var i = 0; i < files.length; i++) {
			var file = files[i];
	
			if (file instanceof Folder) {
				$.writeln('Found subfolder: ' + file.name);
				var subFolderBin = parentItem.createBin(file.name);
				this.importFolder(file.fsName, subFolderBin, importedFolders);
			} else {
				$.writeln('Found file: ' + file.name);
	
				// Check if the file already exists in the "Main folder"
				var existingItem = this.findFileInBin(parentItem, new RegExp(file.name + '$', 'i'));
				if (existingItem) {
					$.writeln('File already exists: ' + file.name);
					continue;
				}
	
				if (file.name.match(/\.mp4$/i)) {
					mp4File = file;
				} else if (file.name.match(/\.png$/i)) {
					pngFile = file;
				}
	
				// Import the file into the current bin
				app.project.importFiles([file.fsName], false, parentItem, false);
			}
		}
	
		if (mp4File && pngFile) {
			importedFolders.push({
				folderName: folder.name,
				mp4File: mp4File,
				pngFile: pngFile
			});
	
			$.writeln('Imported folder details: ' + this.serialize(importedFolders[importedFolders.length - 1]));
		}
	},
	

	
    processImportedFolders: function() {
		$.writeln('Starting processImportedFolders');
	
		// Retrieve the "Main folder" bin
		var mainFolder = this.findMainFolder();
		if (!mainFolder) {
			$.writeln('Main folder bin not found.');
			return;
		}
	
		// Check if this.importedFolders is defined and has items
		if (this.importedFolders && this.importedFolders.length > 0) {
			$.writeln('Number of imported folders: ' + this.importedFolders.length);
	
			// Iterate over each imported folder
			for (var i = 0; i < this.importedFolders.length; i++) {
				var importedFolder = this.importedFolders[i];
	
				// Retrieve the subfolder within the "Main folder"
				var folderBin = this.findBinInMainFolder(mainFolder, importedFolder.folderName);
				if (!folderBin) {
					$.writeln('Subfolder not found for: ' + importedFolder.folderName);
					continue;
				}
	
				// Retrieve MP4 and PNG files from the folder bin
				var mp4File = this.findFileInBin(folderBin, /\.mp4$/i);
				var pngFile = this.findFileInBin(folderBin, /\.png$/i);

				// Check if the files are found
				if (!mp4File || !pngFile) {
					$.writeln('Required files not found in folder: ' + importedFolder.folderName);
					continue;
				}
	
				// Debug: Log the details of the folder being processed
				$.writeln('Processing folder: ' + this.serialize(importedFolder));
	
	
				// Add files to the imported folder metadata
				importedFolder.mp4File = mp4File;
				importedFolder.pngFile = pngFile;
	
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
	
	// Utility function to find the "Main folder" bin
	findMainFolder: function() {
		for (var i = 0; i < app.project.rootFolder.children.numItems; i++) {
			var item = app.project.rootFolder.children[i];
			if (item.type === ProjectItemType.FOLDER && item.name === "Main folder") {
				return item;
			}
		}
		return null;
	},
	
	// Utility function to find a subfolder by name within the "Main folder"
	findBinInMainFolder: function(mainFolder, folderName) {
		for (var i = 0; i < mainFolder.children.numItems; i++) {
			var item = mainFolder.children[i];
			if (item.type === ProjectItemType.FOLDER && item.name === folderName) {
				return item;
			}
		}
		return null;
	},
	
	// Utility function to find a file matching a regex in a bin
	findFileInBin: function(bin, regex) {
		for (var i = 0; i < bin.children.numItems; i++) {
			var item = bin.children[i];
			if (item.type === ProjectItemType.FILE && item.name.match(regex)) {
				return item;
			}
		}
		return null;
	},
	

	findTextLayerInSequence: function(sequence) {
        for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
            var track = sequence.videoTracks[i];
            for (var j = 0; j < track.clips.numItems; j++) {
                var clip = track.clips[j];
				$.writeln('Checking clip: ' + clip.projectItem.name + ', Type: clip.projectItem.type');
                // Check if the clip is a text layer by name or type
                if (clip.projectItem && clip.projectItem.type === ProjectItemType.GRAPHIC) {
                    return clip;
                }
            }
        }
        return null;
    },

	processFolder: function(folder) {
		$.writeln('Starting processFolder');
		var folderName = folder.folderName;
		var mp4File = folder.mp4File; // Already imported MP4 file
    	var pngFile = folder.pngFile; // Already imported PNG file
		
		try {
			var sequenceNames = ["Add Name Company", "Add Screenshot indeed", "Add Facebook Recording"];
			for (var i = 0; i < sequenceNames.length; i++) {
				var sequenceName = sequenceNames[i];
				var sequence = this.findSequenceByName(sequenceName);
	
				if (sequence) {
					switch (sequenceName) {
						case "Add Name Company":
							var textLayer = this.findTextLayerInSequence(sequence);
							if (textLayer) {
								textLayer.projectItem.setName(folderName);
								$.writeln('Text layer updated in sequence: ' + sequenceName);
							} else {
								$.writeln('Text layer not found in sequence: ' + sequenceName);
							}
							break;
						case "Add Screenshot indeed":
							var screenshotItem = this.findScreenshotItemInSequence(sequence);
							if (screenshotItem && pngFile) {
								// Replace existing PNG item
								screenshotItem.remove();
								sequence.videoTracks[0].insertClip(pngFile, screenshotItem.start);
								this.resizeItem(pngFile, 1920, 1080);
								$.writeln('Screenshot replaced and resized in sequence: ' + sequenceName);
							} else {
								$.writeln('Screenshot item not found or PNG file not provided for sequence: ' + sequenceName);
							}
							break;
						case "Add Facebook Recording":
							var videoItem = this.findVideoItemInSequence(sequence);
							if (videoItem && mp4File) {
								// Replace existing MP4 item
								videoItem.remove();
								sequence.videoTracks[0].insertClip(mp4File, videoItem.start);
								$.writeln('Video replaced in sequence: ' + sequenceName);
							} else {
								$.writeln('Video item not found or MP4 file not provided for sequence: ' + sequenceName);
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

    resizeItem: function(item, width, height) {
        // Assuming item has methods to set the scale
        item.setScaleToFit(width, height);
    },
}