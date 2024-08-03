
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
					this.processVideo(mp4File);
				} else {
					$.writeln('MP4 file not found in folder: ' + importedFolder.folderName);
				}

				// Replace text graphics layer in the sequence named "Add Name Company" with the folder name
				this.updateTextLayer(importedFolder.folderName);

				// Save sequence to "Ready for Export" bin
				this.saveSequenceToReadyForExport(importedFolder.folderName);

			}
		} else {
			$.writeln('No subfolders found in "Main folder".');
		}
	
		$.writeln('Finished processImportedFolders');
		$.writeln('_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _');
	},

	updateTextLayer: function(folderName) {
		$.writeln('Updating text layer with folder name: ' + folderName);
		
		// Check if folderName is undefined or empty
		if (!folderName) {
			$.writeln('Error: folderName is undefined or empty.');
			return;
		}
		
		// Find the sequence named "Add Name Company"
		var sequenceName = "Add Name Company";
		var sequence = this.findSequenceByName(sequenceName);
		
		if (!sequence) {
			$.writeln('Sequence "' + sequenceName + '" not found.');
			return;
		}
		
		$.writeln('Sequence "' + sequenceName + '" found.');
		
		var track = sequence.videoTracks[1];
		$.writeln('Processing second track: ' + track.name);
		
		var localPath = "C:\\Users\\OMEN 15 Pro\\Desktop\\mytemplates\\Yemi moGRT\\Yemi moGRT Demo.mogrt";
		var time = '0';
		var vidTrack = 1;
		var audTrack = 0;
		
		// Check if there are clips in the second track
		if (track.clips.numItems > 0) {
			$.writeln('Found ' + track.clips.numItems + ' clips in the second track.');
			
			// Remove all clips from the second track
			for (var i = track.clips.numItems - 1; i >= 0; i--) {
				track.clips[i].remove(true, true);
			}
			$.writeln('All clips removed from ' + track.name);
		} else {
			$.writeln('No clips found in the second track.');
		}
		
		// Import new MoGRT
		try {
			var newMOGRT = sequence.importMGT(localPath, time, vidTrack, audTrack);
			$.writeln('New MoGRT imported: ' + newMOGRT);

			if (newMOGRT) {
				$.writeln('newMOGRT found: ' + newMOGRT.name);

				// Access the MoGRT Components
				var components = newMOGRT.getMGTComponent();
				$.writeln('Components found: ' + components);

				if (components) {
					// Check for the 'getParamForDisplayName' method and set the value
					for (var i = 0; i < components.properties.numItems; i++) {
						var property = components.properties[i];
						$.writeln('Property ' + i + ': ' + property.displayName);
	
						if (property.displayName === 'Yemi moGRT Demo') {
							property.setValue(folderName);
							$.writeln('Text layer updated with: ' + folderName);
						}
					}
				} else {
					$.writeln('No components found in the MoGRT.');
				}
			} else {
				$.writeln('Failed to import MoGRT.');
			}
		} catch (e) {
			$.writeln('Error importing MoGRT: ' + e.message);
		}
	},


	 
	processSequence: function(pngFile) {
		var sequenceName = "Add Screenshot Indeed";
		var sequence = this.findSequenceByName(sequenceName);
		var newDurationInSeconds = 1200;
	
		if (!sequence) {
			$.writeln('Sequence named "' + sequenceName + '" not found');
			return;
		}
	
		$.writeln('Sequence found: ' + sequence.name);
		this.replaceFileInSequence(sequence, pngFile, newDurationInSeconds);
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
	replaceFileInSequence: function(sequence, pngFile, newDurationInSeconds) {
		$.writeln('Clearing sequence before placing new file');
		
		var videoTracks = sequence.videoTracks;

		// Ensure the sequence has at east two video tracks
		if (videoTracks.numTracks < 2) {
			$.writeln('Sequence does not have a second video track');
			return;
		}

		// Process only the second video track (index 1)
		var secondTrack = videoTracks[1];
		$.writeln('Processing second track: ' + secondTrack.name);

		// Check if there is more than one clip in the second track 
		if (secondTrack.clips.numItems > 0) {
			$.writeln('Found ' + secondTrack.clips.numItems + ' clips in the second track. Removing the track.');

			// Remove all clips from the second track
			for (var i = secondTrack.clips.numItems - 1; i >= 0; i--) {
				secondTrack.clips[i].remove(true, true);
			}
			$.writeln('All clips removed from ' + secondTrack.name);

			// Insert the new clip into the second track
			try {
				var startTime = 0; // Start time in the sequence (e.g., 0 for beginning)
				var newClip = secondTrack.insertClip(pngFile, startTime);
				
				$.writeln('Successfully inserted new image into the first track: ' + pngFile.name);
				
				


			} catch (e) {
				$.writeln('Error inserting new image: ' + e.message);
			}
		} else {
			// If there are no clips, insert the new clip into the second track
			$.writeln('Second track is empty. Adding new file.');
			var startTime = 0; // Start time in the sequence (e.g., 0 for beginning)

			try {
				var startTime = 0; // Start time in the sequence (e.g., 0 for beginning)
				var newClip = secondTrack.insertClip(pngFile, startTime);
				
				
				$.writeln('Successfully inserted new image into the first track: ' + pngFile.name + newClip.type);
				
				
				$.writeln("Duration extended successfully.");

			} catch (e) {
				$.writeln('Error inserting new image: ' + e.message);
			}
		}
	},


	// Function to replace a video in a specific sequence
	replaceVideoInSequence: function(sequence, newVideo) {
		$.writeln('Starting replaceVideoInSequence function');
		
		var videoTracks = sequence.videoTracks;
		var audioTracks = sequence.audioTracks;

		
		// Process only the first video track (index 0)
		var firstTrack = videoTracks[0];
		var firstAudio = audioTracks[0];
		$.writeln('Processing first track: ' + firstTrack.name);

		// Check if there are no videos in the first track
		if (firstTrack.clips.numItems > 0) {
			$.writeln('Found ' + firstTrack.clips.numItems + ' videos in the first track. Removing all videos.');

			// Remove all clips from the first video and audio tracks
			for (var i = firstTrack.clips.numItems - 1; i >= 0; i--) {
				firstTrack.clips[i].remove(true, true);
			}

			for (var j = firstAudio.clips.numItems - 1; j >= 0; j--) {
				firstAudio.clips[j].remove(true, true);
			}

			$.writeln('All clips removed from ' + firstTrack.name);

			// Insert the new video into the first track
			try {
				var startTime = 0; // Start time in the sequence (e.g., 0 for beginning)
				firstTrack.insertClip(newVideo, startTime);
				firstAudio.insertClip(newVideo, startTime);
	
				$.writeln('Successfully inserted new video into the first track: ' + newVideo.name);
			} catch (e) {
				$.writeln('Error inserting new video: ' + e.message);
			}
			
		} else {
			// If there are no clips, insert the new video into the first track
			$.writeln('First track is empty. Adding new video.');

			try {
				var startTime = 0; // Start time in the sequence (e.g., 0 for beginning)
				firstTrack.insertClip(newVideo, startTime);
				firstAudio.insertClip(newVideo, startTime);
	
				$.writeln('Successfully inserted new video into the first track: ' + newVideo.name);
			} catch (e) {
				$.writeln('Error inserting new video: ' + e.message);
			}
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

	saveSequenceToReadyForExport: function(folderName) {
		$.writeln('Starting saveSequenceToReadyForExport with folder name: ' + folderName);
	
		// Save the project
		app.project.save();
		$.writeln('Project saved.');
	
		var sequenceName = "BrandPeak - Social Vacature - Variant 1";
		var sequence = this.findSequenceByName(sequenceName);
	
		if (!sequence) {
			$.writeln('Sequence named "' + sequenceName + '" not found');
			return;
		}
	
		$.writeln('Sequence found: ' + sequence.sequenceID);
	
		// Export the sequence directly from Premiere Pro
		try {

			// var sequence = sequence;
			// var outputPath = "C:\\Users\\OMEN 15 Pro\\Videos\\Exports\\" + folderName + ".mp4";
			// var outputPresetPath = "C:\\Users\\OMEN 15 Pro\\Documents\\Adobe\\Adobe Media Encoder\\23.0\\Presets\\yemi_preset.epr";
			// app.encoder.launchEncoder();
			// $.writeln('Media Encoder launched.');

			// app.encoder.encodeSequence(sequence, outputPath, outputPresetPath, 0, 1);

			// app.encoder.startBatch();
			
		} catch (e) {
			$.writeln('Error exporting sequence: ' + e.message);
		}
	
		$.writeln('Finished saveSequenceToReadyForExport');
	},


	// // Helper function to find bin index
	// findBinIndex: function(rootItem, targetBinName) {
	// 	globalBind = null; // Initialize globalBind to null
	// 	for (var i = 0; i < rootItem.children.numItems; i++) {
	// 		if (rootItem.children[i].name === targetBinName) {
	// 			globalBind = rootItem.children[i];
	// 			break;
	// 		}
	// 	}
	// 	if (!globalBind) {
	// 		$.writeln('Error: Bin "' + targetBinName + '" not found.');
	// 	}
	// },

	// // Helper function to render the active sequence
	// renderActiveSeq: function(outputPath, outputPresetPath) {
	// 	app.encoder.encodeSequence(app.project.activeSequence, outputPath, outputPresetPath, 2, 0);
	// },

	// Helper function to extend the duration of a TrackItem
	extendTrackItemDuration: function(trackItem, newDurationInSeconds) {
		$.writeln('Starting extendTrackItemDuration function');

		try {
			var currentInPoint = trackItem.inPoint;  // Get the current in point of the TrackItem
			var currentOutPoint = trackItem.outPoint; // Get the current out point of the TrackItem
			
			var currentDuration = currentOutPoint - currentInPoint; // Calculate the current duration
			var newDuration = newDurationInSeconds; // Use seconds directly
			
			if (newDuration > currentDuration) {
				var newOutPoint = currentInPoint + newDuration; // Calculate the new out point
				
				trackItem.outPoint = newOutPoint; // Set the new out point
				$.writeln('Extended duration of TrackItem to: ' + newDurationInSeconds + ' seconds');
			} else {
				$.writeln('New duration must be greater than the current duration.');
			}
		} catch (e) {
			$.writeln('Error extending TrackItem duration: ' + e.message);
		}
	},


	updateEventPanel : function (message) {
		app.setSDKEventMessage(message, 'info');
		/*app.setSDKEventMessage('Here is some information.', 'info');
		app.setSDKEventMessage('Here is a warning.', 'warning');
		app.setSDKEventMessage('Here is an error.', 'error');  // Very annoying; use sparingly.*/
	},
}