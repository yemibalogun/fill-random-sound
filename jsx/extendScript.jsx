
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
				this.deleteFolderContents(mainFolder);
				break;
			}
		}

		// Create a new "Main folder" if it doesn't exist
		if (!mainFolder) {
			mainFolder = projectRoot.createBin("Main folder");
		}
		return mainFolder;
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
		} else {
			$.writeln('No folder selected.');
		}
		$.writeln('Saving project');
		this.saveProject();

		$.writeln('Finished importFolderStructure');
		$.writeln('...........................................................');
	},

	deleteFolderContents: function(folder) {
		// First, delete all items in the root of the folder (files and subfolders)
		for (var i = folder.children.numItems - 1; i >= 0; i--) {
			var child = folder.children[i];

			writeln('chile.type: ' + child.type + 'ProjectItemType.BIN: ' + ProjectItemType.BIN);
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
	
		// Ensure parentItem is a bin
		if (!(parentItem instanceof ProjectItem) || parentItem.type !== ProjectItemType.BIN) {
			$.writeln('Parent item is not a bin: ' + parentItem.name);
			return;
		}
	
		// Iterate through files in the folder
		for (var i = 0; i < files.length; i++) {
			var file = files[i];
	
			if (file instanceof Folder) {
				$.writeln('Found subfolder: ' + file.name);
				var subFolderBin = parentItem.createBin(file.name);
				this.importFilesInSubFolder(file.fsName, subFolderBin, importedFolders);
			}
		}
	},
	
	importFilesInSubFolder: function(subFolderPath, subFolderBin, importedFolders) {
		var subFolder = new Folder(subFolderPath);
		var subFolderFiles = subFolder.getFiles();
		var mp4File = null;
		var pngFile = null;
	
		for (var j = 0; j < subFolderFiles.length; j++) {
			var subFolderFile = subFolderFiles[j];
	
			if (subFolderFile instanceof File) {
				$.writeln('Found file: ' + subFolderFile.name);
	
				// Import files into the bin
				if (subFolderFile.name.match(/\.mp4$/i)) {
					mp4File = subFolderFile;
				} else if (subFolderFile.name.match(/\.png$/i)) {
					pngFile = subFolderFile;
				}
	
				app.project.importFiles([subFolderFile.fsName], false, subFolderBin, false);
			}
		}
	
		// Add folder details to importedFolders
		if (mp4File && pngFile) {
			importedFolders.push({
				folderName: subFolder.name,
				mp4File: mp4File,
				pngFile: pngFile
			});
			$.writeln('Imported folder details: ' + this.serialize(importedFolders[importedFolders.length - 1]));
		}
	},
	
    processImportedFolders: function() {
		$.writeln('Starting processImportedFolders');
	
		// Retrieve the root item of the project
		var projectRoot = app.project.rootItem;
		var mainFolder = null;

		// Search for "Main folder" in the project
		for (var i = 0; i < projectRoot.children.numItems; i++) {
			var child = projectRoot.children[i];
			if (child.type === ProjectItemType.BIN && child.name === "Main folder") {
				mainFolder = child;
				$.writeln('Main folder bin found: ' + mainFolder.type);
				break;
			}
		}

		// Check if the "Main folder" was found
		if (!mainFolder) {
			$.writeln('Main folder bin not found.');
			return;
		}

		// Initialize the importedFolders array
		this.importedFolders = [];
	
		// Retrieve the subfolders contained in "Main folder"
		$.writeln('Number of children in Main folder: ' + mainFolder.children.numItems);

		for (var i = 0; i < mainFolder.children.numItems; i++) {
			var subfolder = mainFolder.children[i];
			$.writeln('Checking child item: ' + subfolder.name + ', Type: ' + subfolder.type);

			if (subfolder.type === ProjectItemType.BIN) {
				$.writeln('Checking folder: ' + subfolder.name);

				this.importedFolders.push({
					folderName: subfolder.name,
					folderBin: subfolder
				});
				$.writeln('Added folder: ' + subfolder.name);
			}
		}
	
		// Check if this.importedFolders has items
		if (this.importedFolders.length > 0) {
			$.writeln('Number of imported folders: ' + this.importedFolders.length);
	
			// Iterate over each imported folder
			for (var i = 0; i < this.importedFolders.length; i++) {
				var importedFolder = this.importedFolders[i];
	
				// Retrieve MP4 and PNG files from the folder bin
				$.writeln('Searching in bin: ' + importedFolder.folderName + ' for PNG files');
				var pngFile = this.findFileInBin(importedFolder.folderBin, /\.png$/i);

				if (pngFile) {
					$.writeln('PNG file found: ' + pngFile.name);
					this.processSequence(pngFile)
				} else {
					$.writeln('PNG file not found in folder: ' + importedFolder.folderName);
				}

				$.writeln('Searching in bin: ' + importedFolder.folderName + ' for MP4 files');
				var mp4File = this.findFileInBin(importedFolder.folderBin, /\.mp4$/i);

				// Log details about found files
				if (mp4File) {
					$.writeln('MP4 file found: ' + mp4File.name);
					this.processVideo(mp4File)
				} else {
					$.writeln('MP4 file not found in folder: ' + importedFolder.folderName);
				}

				// Replace text graphics layer in the sequence named "Add Name Company" with the folder name
				this.updateTextLayer(importedFolder.folderName);
			}
		} else {
			$.writeln('No subfolders found in "Main folder".');
		}
	
		$.writeln('Finished processImportedFolders');
		$.writeln('_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _');
	},

	updateTextLayer: function(folderName) {
		$.writeln('Updating text layer with folder name: ' + folderName);
	
		// Find the sequence named "Add Name Company"
		var sequenceName = "Add Name Company"; // Adjusted to the correct sequence name
		var sequence = this.findSequenceByName(sequenceName);
	
		if (!sequence) {
			$.writeln('Sequence "' + sequenceName + '" not found.');
			return;
		}
	
		// Iterate through all items in the sequence to find the graphic layer
		var textLayerFound = false;
		for (var j = 0; j < sequence.videoTracks.numItems; j++) {
			var track = sequence.videoTracks[j];
			for (var k = 0; k < track.clips.numItems; k++) {
				var clip = track.clips[k];
				
				$.writeln('clip.projectItem: ' + clip.projectItem + 'projectItem.type: ' + clip.projectItem.type + 'ProjectItemType.GRAPHIC: ' + ProjectItemType.GRAPHIC);

				// Check if the clip is a graphic
				if (clip.projectItem && clip.projectItem.type === ProjectItemType.GRAPHIC) {
					var graphicItem = clip.projectItem;
					
					$.writeln('Found graphic layer: ' + graphicItem.name);
	
					// Access the graphic's text properties
					var textLayers = graphicItem.getTextLayers(); // This is hypothetical; adjust as necessary
					for (var l = 0; l < textLayers.length; l++) {
						var textLayer = textLayers[l];
						$.writeln('Found text layer: ' + textLayer.name);
	
						// Replace the text layer's text with the folder name
						textLayer.text = folderName; // Replace this with the actual method to update text
						textLayerFound = true;
						$.writeln('Text layer updated with: ' + folderName);
						break;
					}
					if (textLayerFound) break;
				}
			}
			if (textLayerFound) break;
		}
	
		if (!textLayerFound) {
			$.writeln('No text layer found in sequence "' + sequenceName + '".');
		}
	},
	
	processSequence: function(pngFile) {
		var sequenceName = "Add Screenshot Indeed";
		var sequence = this.findSequenceByName(sequenceName);
	
		if (!sequence) {
			$.writeln('Sequence named "' + sequenceName + '" not found');
			return;
		}
	
		$.writeln('Sequence found: ' + sequence.name);
		this.replaceFileInSequence(sequence, pngFile);
	},

	processVideo: function(mp4File) {
		var sequenceName = "Add Facebook screenrecords";
		var sequence = this.findSequenceByName(sequenceName);
	
		if (!sequence) {
			$.writeln('Sequence named "' + sequenceName + '" not found');
			return;
		}
	
		$.writeln('Sequence found: ' + sequence.name);
		this.replaceVideoInSequence(sequence, mp4File);
	},

	
	// Utility function to find a file matching a regex in a bin
	findFileInBin: function(bin, regex) {
		$.writeln('Searching in bin: ' + bin.name + ' for files matching: ' + regex);
		$.writeln('Logging ProjectItemType.FILE: ' + ProjectItemType.FILE);

		for (var i = 0; i < bin.children.numItems; i++) {
			var item = bin.children[i];
			$.writeln('Checking item: ' + item.name + ', Type: ' + item.type );


			if (regex.test(item.name)) {
				$.writeln('Match found: ' + item.name);
            	return item;
			}
		}
		$.writeln('No matching file found in bin: ' + bin.name);
		return null;
	},	
	
	// Function to replace a screenshot in a specific sequence
	replaceFileInSequence: function(sequence, newFile) {
		$.writeln('Clearing sequence before placing new file');
		
		var videoTracks = sequence.videoTracks;
		
		// Clear all clips from all video tracks in the sequence
		for (var i = 0; i < videoTracks.numTracks; i++) {
			var track = videoTracks[i];
			$.writeln('Processing track: ' + track.name);
			
			// Use a while loop to remove clips since the collection size changes on removal
			while (track.clips.numItems > 0) {
				var clip = track.clips[0]; // Always remove the first clip
				$.writeln('Removing clip: ' + clip.projectItem.name);
				try {
					track.removeClip(clip); // Ensure this method exists
				} catch (e) {
					$.writeln('Error removing clip: ' + e.message);
				}
			}
		}
		
		$.writeln('Adding new file to the sequence');
		
		if (videoTracks.numTracks > 0) {
			var firstTrack = videoTracks[0];
			$.writeln('First track found: ' + firstTrack.name);
			
			// Verify if newFile is a valid ProjectItem
			if (!newFile) {
				$.writeln('Invalid file provided.');
				return;
			}
			
			var startTime = 0; // Start time in the sequence (e.g., 0 for beginning)
			
			try {
				// Use the Timeline API to add the clip
				var insertPoint = startTime; // Position to insert the new clip
				var duration = newFile.duration; // Duration of the new clip
				
				// Assuming a method to insert clip exists with correct parameters
				sequence.videoTracks[0].insertClip(newFile, insertPoint, duration);
				$.writeln('New file added: ' + newFile.name);
			} catch (e) {
				$.writeln('Error adding file to sequence: ' + e.message);
			}
		} else {
			$.writeln('No video tracks available in the sequence to add new file');
		}
	},
	

	// Function to replace a video in a specific sequence
	replaceVideoInSequence: function(sequence, newVideo) {
		$.writeln('Clearing sequence before placing new video');
		
		var videoTracks = sequence.videoTracks;
		
		// Clear all clips from all video tracks in the sequence
		for (var i = 0; i < videoTracks.numTracks; i++) {
			var track = videoTracks[i];
			$.writeln('Processing track: ' + track.name);
			
			// Use a while loop to remove clips since the collection size changes on removal
			while (track.clips.numItems > 0) {
				var clip = track.clips[0]; // Always remove the first clip
				$.writeln('Removing clip: ' + clip.projectItem.name);
				try {
					track.removeClip(clip); // Ensure this method exists
				} catch (e) {
					$.writeln('Error removing clip: ' + e.message);
				}
			}
		}
		
		$.writeln('Adding new video to the sequence');
		
		if (videoTracks.numTracks > 0) {
			var firstTrack = videoTracks[0];
			$.writeln('First track found: ' + firstTrack.name);
			
			// Verify if newVideo is a valid ProjectItem
			if (!newVideo) {
				$.writeln('Invalid video provided.');
				return;
			}
			
			var startTime = 0; // Start time in the sequence (e.g., 0 for beginning)
			
			try {
				// Use the Timeline API to add the clip
				var insertPoint = startTime; // Position to insert the new clip
				var duration = newVideo.duration; // Duration of the new clip
				
				// Assuming a method to insert clip exists with correct parameters
				sequence.videoTracks[0].insertClip(newVideo, insertPoint, duration);
				$.writeln('New video added: ' + newVideo.name);
			} catch (e) {
				$.writeln('Error adding video to sequence: ' + e.message);
			}
		} else {
			$.writeln('No video tracks available in the sequence to add new video');
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

	// findTextLayerInSequence: function(sequence) {
    //     for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
    //         var track = sequence.videoTracks[i];
    //         for (var j = 0; j < track.clips.numItems; j++) {
    //             var clip = track.clips[j];
	// 			$.writeln('Checking clip: ' + clip.projectItem.name + ', Type: clip.projectItem.type');
    //             // Check if the clip is a text layer by name or type
    //             if (clip.projectItem && clip.projectItem.type === ProjectItemType.GRAPHIC) {
    //                 return clip;
    //             }
    //         }
    //     }
    //     return null;
    // },

	// Function to replace a title in a specific sequence
	// replaceTitleInSequence: function(sequenceName, newTitle) {
	// 	var sequence = this.findSequenceByName(sequenceName);
	// 	if (sequence) {
	// 		var titleItem = this.findTitleItemInSequence(sequence);
	// 		if (titleItem) {
	// 			// Assuming titleItem has a method to change the text
	// 			titleItem.setText(newTitle);
	// 		}
	// 	}
	// },

//     findTitleItemInSequence: function(sequence) {
//         for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
//             var track = sequence.videoTracks[i];
//             for (var j = 0; j < track.clips.numItems; j++) {
//                 var clip = track.clips[j];
//                 if (clip.name.match(/Title/i)) {
//                     return clip;
//                 }
//             }
//         }
//         return null;
//     },

//     findScreenshotItemInSequence: function(sequence) {
//         for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
//             var track = sequence.videoTracks[i];
//             for (var j = 0; j < track.clips.numItems; j++) {
//                 var clip = track.clips[j];
//                 if (clip.projectItem && clip.projectItem.getMediaPath().match(/\.png$/i)) {
//                     return clip;
//                 }
//             }
//         }
//         return null;
//     },

//     findVideoItemInSequence: function(sequence) {
//         for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
//             var track = sequence.videoTracks[i];
//             for (var j = 0; j < track.clips.numItems; j++) {
//                 var clip = track.clips[j];
//                 if (clip.projectItem && clip.projectItem.getMediaPath().match(/\.mp4$/i)) {
//                     return clip;
//                 }
//             }
//         }
//         return null;
//     },

//     resizeItem: function(item, width, height) {
//         // Assuming item has methods to set the scale
//         item.setScaleToFit(width, height);
//     },

	// Utility function to find the "Main folder" bin
	// findMainFolder: function() {
	// 	// Check if app is defined
	// 	if (typeof app === 'undefined') {
	// 		$.writeln("Error: app is undefined");
	// 		return null;
	// 	}
	
	// 	// Check if app.project is defined
	// 	if (typeof app.project === 'undefined') {
	// 		$.writeln("Error: app.project is undefined");
	// 		return null;
	// 	}
	
	// 	// Check if app.project.rootItem is defined
	// 	if (typeof app.project.rootItem === 'undefined') {
	// 		$.writeln("Error: app.project.rootItem is undefined");
	// 		return null;
	// 	}
	
	// 	var rootItem = app.project.rootItem;
	
	// 	// Check if rootItem has children
	// 	if (typeof rootItem.children === 'undefined') {
	// 		$.writeln("Error: rootItem.children is undefined");
	// 		return null;
	// 	}
	
	// 	// Log the number of children
	// 	$.writeln("Number of children: " + rootItem.children.numItems);
	
	// 	// Iterate through the children to find "Main folder"
	// 	for (var i = 0; i < rootItem.children.numItems; i++) {
	// 		var item = rootItem.children[i];
	// 		// Log each item type and name
	// 		$.writeln("Item " + i + ": type=" + item.type + ", name=" + item.name);
	// 		if (item.type === ProjectItemType.BIN && item.name === "Main folder") {
	// 			return item;
	// 		}
	// 	}
	
	// 	// Return null if "Main folder" is not found
	// 	return null;
	// },	
	
	// Utility function to find a subfolder by name within the "Main folder"
	// findBinInMainFolder: function(mainFolder, folderName) {
	// 	for (var i = 0; i < mainFolder.children.numItems; i++) {
	// 		var item = mainFolder.children[i];
	// 		if (item.type === ProjectItemType.FOLDER && item.name === folderName) {
	// 			return item;
	// 		}
	// 	}
	// 	return null;
	// },
}