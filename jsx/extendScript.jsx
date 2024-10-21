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
    insertAudioFromBinToMarkedPoints: function(trackNumber, selectedBinId) {
		$.writeln('Starting insertAudioFromBinToMarkedPoints function');
		$.writeln('Bin ID: ' + selectedBinId)
		// Get the active sequence
		var sequence = app.project.activeSequence;
		if (!sequence) {
			var message = 'Error: No active sequence found.';
			$.writeln(message);
			this.updateEventPanel(message);
			return;
		}
	
		var audioTracks = sequence.audioTracks;
		var targetAudioTrack = audioTracks[trackNumber - 1]; // Subtract 1 because arrays are 0-indexed
	
		// Check if the target audio track exists
		if (!targetAudioTrack) {
			var message = 'Error: Target audio track does not exist.';
			$.writeln(message);
			this.updateEventPanel(message);
			return;
		}
	
		// Retrieve inPoint and outPoint from the active sequence
		var inPoint = sequence.getInPoint();
		var outPoint = sequence.getOutPoint();
	
		// Validate inPoint and outPoint
		if (inPoint === undefined || outPoint === undefined || inPoint >= outPoint) {
			var message = 'Error: Invalid in and out points.';
			$.writeln(message);
			this.updateEventPanel(message);
			return;
		}
	
		$.writeln('InPoint: ' + inPoint + ', OutPoint: ' + outPoint);
	
		// Retrieve the currently selected bin in the project panel
		var selectedBin = this.getBinById(selectedBinId); 
		if (!selectedBin) {
			var message = 'Error: No bin selected or invalid selection in the project panel.';
			$.writeln(message);
			this.updateEventPanel(message);
			return;
		}

		$.writeln('Bin found: ' + selectedBin.name);
	
		var binItems = selectedBin.children;
		if (!binItems || binItems.numItems === 0) {
			var message = 'Error: No items found in the selected bin.';
			$.writeln(message);
			this.updateEventPanel(message);
			return;
		}
	
		// Iterate through each item in the bin
		for (var i = 0; i < binItems.numItems; i++) {
			var item = binItems[i];
	
			// Check if the item is a valid audio file
			if (item.type === ProjectItemType.CLIP && item.mediaType === 'Audio') {
				// Generate a random time between inPoint and outPoint
				var randomTime = inPoint + (Math.random() * (outPoint - inPoint));
				$.writeln('Inserting audio clip at random time: ' + randomTime);
	
				// Insert the audio clip into the target audio track at the random time
				try {
					targetAudioTrack.insertClip(item, randomTime);
					$.writeln('Audio clip inserted successfully at: ' + randomTime);
				
				} catch (e) {
					var message = 'Error inserting audio clip: ' + e.name + ' - ' + e.message;
					$.writeln(message);
					this.updateEventPanel(message);  // Send error message to event panel
				}
			} else {
				$.writeln('Skipping non-audio item: ' + item.name);
			}		 
		}
	
		var completionMessage = 'Finished inserting audio clips.';
		$.writeln(completionMessage);
		this.updateEventPanel(completionMessage); // Notify user of successful completion
	},

	// Function to retrieve a bin by its ID
	getBinById: function(binId) {
		var rootItem = app.project.rootItem; // Get the root item (project)
		for (var i = 0; i < rootItem.children.length; i++) {
			var item = rootItem.children[i];
			if (item.type === ProjectItemType.BIN && item.id === binId) {
				return item; // Return the bin if the ID matches
			}
		}
		return null; // No bin found with the specified ID
	},
	
	
	updateEventPanel: function(message) {
		app.setSDKEventMessage(message, 'info');
	}
	
}
