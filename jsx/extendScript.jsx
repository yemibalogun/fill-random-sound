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

    // Updated function to insert audio clips, automatically selecting inPoint and outPoint from the timeline
    insertAudioFromBinToMarkedPoints: function(trackNumber, selectedBinPath) {
		$.writeln('Starting audio insertion process for track ' + ' and bin path: ' + selectedBinPath);
		
		try {
			// Input validation 
			if (!trackNumber ) {
				var trackMessage = 'Error: trackNumber is required.';
				$.writeln(trackMessage);
				this.updateEventPanel(trackMessage);
				return {
					success: false,
					message: message
				};
			}
			
			if (!selectedBinPath ) {
				var selectedBinMessage = 'Error: please select a bin.';
				$.writeln(selectedBinMessage);
				this.updateEventPanel(selectedBinMessage);
				return {
					success: false,
					message: message
				};
			}
		
			// Get the active sequence
			var sequence = app.project.activeSequence;
			if (!sequence) {
				var message = 'Error: No active sequence found.';
				$.writeln(message);
				this.updateEventPanel(message);
				return {
					success: false,
					message: message
				};
			}
		
			var audioTracks = sequence.audioTracks;
			var targetAudioTrack = audioTracks[trackNumber - 1]; // Subtract 1 because arrays are 0-indexed
		
			// Check if the target audio track exists
			if (!targetAudioTrack) {
				var message = 'Error: Target audio track does not exist.';
				$.writeln(message);
				this.updateEventPanel(message);
				return {
					success: false,
					message: message
				};
			}
		
			// Retrieve inPoint and outPoint from the active sequence
			var inPoint = sequence.getInPoint();
			inPoint = Math.round(inPoint);
			var outPoint = sequence.getOutPoint();
			outPoint = Math.round(outPoint);
		
			// Validate inPoint and outPoint
			if (inPoint === undefined || outPoint === undefined || inPoint >= outPoint) {
				var message = 'Error: Invalid in and out points.';
				$.writeln(message);
				this.updateEventPanel(message);
				return {
					success: false,
					message: message
				};
			}
		
			$.writeln('InPoint: ' + inPoint + ', OutPoint: ' + outPoint);
			
			// Find and validate the selected bin
			$.writeln('Looking for bin with path: ' + selectedBinPath);

			var selectedBin = this.findBinByPath(app.project.rootItem, selectedBinPath);
			
			if (!selectedBin) {
				var message = 'Error: Could not find the selected bin: ' + selectedBinPath;
				$.writeln(message);
				this.updateEventPanel(message);
				return {
					success: false,
					message: message
				};
			}

			$.writeln('Iterating over audio in: ' + selectedBin.name);
		
			var audioClips = this.getAudioClipsFromBin(selectedBin);
			if (audioClips.length === 0) {
				var message = 'Error: No audio clips found in the selected bin.';
				$.writeln(message);
				this.updateEventPanel(message);
				return {
					success: false,
					message: message
				};
			}

			// Insert clips with collision detection
            var insertedClipsResult = this.insertClipsRandomlyWithSpacing(
                audioClips,
                targetAudioTrack,
                inPoint,
                outPoint
            );

			// Check if any clips were successfully inserted
			if (insertedClipsResult > 0) {
				var successMessage = "Successfully inserted " + insertedClipsResult + " audio clips.";
				this.updateEventPanel(successMessage);
				return;
			} else {
				var failMessage = "No audio clips could be inserted due to spacing issues.";
				this.updateEventPanel(failMessage);
				return {
					success: false,
					message: failMessage
				};
			}	
			
		} catch (error) {
            var errorMessage = 'Error: ' + error.message;
            $.writeln(errorMessage);
            this.updateEventPanel(errorMessage);
            return {
				success: false,
				message: errorMessage
			};
        }
	},

	getAudioClipsFromBin: function(bin) {
		var audioClips = [];
		var audioRegex = /\.(mp3|wav)$/i; // Regex to match .mp3 or .wav extensions (case-insensitive)
		
		if (bin.children) {
			for (var i = 0; i < bin.children.numItems; i++) {
				var item = bin.children[i];
				var itemName = item.name;
	
				$.writeln('Item found: ' + itemName + ', Type: ' + item.type);
	
				// Check if the item is a clip and if its name matches the .mp3 or .wav regex
				if (item.type === ProjectItemType.CLIP && audioRegex.test(itemName)) {
					audioClips.push(item);
					$.writeln('Audio clip added: ' + itemName);
				} else {
					$.writeln('Skipping non-audio or unsupported file: ' + itemName);
				}
			}
		} else {
			$.writeln('No children found in bin: ' + bin.name);
		}
	
		return audioClips;
	},
	

	findBinByPath: function(rootItem, binPath) {
		$.writeln('Finding bin with path: ' + binPath);
    
		try {
			if (!rootItem || !binPath) {
				$.writeln('Invalid rootItem or binPath');
				return null;
			}

			// Handle case where binPath is a string
			var pathArray = typeof binPath === 'string' ? binPath.split('/') : binPath;
			
			if (!pathArray.length) {
				$.writeln('Empty path array');
				return null;
			}

			var currentItem = rootItem;
			for (var i = 0; i < pathArray.length; i++) {
				var binName = pathArray[i];
				$.writeln('Looking for bin: ' + binName);
				
				var found = false;
				if (currentItem.children && currentItem.children.numItems > 0) {
					for (var j = 0; j < currentItem.children.numItems; j++) {
						var child = currentItem.children[j];
						if (child.name === binName) {
							$.writeln('Found matching bin: ' + child.name);
							currentItem = child;
							found = true;
							break;
						}
					}
				}
				
				if (!found) {
					$.writeln('Could not find bin: ' + binName);
					return null;
				}
			}
			
			if (currentItem.type === ProjectItemType.BIN) {
				$.writeln('Successfully found bin: ' + currentItem.name);
				return currentItem;
			}
			
			$.writeln('Found item is not a bin');
			return null;
		} catch (error) {
			$.writeln('Error in findBinByPath: ' + error.message);
			return null;
		}
	},

	// Function to get all bins in the project
	getAllBins: function () {
		$.writeln("Starting getAllBins...");
		
		var project = app.project; // Get the current project
		var binsArray = []; // Array to hold the names of all bins

		// Recursive function to search through items
		function searchBins(item) {
			if (item && item.type === ProjectItemType.BIN) {
				binsArray.push(item.name); // Add bin name to the array
			}

			// Recursively search through children of the item if they exist
			if (item && item.children) {
				for (var i = 0; i < item.children.length; i++) {
					searchBins(item.children[i]);
				}
			}
		}

		// Start the search from the root item
		if (project.rootItem) {
			searchBins(project.rootItem);
		} else {
			throw new Error("Project root item is undefined.");
		}

		// Return bins as a JSON string
		return JSON.stringify(binsArray);
	},

	insertClipsRandomlyWithSpacing: function (clips, track, inPoint, outPoint) {
		var insertedCount = 0;
		var spacing = 0.5; // Fixed 0.5 second spacing between clips
		var currentPosition = inPoint;
		var duration = outPoint - inPoint;
		
		if (clips.length === 0 || duration <= 0) {
			$.writeln('Error: No clips to insert or invalid duration. Duration: ' + duration);
			return insertedCount;
		}
		
		// Function to shuffle an array (Fisher-Yates shuffle)
		function shuffleArray(array) {
			var shuffled = array.slice(); // Create a copy to avoid modifying original
			for (var i = shuffled.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var temp = shuffled[i];
				shuffled[i] = shuffled[j];
				shuffled[j] = temp;
			}
			return shuffled;
		}
		
		// Function to get clip duration
		function getClipDuration(clip) {
			try {
				// Try to get the media duration using Time objects
				var tempPosition = currentPosition;
				track.insertClip(clip, tempPosition);
				var insertedClip = track.clips[track.clips.length - 1];
				
				// Get numerical values from Time objects
				var clipDuration = insertedClip.duration.seconds;
				$.writeln('Raw duration in seconds: ' + clipDuration);
				
				// Remove the temporary clip
				insertedClip.remove(false, false);
				
				$.writeln('Calculated duration: ' + clipDuration + ' for clip: ' + clip.name);
				return clipDuration;
				
			} catch (e) {
				$.writeln('Error getting clip duration: ' + e.message);
				return 0;
			}
		}
		
		// Shuffle the clips array
		var shuffledClips = shuffleArray(clips);
		
		$.writeln('Starting insertion at inPoint: ' + inPoint + ' with total duration: ' + duration);
		
		// Insert clips until we run out of space or clips
		for (var i = 0; i < shuffledClips.length; i++) {
			try {
				var clip = shuffledClips[i];
				var clipDuration = getClipDuration(clip);
				
				// If we couldn't get a valid duration, skip this clip
				if (!clipDuration || clipDuration <= 0) {
					$.writeln('Skipping clip due to invalid duration: ' + clip.name);
					continue;
				}
				
				// Check if this clip plus spacing would fit before outPoint
				if ((currentPosition + clipDuration + spacing) > outPoint) {
					$.writeln('Stopping: Next clip would exceed outPoint. Current position: ' + 
							 currentPosition + ', Clip duration: ' + clipDuration);
					break;
				}
				
				// Debug log for insertion details
				$.writeln('Inserting clip ' + (i + 1) + ' at time: ' + currentPosition + 
						 ' with duration: ' + clipDuration);
				
				// Insert the clip at the current position
				track.insertClip(clip, currentPosition);
				track.clips[track.clips.length - 1].start = currentPosition;
				insertedCount++;
				
				// Update position for next clip, adding the spacing
				currentPosition += clipDuration + spacing;
				
				$.writeln('Clip inserted successfully. Next position will be: ' + currentPosition);
				
			} catch (e) {
				$.writeln('Error inserting clip ' + i + ': ' + e.message);
			}
		}
		
		$.writeln('Successfully inserted ' + insertedCount + ' clips starting from inPoint: ' + inPoint);
		return insertedCount;
	},
	
	updateEventPanel: function(message) {
		if (app.setSDKEventMessage) {
			app.setSDKEventMessage(message, 'info');
		}
		$.writeln(message); // Fallback to writing to ExtendScript console
	}
}
