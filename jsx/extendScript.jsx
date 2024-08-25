
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

				var mogrtFilePath = "C:\\Program Files\\Adobe\\Adobe Premiere Pro 2023\\Essential Graphics\\company_name_mogrt.mogrt";

				// Replace text graphics layer in the sequence named "Add Name Company" with the folder name
				this.updateTextInGraphic(importedFolder.folderName, mogrtFilePath);

				// Save sequence to "Ready for Export" bin
				this.saveSequenceToReadyForExport(importedFolder.folderName);

			}
		} else {
			$.writeln('No subfolders found in "Main folder".');
		}
	
		$.writeln('Finished processImportedFolders');
		$.writeln('_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _');
	},

	updateTextInGraphic: function(folderName, mogrtFilePath) {
		$.writeln('Updating text in graphic layer...');
	
		var sequenceName = "Add Name Company";
		var sequence = this.findSequenceByName(sequenceName);
	
		if (!sequence) {
			$.writeln('Sequence named "' + sequenceName + '" not found');
			return;
		}
	
		$.writeln('Sequence found: ' + sequence.sequenceID);
	
		var trackIndex = 1; // Assuming text is on the second track
		var track = sequence.videoTracks[trackIndex];
	
		if (!track) {
			$.writeln('Error: Video track ' + trackIndex + ' does not exist.');
			return;
		}
	
		$.writeln('Processing track: ' + track.name);
	
		var clipIndex = 0; // Assuming the text layer is the first clip in the track
		var clip = track.clips[clipIndex];
	
		if (clip) {
			$.writeln('Clip found, removing it...');
			clip.remove(true, true);
		} else {
			$.writeln('No clip found at index ' + clipIndex);
		}
	
		// Import the MoGRT file
		$.writeln('Importing MoGRT file from path: ' + mogrtFilePath);
		var mogrtFile = new File(mogrtFilePath);
	
		if (!mogrtFile.exists) {
			$.writeln('Error: MoGRT file not found at ' + mogrtFilePath);
			return;
		}
	
		var targetTime = sequence.getPlayerPosition();
		var vidTrackOffset = 0;
		var audTrackOffset = 0;
		var newTrackItem = sequence.importMGT(mogrtFile.fsName, targetTime.ticks, vidTrackOffset, audTrackOffset);
	
		if (!newTrackItem) {
			$.writeln('Error: Failed to import MoGRT file.');
			return;
		}
	
		$.writeln('MoGRT file imported successfully. Checking for components...');
	
		// Iterate through all components in the imported track item
		if (newTrackItem.components && newTrackItem.components.numItems > 0) {
			
			for (var i = 0; i < newTrackItem.components.numItems; i++) {
				var component = newTrackItem.components[i];
				
				// Iterate through all properties of the current component
				if (component.properties && component.properties.numItems > 0) {
					for (var j = 0; j < component.properties.numItems; j++) {
						var property = component.properties[j];

						// Log the value of the property if possible
						try {
							var value = property.getValue();
							
							// Check if this is the "NAME COMPANY" property
							if (property.displayName === "NAME COMPANY") {
								
								var updatedValue = JSON.parse(value); // Parse the current JSON value
								updatedValue.textEditValue = folderName; // Update the textEditValue with the new text
								property.setValue(JSON.stringify(updatedValue)); // Set the updated JSON value
	
							}
						} catch (error) {
							$.writeln('   Error retrieving or updating value for Property ' + j + ': ' + error.toString());
						}
					}
				} else {
					$.writeln('  No properties found in Component ' + i + '.');
				}
			}
		} else {
			$.writeln('No components found in the imported track item.');
		}
	},
	
	
	importMoGRT: function(mogrtFilePath) {
		var activeSeq = app.project.activeSequence;
		if (activeSeq) {
			var mogrtToImport = new File(mogrtFilePath);
			if (mogrtToImport.exists) {
				var targetTime = activeSeq.getPlayerPosition();
				var vidTrackOffset = 0;
				var audTrackOffset = 0;
				var newTrackItem = activeSeq.importMGT(mogrtToImport.fsName, targetTime.ticks, vidTrackOffset, audTrackOffset);
				if (newTrackItem) {
					var moComp = newTrackItem.getMGTComponent();
					if (moComp) {
						var params = moComp.properties;
						var srcTextParam = params.getParamForDisplayName("Source Text");
						if (srcTextParam) {
							srcTextParam.setValue("New value set by PProPanel!");
						}
					}
				}
			} else {
				$.writeln('Unable to import specified .mogrt file.');
			}
		} else {
			$.writeln('No active sequence.');
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
		this.replaceVideoInSequenceFirstTrack(sequence, mp4File);
		this.replaceVideoInSequenceSecondTrack(sequence, mp4File);
		this.replaceVideoInSequenceThirdTrack(sequence, mp4File);
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

	replaceFileInSequence: function(sequence, pngFile) {
		$.writeln('-----------------------------');
		$.writeln('Clearing sequence before placing new file');
	
		if (!pngFile || typeof pngFile !== 'object') {
			$.writeln('pngFile is undefined or not a valid object');
			return;
		}
	
		$.writeln('pngFile name: ' + pngFile.name);
	
		var videoTracks = sequence.videoTracks;
	
		if (videoTracks.numTracks < 2) {
			$.writeln('Sequence does not have a second video track');
			return;
		}
	
		var secondTrack = videoTracks[1]; // Use the second video track
		$.writeln('Processing second track: ' + secondTrack.name);
	
		if (secondTrack.clips.numItems > 0) {
			$.writeln('Found ' + secondTrack.clips.numItems + ' clips in the second track. Removing them.');
	
			for (var i = secondTrack.clips.numItems - 1; i >= 0; i--) {
				secondTrack.clips[i].remove(true, true);
			}
			$.writeln('All clips removed from ' + secondTrack.name);
		} else {
			$.writeln('Second track is empty.');
		}
	
		try {
			var startTime = 0; // Start at the beginning of the sequence
			var clipDuration = 4.96; // Example duration in seconds (adjust as needed)
			var numberOfDuplicates = 25;

			$.writeln('Attempting to insert clip and duplicate it...');

			// Insert the first clip
			var newClip = secondTrack.insertClip(pngFile, startTime);
			$.writeln('Type of newClip is: ' + typeof(newClip));

			if (newClip === true && typeof newClip === 'boolean') {
				$.writeln('New clip inserted into the second track: ' + secondTrack.name);

				// Duplicate and place the clip
				for (var j = 0; j < numberOfDuplicates; j++) {
					// Calculate new start time for the duplicated clip
					var newStartTime = startTime + j * clipDuration;
					
					// Insert the duplicate clip
					secondTrack.insertClip(pngFile, newStartTime);
				}

				$.writeln('Successfully duplicated and placed ' + numberOfDuplicates + ' clips.');

			} else {
				$.writeln('Failed to insert new image into the second track.');
			}
	
		} catch (e) {
			$.writeln('Error inserting new image: ' + e.message);
		}
	},
	
	replaceVideoInSequenceFirstTrack: function(sequence, mp4File) {
		$.writeln('Starting replaceVideoInSequenceFirstTrack function');
	
		var videoTracks = sequence.videoTracks;
		var audioTracks = sequence.audioTracks;
	
		// Process only the first video and audio tracks
		var firstTrack = videoTracks[0];
		var firstAudio = audioTracks[0];
		$.writeln('Processing first track: ' + firstTrack.name);
	
		// Check if there are any clips in the first track
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
		} else {
			$.writeln('First track is empty. Ready to add new video.');
		}
	
		$.writeln('Type of mp4 File: ' + typeof(mp4File));
	
		// Ensure the new video was imported correctly before proceeding
		if (!mp4File) {
			$.writeln('Error: mp4File is null or undefined.');
			return;
		}
	
		try {
			var startTime = 0; // Start at 0 seconds
			var frameDuration = 1/23.976; // One frame duration at 23.976 fps
			var numberOfDuplicates = 10;
	
			// Insert the first video clip at the start time of 0 seconds
			var firstClip = firstTrack.insertClip(mp4File, startTime);
			$.writeln('Inserted first video clip at ' + startTime + ' seconds.');
	
			// Insert a second video clip one frame after the first clip
			var secondClipTime = frameDuration;
			var secondClip = firstTrack.insertClip(mp4File, secondClipTime);
			$.writeln('Inserted second video clip at ' + secondClipTime + ' seconds.');
			
			// Remove the second video clip, leaving only one frame in the first track
			if (firstTrack.clips.numItems > 1) {
				firstTrack.clips[1].remove(true, true);
				$.writeln('Removed the second video clip, leaving only one frame.');
			}

			// Remove all video and audio clips after the first one
			$.writeln('Removing all video and audio clips after the first one...');
			while (firstTrack.clips.numItems > 1) {
				firstTrack.clips[1].remove(true, true);
			}
	
			while (firstAudio.clips.numItems > 1) {
				firstAudio.clips[1].remove(true, true);
			}
			$.writeln('All extra video and audio clips removed.');
	
			$.writeln('Attempting to duplicate the remaining frame...');
	
			// Log details of the remaining clip before duplication
			var remainingClip = firstTrack.clips[0];
			$.writeln('Remaining clip: ' + remainingClip.name + ', Start Time: ' + remainingClip.start.seconds);
	
			// Duplicate and place the single frame the specified number of times
			for (var k = 1; j < numberOfDuplicates; k++) {
				var newStartTime = startTime + k * frameDuration; // Corrected time calculation
				firstTrack.insertClip(remainingClip.projectItem, newStartTime);
			}
			$.writeln('Successfully duplicated and placed the frame ' + numberOfDuplicates + ' times.');
	
		} catch (e) {
			$.writeln('Error inserting new video: ' + e.message);
		}
	},
	
	

	replaceVideoInSequenceSecondTrack: function(sequence, mp4File) {
		$.writeln('Starting replaceVideoInSequenceSecondTrack function');
		
		var videoTracks = sequence.videoTracks;
		var audioTracks = sequence.audioTracks;
	
		// Process only the first video and audio tracks
		var firstTrack = videoTracks[1];
		var firstAudio = audioTracks[1];
		$.writeln('Processing first track: ' + firstTrack.name);
	
		// Check if there are any clips in the first track
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
		} else {
			$.writeln('First track is empty. Ready to add new video.');
		}

		$.writeln('Type of mp4 File: ' + typeof(mp4File));
	
		// Ensure the new video was imported correctly before proceeding
		if (!mp4File) {
			$.writeln('Error: mp4File is null or undefined.');
			return;
		}
	
		// Insert the new video into the first track at 51.79 seconds and trim to 5.835 seconds
		try {
			var startTime = new Time();
			startTime.seconds = 51.79;
			
			var newClipTime = new Time();
			newClipTime.seconds = 57.625;
	
			// Insert video clip into the first track
			var insertedVideoClip = firstTrack.insertClip(mp4File, startTime.seconds);
			$.writeln('Inserted video clip: ' + insertedVideoClip);
			$.writeln('This is the type of insertedVideoClip: ' + typeof(insertedVideoClip));

			// Insert video clip into the first track
			var newVideoClip = firstTrack.insertClip(mp4File, newClipTime.seconds);
			$.writeln('Inserted video clip: ' + newVideoClip);
	
			// Remove the second video clip after creating it 
			for (var k = firstTrack.clips.numItems - 1; k> 0; k--) {
				firstTrack.clips[k].remove(true, true);
			}
			$.writeln('Removed all clips after the first one.');

			// Remove all audio clips after the first one
			for (var l = firstAudio.clips.numItems - 1; l > 0; l--) {
				firstAudio.clips[l].remove(true, true);
			}
			$.writeln('Removed all audio clips after the first one.');

		} catch (e) {
			$.writeln('Error inserting new video: ' + e.message);
		}

	},

	replaceVideoInSequenceThirdTrack: function(sequence, mp4File) {
		$.writeln('Starting replaceVideoInSequenceThirdTrack function');
		
		var videoTracks = sequence.videoTracks;
		var audioTracks = sequence.audioTracks;
	
		// Process only the first video and audio tracks
		var firstTrack = videoTracks[2];
		var firstAudio = audioTracks[2];
		$.writeln('Processing first track: ' + firstTrack.name);
	
		// Check if there are any clips in the first track
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
		} else {
			$.writeln('First track is empty. Ready to add new video.');
		}

		$.writeln('Type of mp4 File: ' + typeof(mp4File));
	
		// Ensure the new video was imported correctly before proceeding
		if (!mp4File) {
			$.writeln('Error: mp4File is null or undefined.');
			return;
		}
	
		// Insert the new video into the first track at 51.79 seconds and trim to 5.835 seconds
		try {
			var startTime = new Time();
			startTime.seconds = 51.79;
			
			var newClipTime = new Time();
			newClipTime.seconds = 57.625;
	
			// Insert video clip into the first track
			var insertedVideoClip = firstTrack.insertClip(mp4File, startTime.seconds);
			$.writeln('Inserted video clip: ' + insertedVideoClip);
			$.writeln('This is the type of insertedVideoClip: ' + typeof(insertedVideoClip));

			// Insert video clip into the first track
			var newVideoClip = firstTrack.insertClip(mp4File, newClipTime.seconds);
			$.writeln('Inserted video clip: ' + newVideoClip);
	
			// Remove the second video clip after creating it 
			for (var k = firstTrack.clips.numItems - 1; k> 0; k--) {
				firstTrack.clips[k].remove(true, true);
			}
			$.writeln('Removed all clips after the first one.');

			// Remove all audio clips after the first one
			for (var l = firstAudio.clips.numItems - 1; l > 0; l--) {
				firstAudio.clips[l].remove(true, true);
			}
			$.writeln('Removed all audio clips after the first one.');

		} catch (e) {
			$.writeln('Error inserting new video: ' + e.message);
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
	
		// Export the sequence from Premiere PRO using Media Encoder.
		try {

			var sequence = sequence;
			var outputPath = "C:\\Users\\OMEN 15 Pro\\Videos\\Exports\\" + folderName + ".mp4";
			var outputPresetPath = "C:\\Users\\OMEN 15 Pro\\Documents\\Adobe\\Adobe Media Encoder\\23.0\\Presets\\yemi2_preset.epr";
			app.encoder.launchEncoder();
			$.writeln('Media Encoder launched.');

			app.encoder.encodeSequence(sequence, outputPath, outputPresetPath, 0, 1);

			app.encoder.startBatch();
			
		} catch (e) {
			$.writeln('Error exporting sequence: ' + e.message);
		}
	
		$.writeln('Finished saveSequenceToReadyForExport');
	},


	// Helper function to find bin index
	findBinIndex: function(rootItem, targetBinName) {
		globalBind = null; // Initialize globalBind to null
		for (var i = 0; i < rootItem.children.numItems; i++) {
			if (rootItem.children[i].name === targetBinName) {
				globalBind = rootItem.children[i];
				break;
			}
		}
		if (!globalBind) {
			$.writeln('Error: Bin "' + targetBinName + '" not found.');
		}
	},

	// Helper function to render the active sequence
	renderActiveSeq: function(outputPath, outputPresetPath) {
		app.encoder.encodeSequence(app.project.activeSequence, outputPath, outputPresetPath, 2, 0);
	},

	updateEventPanel : function (message) {
		app.setSDKEventMessage(message, 'info');
		/*app.setSDKEventMessage('Here is some information.', 'info');
		app.setSDKEventMessage('Here is a warning.', 'warning');
		app.setSDKEventMessage('Here is an error.', 'error');  // Very annoying; use sparingly.*/
	},

}	